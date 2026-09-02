const express = require('express');
const router = express.Router();

const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Carts inside the store. Tracked on its own rather than derived from the fleet
// total, so one miscounted corral cannot silently distort it.
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT carts_in_building, fleet_size, updated_at FROM store_state WHERE id = 1'
    );
    res.json(rows[0] || { carts_in_building: 0, fleet_size: null });
  } catch (err) {
    console.error('GET /api/building failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const count = Number(req.body?.carts_in_building);

  if (!Number.isInteger(count) || count < 0) {
    return res.status(400).json({ error: 'carts_in_building must be a non-negative integer' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE store_state SET carts_in_building = $1, updated_at = NOW()
        WHERE id = 1 RETURNING carts_in_building, fleet_size, updated_at`,
      [count]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/building failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
