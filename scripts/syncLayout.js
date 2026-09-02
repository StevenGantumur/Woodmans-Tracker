// Applies shared/layout.json to the corrals table so the map and the optimizer
// read the same positions. Safe to re-run.
//   node scripts/syncLayout.js

const path = require('path');
const { Pool } = require('pg');
const layout = require('../shared/layout.json');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'cartdaddy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const c of layout.corrals) {
      await client.query(
        `INSERT INTO corrals (id, x_coord, y_coord, type, capacity, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (id) DO UPDATE
           SET x_coord = EXCLUDED.x_coord,
               y_coord = EXCLUDED.y_coord,
               type    = EXCLUDED.type,
               capacity = EXCLUDED.capacity,
               status  = 'active'`,
        [c.id, c.x, c.y, c.type, c.capacity ?? null]
      );
    }

    // Retired rather than deleted so historical snapshots keep referencing it.
    for (const id of layout.inactive || []) {
      await client.query(`UPDATE corrals SET status = 'inactive' WHERE id = $1`, [id]);
    }

    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT type, COUNT(*)::int AS n FROM corrals WHERE status = 'active' GROUP BY type ORDER BY type`
    );
    console.log('Layout synced:');
    for (const r of rows) console.log(`  ${r.n} ${r.type} corrals`);
    console.log(`  ${(layout.inactive || []).length} inactive`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Layout sync failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
