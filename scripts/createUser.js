// Provisions a worker account. There is no public registration endpoint.
//   node scripts/createUser.js <username> <password> [worker|manager]

const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BCRYPT_ROUNDS = 10;

async function main() {
  const [username, password, role = 'worker'] = process.argv.slice(2);

  if (!username || !password) {
    console.error('Usage: node scripts/createUser.js <username> <password> [worker|manager]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  if (!['worker', 'manager'].includes(role)) {
    console.error(`Invalid role "${role}". Use worker or manager.`);
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'cartdaddy',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
       RETURNING username, role`,
      [username.trim().toLowerCase(), hash, role]
    );
    console.log(`User "${rows[0].username}" ready with role "${rows[0].role}".`);
  } catch (err) {
    console.error('Failed to create user:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
