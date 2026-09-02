const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const router = express.Router();
const { pool } = require('../db');

const DEPOT_CORRAL = process.env.DEPOT_CORRAL || 'A';
const MIN_CART_THRESHOLD = Number(process.env.MIN_CART_THRESHOLD) || 5;
const OPTIMIZER_TIMEOUT_MS = 15000;

// Windows ships `python`; macOS/Linux generally only expose `python3`.
// Hardcoding either one makes the optimizer fail silently on the other platform.
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

function callPythonOptimizer(payload) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'optimizer', 'optimizer.py');
    const python = spawn(PYTHON_BIN, [scriptPath]);

    let stdout = '';
    let stderr = '';

    // A hung solver would otherwise hold the request open forever.
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
      if (code !== 0) {
        return reject(new Error(`Optimizer exited ${code}: ${stderr.trim()}`));
      }
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

// Greedy fallback: visit the fullest corrals first. Ignores travel distance,
// so it is strictly worse than the TSP solve and says so in its response.
function greedyFallback(corrals, reason) {
  // The depot is excluded here because it is added back as the first and last
  // stop below; leaving it in would list it twice.
  const route = Object.entries(corrals)
    .filter(([id, count]) => id !== DEPOT_CORRAL && count >= MIN_CART_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  return {
    success: true,
    optimizedRoute: route.length ? [DEPOT_CORRAL, ...route, DEPOT_CORRAL] : [],
    totalDistance: null,
    method: 'greedy-fallback',
    corralsCovered: route.length,
    degraded: true,
    note: `Route optimizer unavailable, sorted by cart count instead. (${reason})`,
  };
}

router.post('/', async (req, res) => {
  const { corrals } = req.body;

  if (!corrals || typeof corrals !== 'object' || Array.isArray(corrals)) {
    return res.status(400).json({ error: 'Missing or invalid corral data' });
  }

  const needsCollection = Object.entries(corrals).filter(
    ([, count]) => Number(count) >= MIN_CART_THRESHOLD
  );

  if (needsCollection.length === 0) {
    return res.json({
      success: true,
      optimizedRoute: [],
      totalDistance: 0,
      corralsCovered: 0,
      method: 'none-required',
      message: `No corrals have ${MIN_CART_THRESHOLD} or more carts`,
    });
  }

  try {
    // Coordinates come from the corrals table, the same source the migrations seed.
    // They were previously duplicated in this file, which meant moving a corral
    // required editing two places that could silently disagree.
    const { rows } = await pool.query(
      `SELECT id, x_coord, y_coord FROM corrals WHERE id = ANY($1::varchar[])`,
      [[...needsCollection.map(([id]) => id), DEPOT_CORRAL]]
    );

    const coords = Object.fromEntries(rows.map((r) => [r.id, { x: r.x_coord, y: r.y_coord }]));

    if (!coords[DEPOT_CORRAL]) {
      return res.status(500).json({ error: `Depot corral ${DEPOT_CORRAL} missing from database` });
    }

    const stops = {};
    for (const [id, count] of needsCollection) {
      if (coords[id]) stops[id] = { ...coords[id], count: Number(count) };
      else console.warn(`No coordinates for corral ${id}, skipping`);
    }

    // The route has to start and end somewhere, so the depot is always a node
    // even when it is below the collection threshold.
    stops[DEPOT_CORRAL] ??= { ...coords[DEPOT_CORRAL], count: Number(corrals[DEPOT_CORRAL]) || 0 };

    const result = await callPythonOptimizer({ corrals: stops, depot: DEPOT_CORRAL });

    if (!result.success) {
      return res.json(greedyFallback(corrals, result.error || 'solver found no route'));
    }
    res.json(result);
  } catch (err) {
    console.error('Route optimization failed:', err.message);
    res.json(greedyFallback(corrals, err.message));
  }
});

router.get('/preview', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id FROM corrals ORDER BY id');
    res.json({
      message: 'POST corral data to /api/optimize-route',
      minThreshold: MIN_CART_THRESHOLD,
      depot: DEPOT_CORRAL,
      pythonBin: PYTHON_BIN,
      availableCorrals: rows.map((r) => r.id),
    });
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
