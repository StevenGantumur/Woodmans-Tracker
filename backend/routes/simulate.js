const express = require('express');
const router = express.Router();

const { pool } = require('../db');

// Demo affordance: lets someone open the app and see the routing react without
// creating an account or hand-entering 24 counts. It is a write, so it sits
// behind a flag that can be turned off for any real deployment.
const ENABLED = process.env.ALLOW_SIMULATE !== 'false';

// The Cart Tunnel holds an order of magnitude more than the small storefront
// bays, so it is identified by capacity rather than by hardcoding its id.
const RESERVOIR_MIN_CAPACITY = 200;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Corrals nearer the doors fill faster, and the hour of day scales the whole lot.
// Weights are relative and get normalised against a target below, so the lot can
// never hold more carts than the store owns.
function returnWeight(corral, hour) {
  const timeFactor = hour >= 11 && hour <= 19 ? 1 : hour >= 8 && hour <= 22 ? 0.6 : 0.25;
  const proximity = 1.25 - (corral.y / 100) * 0.4;
  return Math.max(0.05, timeFactor * proximity * (0.5 + Math.random()));
}

// Share of the fleet loose in the return corrals. Most carts are inside, with a
// shopper, or staged in the tunnel, so the open lot holds a minority of them.
function lotShare(hour) {
  if (hour >= 11 && hour <= 19) return 0.16 + Math.random() * 0.11;
  if (hour >= 8 && hour <= 22) return 0.1 + Math.random() * 0.08;
  return 0.04 + Math.random() * 0.05;
}

router.post('/', async (req, res) => {
  if (!ENABLED) {
    return res.status(403).json({ error: 'Simulation is disabled on this deployment' });
  }

  const client = await pool.connect();
  try {
    const { rows: corrals } = await client.query(
      `SELECT id, type, capacity, y_coord AS y FROM corrals WHERE status = 'active'`
    );

    const now = new Date();
    const hour = now.getHours();
    const dow = (now.getDay() + 6) % 7;

    await client.query('BEGIN');

    const { rows: state } = await client.query('SELECT fleet_size FROM store_state WHERE id = 1');
    const fleet = state[0]?.fleet_size ?? 600;

    const returns = corrals.filter((c) => c.type === 'return');
    const supplies = corrals.filter((c) => c.type === 'supply');
    const reservoir = supplies.find((c) => (c.capacity ?? 0) >= RESERVOIR_MIN_CAPACITY);
    const bays = supplies.filter((c) => c !== reservoir);

    // Carts loose in the lot, spread across the return corrals by weight.
    const lotTotal = Math.round(fleet * lotShare(hour));
    const weights = returns.map((c) => returnWeight(c, hour));
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    const returnCounts = returns.map((c, i) => ({
      id: c.id,
      count: Math.max(0, Math.round((weights[i] / weightSum) * lotTotal)),
    }));

    const bayCounts = bays.map((c) => ({
      id: c.id,
      count: randInt(Math.floor((c.capacity ?? 40) * 0.2), c.capacity ?? 40),
    }));

    // Carts with shoppers or parked inside. Reserved before the tunnel is filled
    // so the tunnel cannot swallow the whole fleet.
    const inBuilding = Math.round(fleet * (0.2 + Math.random() * 0.2));

    const spokenFor =
      returnCounts.reduce((s, u) => s + u.count, 0) +
      bayCounts.reduce((s, u) => s + u.count, 0) +
      inBuilding;

    // The tunnel is the reservoir: it takes whatever the rest of the store is not
    // holding, which keeps every count consistent with a fixed fleet size.
    const reservoirCounts = reservoir
      ? [{ id: reservoir.id, count: clamp(fleet - spokenFor, 0, reservoir.capacity ?? fleet) }]
      : [];

    const updates = [...returnCounts, ...bayCounts, ...reservoirCounts];

    for (const u of updates) {
      await client.query(
        `UPDATE corrals SET cart_count = $1, last_updated = NOW() WHERE id = $2`,
        [u.count, u.id]
      );
      await client.query(
        `INSERT INTO corral_snapshots (corral_id, cart_count, timestamp, hour, day_of_week)
         VALUES ($1, $2, $3, $4, $5)`,
        [u.id, u.count, now, hour, dow]
      );
    }

    const placed = updates.reduce((sum, u) => sum + u.count, 0);
    await client.query(
      `UPDATE store_state SET carts_in_building = $1, updated_at = NOW() WHERE id = 1`,
      [Math.max(0, fleet - placed)]
    );

    await client.query('COMMIT');

    res.json({
      simulated: true,
      corralsUpdated: updates.length,
      hour,
      cartsInLot: placed,
      cartsInBuilding: Math.max(0, fleet - placed),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/simulate failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  } finally {
    client.release();
  }
});

module.exports = router;
