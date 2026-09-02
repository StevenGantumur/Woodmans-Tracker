const path = require('path');
const { Pool } = require('pg');

// Shared with the Python ML scripts (ml/config.py) so both read one set of credentials.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'woodmans_carts',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Without this, an idle client dropped by the DB becomes an unhandled error and kills the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

async function checkConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log(`PostgreSQL connected at ${rows[0].now.toISOString()}`);
    return true;
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, checkConnection };
