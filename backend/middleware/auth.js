const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '8h';

// Failing at startup beats failing per-request: a missing secret would otherwise
// let the server boot and reject every login with a confusing 500.
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    // Distinguished so the client knows to prompt for login again rather than
    // treating an expired shift token as a hard failure.
    const expired = err.name === 'TokenExpiredError';
    res.status(401).json({
      error: expired ? 'Session expired, please log in again' : 'Invalid token',
      expired,
    });
  }
}

module.exports = { signToken, requireAuth, TOKEN_TTL };
