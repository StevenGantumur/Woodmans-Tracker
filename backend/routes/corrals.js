const express = require('express');
const router = express.Router();

const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const toMondayFirst = (jsDay) => (jsDay + 6) % 7;

async function readLot(client) {
  const { rows } = await client.query(
    `SELECT id, cart_count, type, capacity, x_coord AS x, y_coord AS y, last_updated
       FROM corrals WHERE status = 'active' ORDER BY id`
  );
  const state = await client.query('SELECT carts_in_building, fleet_size FROM store_state WHERE id = 1');

  const counts = Object.fromEntries(rows.map((r) => [r.id, r.cart_count]));
  const inBuilding = state.rows[0]?.carts_in_building ?? 0;
  const inLot = rows.reduce((sum, r) => sum + r.cart_count, 0);

  return {
    corrals: rows,
    counts,
    building: {
      cartsInBuilding: inBuilding,
      fleetSize: state.rows[0]?.fleet_size ?? null,
      cartsInLot: inLot,
      unaccounted: (state.rows[0]?.fleet_size ?? 0) - inBuilding - inLot,
    },
  };
}

router.get('/', async (req, res) => {
  try {
    res.json(await readLot(pool));
  } catch (err) {
    console.error('GET /api/corrals failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id/history', async (req, res) => {
  const id = String(req.params.id).trim().toUpperCase();
  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 500) : 100;

  try {
    const { rows } = await pool.query(
      `SELECT cart_count, timestamp, hour, day_of_week
         FROM corral_snapshots WHERE corral_id = $1
        ORDER BY timestamp DESC LIMIT $2`,
      [id, limit]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Unknown corral or no history' });
    res.json({ corral_id: id, count: rows.length, snapshots: rows });
  } catch (err) {
    console.error('History lookup failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { corral_id, count } = req.body || {};

  if (corral_id == null || count == null) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const id = String(corral_id).trim().toUpperCase();
  const parsedCount = Number(count);

  if (!Number.isInteger(parsedCount) || parsedCount < 0) {
    return res.status(400).json({ error: 'Count must be a non-negative integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE corrals SET cart_count = $1, last_updated = NOW()
        WHERE id = $2 AND status = 'active' RETURNING capacity, type`,
      [parsedCount, id]
    );

    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `No active corral ${id}` });
    }

    const { capacity, type } = updated.rows[0];
    if (type === 'supply' && capacity && parsedCount > capacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Corral ${id} holds at most ${capacity} carts` });
    }

    const now = new Date();
    await client.query(
      `INSERT INTO corral_snapshots (corral_id, cart_count, timestamp, hour, day_of_week)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, parsedCount, now, now.getHours(), toMondayFirst(now.getDay())]
    );

    await client.query('COMMIT');
    res.json({ message: `Corral ${id} updated`, normalizedId: id, ...(await readLot(client)) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/corrals failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  } finally {
    client.release();
  }
});

module.exports = router;
