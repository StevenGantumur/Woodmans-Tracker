const express = require('express');
const router = express.Router();

const { pool } = require('../db');
const ALLOWED_CORRALS = require('../../shared/corrals.json');

// getDay() is Sunday=0; the snapshots table and ml/trainModel.py use Monday=0.
const toMondayFirst = (jsDay) => (jsDay + 6) % 7;

async function readAllCounts(client) {
  const { rows } = await client.query(
    `SELECT id, cart_count FROM corrals WHERE status = 'active' ORDER BY id`
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.cart_count]));
}

router.get('/', async (req, res) => {
  try {
    res.json(await readAllCounts(pool));
  } catch (err) {
    console.error('GET /api/corrals failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.get('/:id/history', async (req, res) => {
  const id = String(req.params.id).trim().toUpperCase();
  if (!ALLOWED_CORRALS.includes(id)) {
    return res.status(404).json({ error: 'Unknown corral ID' });
  }

  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 500) : 100;

  try {
    const { rows } = await pool.query(
      `SELECT cart_count, timestamp, hour, day_of_week
         FROM corral_snapshots
        WHERE corral_id = $1
        ORDER BY timestamp DESC
        LIMIT $2`,
      [id, limit]
    );
    res.json({ corral_id: id, count: rows.length, snapshots: rows });
  } catch (err) {
    console.error(`GET /api/corrals/${id}/history failed:`, err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', async (req, res) => {
  const { corral_id, count } = req.body;

  if (corral_id == null || count == null) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const id = String(corral_id).trim().toUpperCase();
  const parsedCount = Number(count);

  if (!ALLOWED_CORRALS.includes(id)) {
    return res.status(400).json({ error: 'Unknown corral ID' });
  }
  if (!Number.isInteger(parsedCount) || parsedCount < 0) {
    return res.status(400).json({ error: 'Count must be a non-negative integer' });
  }

  const client = await pool.connect();
  try {
    // One transaction: a snapshot surviving a failed update would poison the model's training data.
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE corrals SET cart_count = $1, last_updated = NOW()
        WHERE id = $2 RETURNING last_updated`,
      [parsedCount, id]
    );

    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Corral ${id} not found in database` });
    }

    const now = new Date();
    await client.query(
      `INSERT INTO corral_snapshots (corral_id, cart_count, timestamp, hour, day_of_week)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, parsedCount, now, now.getHours(), toMondayFirst(now.getDay())]
    );

    await client.query('COMMIT');

    res.json({
      message: `Corral ${id} updated`,
      normalizedId: id,
      currentStatus: await readAllCounts(client),
      lastUpdated: updated.rows[0].last_updated,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/corrals failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  } finally {
    client.release();
  }
});

module.exports = router;
