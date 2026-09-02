const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { pool } = require('../db');
const { signToken, requireAuth, TOKEN_TTL } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [String(username).trim().toLowerCase()]
    );
    const user = rows[0];

    // Compare against a dummy hash when the user does not exist so both paths
    // take the same time. Returning early would let an attacker learn which
    // usernames are real from the response timing alone.
    const hash = user?.password_hash || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi';
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      token: signToken(user),
      expiresIn: TOKEN_TTL,
      user: { username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Login failed:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

// Lets the frontend confirm a stored token is still valid on page load.
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

module.exports = router;
