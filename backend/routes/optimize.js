const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const router = express.Router();
const { pool } = require('../db');
const layout = require('../../shared/layout.json');

// Per-corral restock thresholds. A big reservoir and a small door-side bay do
// not become urgent at the same fraction of capacity, so the layout file names
// the threshold explicitly and the global fraction is only a fallback.
const LOW_WATER = Object.fromEntries(
  layout.corrals.filter((c) => c.lowWater != null).map((c) => [c.id, c.lowWater])
);

// A worker can push roughly this many carts in one line.
// A powered cart mover, not a person pushing a line by hand.
const WORKER_CAPACITY = Number(process.env.WORKER_CAPACITY) || 60;
// Return corrals below this aren't worth the walk.
const MIN_CART_THRESHOLD = Number(process.env.MIN_CART_THRESHOLD) || 5;
// A supply corral under this fraction of capacity is treated as urgent: an empty
// corral at the entrance blocks shoppers immediately, so it outranks a full lot.
const SUPPLY_LOW_WATER = Number(process.env.SUPPLY_LOW_WATER) || 0.4;
const OPTIMIZER_TIMEOUT_MS = 15000;

const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function callPythonOptimizer(payload) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'optimizer', 'optimizer.py');
    const python = spawn(PYTHON_BIN, [scriptPath]);

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      python.kill();
      reject(new Error(`Optimizer timed out after ${OPTIMIZER_TIMEOUT_MS}ms`));
    }, OPTIMIZER_TIMEOUT_MS);

    python.stdout.on('data', (d) => { stdout += d; });
    python.stderr.on('data', (d) => { stderr += d; });

    python.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start "${PYTHON_BIN}": ${err.message}`));
    });

    python.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`Optimizer exited ${code}: ${stderr.trim()}`));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Invalid JSON from optimizer: ${stdout.slice(0, 200)}`));
      }
    });

    python.stdin.write(JSON.stringify(payload));
    python.stdin.end();
  });
}

async function loadLot() {
  const { rows } = await pool.query(
    `SELECT id, x_coord AS x, y_coord AS y, cart_count, type, capacity
       FROM corrals WHERE status = 'active'`
  );
  return {
    returns: rows.filter((r) => r.type === 'return'),
    supplies: rows.filter((r) => r.type === 'supply'),
  };
}

// Decides what the worker should do next.
//
// Restocking wins whenever a storefront corral drops below the low-water mark,
// because a shopper who cannot find a cart is a problem right now, while a full
// return corral only costs a longer trip later.
function chooseJob(returns, supplies, requestedDepot) {
  if (requestedDepot) {
    const target = supplies.find((s) => s.id === requestedDepot);
    if (!target) return { job: 'invalid', reason: `${requestedDepot} is not a drop-off bay` };

    const room = (target.capacity ?? Infinity) - target.cart_count;
    if (room <= 0) {
      return { job: 'full', target, reason: `${target.id} is already full at ${target.cart_count}` };
    }
    return {
      job: 'delivery',
      target,
      reason: `Delivering to ${target.id}, ${room} carts of room`,
    };
  }

  const threshold = (s) => LOW_WATER[s.id] ?? (s.capacity || 0) * SUPPLY_LOW_WATER;

  const needy = supplies
    .filter((s) => s.cart_count < threshold(s))
    .sort((a, b) => a.cart_count / threshold(a) - b.cart_count / threshold(b));

  if (needy.length > 0) {
    const target = needy[0];
    return {
      job: 'restock',
      target,
      reason: `${target.id} is at ${target.cart_count}/${target.capacity} carts`,
    };
  }

  const collectable = returns.filter((r) => r.cart_count >= MIN_CART_THRESHOLD);
  if (collectable.length > 0) {
    const total = collectable.reduce((sum, r) => sum + r.cart_count, 0);
    return {
      job: 'collection',
      reason: `${total} carts waiting across ${collectable.length} corrals`,
    };
  }

  return { job: 'idle', reason: 'Storefront corrals are stocked and no lot corral needs clearing' };
}

// Nearest return corrals with carts, taken until the worker is loaded.
// Sorting by distance rather than by size is the point of a restock run: the
// fastest way to refill the entrance beats the most thorough sweep.
function pickRestockStops(returns, target) {
  const stops = [];
  let carts = 0;

  const byDistance = returns
    .filter((r) => r.cart_count >= MIN_CART_THRESHOLD)
    .map((r) => ({ ...r, dist: distance(r, target) }))
    .sort((a, b) => a.dist - b.dist);

  const needed = Math.min(WORKER_CAPACITY, (target.capacity || WORKER_CAPACITY) - target.cart_count);

  for (const corral of byDistance) {
    if (carts >= needed) break;
    stops.push(corral);
    carts += corral.cart_count;
  }
  return { stops, carts };
}

function greedyFallback(stops, depot, jobInfo, reason) {
  const route = stops
    .filter((s) => s.id !== depot.id)
    .sort((a, b) => b.cart_count - a.cart_count)
    .map((s) => s.id);

  return {
    success: true,
    job: jobInfo.job,
    reason: jobInfo.reason,
    optimizedRoute: route.length ? [depot.id, ...route, depot.id] : [],
    totalDistance: null,
    corralsCovered: route.length,
    method: 'greedy-fallback',
    degraded: true,
    note: `Route optimizer unavailable, ordered by cart count instead. (${reason})`,
  };
}

router.get('/', async (req, res) => {
  try {
    const requestedDepot = req.query.depot ? String(req.query.depot).trim().toUpperCase() : null;
    const { returns, supplies } = await loadLot();
    const jobInfo = chooseJob(returns, supplies, requestedDepot);

    if (jobInfo.job === 'invalid') {
      return res.status(400).json({
        error: jobInfo.reason,
        validDepots: supplies.map((s) => s.id),
      });
    }

    if (jobInfo.job === 'full') {
      return res.json({
        success: true,
        job: 'full',
        reason: jobInfo.reason,
        optimizedRoute: [],
        totalDistance: 0,
        corralsCovered: 0,
        method: 'none-required',
      });
    }

    if (jobInfo.job === 'idle') {
      return res.json({
        success: true,
        job: 'idle',
        reason: jobInfo.reason,
        optimizedRoute: [],
        totalDistance: 0,
        corralsCovered: 0,
        method: 'none-required',
      });
    }

    let stops;
    let depot;
    let cartsMoved = null;

    if (jobInfo.job === 'restock' || jobInfo.job === 'delivery') {
      depot = jobInfo.target;
      const picked = pickRestockStops(returns, depot);
      stops = picked.stops;
      cartsMoved = picked.carts;

      if (stops.length === 0) {
        return res.json({
          success: true,
          job: jobInfo.job,
          reason: `${jobInfo.reason}, but no lot corral has carts to bring over`,
          optimizedRoute: [],
          totalDistance: 0,
          corralsCovered: 0,
          method: 'none-available',
        });
      }
    } else {
      stops = returns.filter((r) => r.cart_count >= MIN_CART_THRESHOLD);
      cartsMoved = stops.reduce((sum, s) => sum + s.cart_count, 0);
      // Sweeps end at whichever storefront corral is closest to the work.
      const centroid = {
        x: stops.reduce((s, r) => s + r.x, 0) / stops.length,
        y: stops.reduce((s, r) => s + r.y, 0) / stops.length,
      };
      depot = supplies.sort((a, b) => distance(a, centroid) - distance(b, centroid))[0];
    }

    const nodes = { [depot.id]: { x: depot.x, y: depot.y, count: depot.cart_count } };
    for (const s of stops) nodes[s.id] = { x: s.x, y: s.y, count: s.cart_count };

    try {
      const result = await callPythonOptimizer({ corrals: nodes, depot: depot.id });
      if (!result.success) {
        return res.json(greedyFallback(stops, depot, jobInfo, result.error || 'no route found'));
      }
      res.json({
        ...result,
        job: jobInfo.job,
        reason: jobInfo.reason,
        depot: depot.id,
        cartsMoved,
        units: 'feet',
      });
    } catch (err) {
      console.error('Optimizer failed:', err.message);
      res.json(greedyFallback(stops, depot, jobInfo, err.message));
    }
  } catch (err) {
    console.error('Route planning failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/preview', async (req, res) => {
  try {
    const { returns, supplies } = await loadLot();
    res.json({
      workerCapacity: WORKER_CAPACITY,
      minCartThreshold: MIN_CART_THRESHOLD,
      supplyLowWater: SUPPLY_LOW_WATER,
      pythonBin: PYTHON_BIN,
      returnCorrals: returns.length,
      supplyCorrals: supplies.map((s) => ({ id: s.id, count: s.cart_count, capacity: s.capacity })),
      nextJob: chooseJob(returns, supplies).job,
    });
  } catch {
    res.status(503).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
