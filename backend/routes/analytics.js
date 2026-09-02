const express = require('express');
const router = express.Router();

const { pool } = require('../db');

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// One endpoint rather than four. The aggregates are small and always rendered
// together, so a single round trip keeps the page simple and consistent.
router.get('/', async (req, res) => {
  const requested = Number(req.query.days);
  const days = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 365) : 30;

  try {
    // $1 is interpolated as an interval via make_interval rather than string
    // concatenation, so the window stays a bound parameter.
    const window = `s.timestamp >= NOW() - make_interval(days => $1)`;

    const [byHour, byDay, byCorral, totals] = await Promise.all([
      pool.query(
        `SELECT s.hour, ROUND(AVG(s.cart_count)::numeric, 1) AS avg_carts
           FROM corral_snapshots s JOIN corrals c ON c.id = s.corral_id
          WHERE ${window} AND c.type = 'return'
          GROUP BY s.hour ORDER BY s.hour`,
        [days]
      ),
      pool.query(
        `SELECT s.day_of_week, ROUND(AVG(s.cart_count)::numeric, 1) AS avg_carts
           FROM corral_snapshots s JOIN corrals c ON c.id = s.corral_id
          WHERE ${window} AND c.type = 'return'
          GROUP BY s.day_of_week ORDER BY s.day_of_week`,
        [days]
      ),
      pool.query(
        `SELECT s.corral_id, c.type,
                ROUND(AVG(s.cart_count)::numeric, 1) AS avg_carts,
                MAX(s.cart_count) AS max_carts
           FROM corral_snapshots s JOIN corrals c ON c.id = s.corral_id
          WHERE ${window} AND c.status = 'active'
          GROUP BY s.corral_id, c.type
          ORDER BY avg_carts DESC`,
        [days]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS snapshots,
                MIN(s.timestamp) AS first_seen,
                MAX(s.timestamp) AS last_seen
           FROM corral_snapshots s WHERE ${window}`,
        [days]
      ),
    ]);

    const hours = byHour.rows.map((r) => ({ hour: r.hour, avgCarts: Number(r.avg_carts) }));
    const corrals = byCorral.rows.map((r) => ({
      id: r.corral_id,
      type: r.type,
      avgCarts: Number(r.avg_carts),
      maxCarts: r.max_carts,
    }));

    const peak = hours.reduce((a, b) => (b.avgCarts > a.avgCarts ? b : a), hours[0] || null);
    const quietest = hours.reduce((a, b) => (b.avgCarts < a.avgCarts ? b : a), hours[0] || null);
    const lot = corrals.filter((c) => c.type === 'return');

    res.json({
      range: {
        days,
        snapshots: totals.rows[0].snapshots,
        firstSeen: totals.rows[0].first_seen,
        lastSeen: totals.rows[0].last_seen,
      },
      byHour: hours,
      byDay: byDay.rows.map((r) => ({
        day: r.day_of_week,
        name: DAY_NAMES[r.day_of_week] ?? String(r.day_of_week),
        avgCarts: Number(r.avg_carts),
      })),
      byCorral: corrals,
      summary: {
        peakHour: peak?.hour ?? null,
        peakAvg: peak?.avgCarts ?? null,
        quietestHour: quietest?.hour ?? null,
        busiestCorral: lot[0]?.id ?? null,
        busiestCorralAvg: lot[0]?.avgCarts ?? null,
        lotAverage: lot.length
          ? Number((lot.reduce((s, c) => s + c.avgCarts, 0) / lot.length).toFixed(1))
          : null,
      },
    });
  } catch (err) {
    console.error('GET /api/analytics failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

module.exports = router;
