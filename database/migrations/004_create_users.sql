-- WORKER ACCOUNTS
-- Accounts are provisioned by a manager via scripts/createUser.js.
-- There is no public registration endpoint.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    username VARCHAR(50) UNIQUE NOT NULL,

    -- bcrypt hash, never the password itself
    password_hash TEXT NOT NULL,

    -- 'worker' or 'manager'; reserved for future authorization rules
    role VARCHAR(20) NOT NULL DEFAULT 'worker',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Login looks users up by username on every request to /api/auth/login.
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
