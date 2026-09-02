const express = require('express');
const cors = require('cors');

const { pool, checkConnection } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/corrals', require('./routes/corrals'));
app.use('/api/building', require('./routes/building'));
app.use('/api/optimize-route', require('./routes/optimize'));

app.get('/', (req, res) => {
  res.json({ service: 'cart-corral-backend', status: 'running' });
});

// Reports database reachability, not just process liveness — a server that is up
// but cannot reach Postgres is not actually serving traffic.
app.get('/health', async (req, res) => {
  const dbUp = await checkConnection();
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'healthy' : 'degraded',
    service: 'cart-corral-backend',
    database: dbUp ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!(await checkConnection())) {
    console.error('Refusing to start: database unreachable. Check .env and that Postgres is running.');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('  GET  /health                    Liveness + database check');
    console.log('  POST /api/auth/login            Get a token');
    console.log('  GET  /api/corrals               Lot state + building count');
    console.log('  POST /api/corrals               Update one corral (auth)');
    console.log('  GET  /api/corrals/:id/history   Recent snapshots');
    console.log('  GET  /api/building              Carts inside the store');
    console.log('  POST /api/building              Update building count (auth)');
    console.log('  GET  /api/optimize-route        Next job + route');
    console.log('  GET  /api/shifts                Worker shifts (stub)');
  });

  // Without this the pool keeps the process alive and connections stay open on the DB.
  const shutdown = async () => {
    console.log('\nShutting down...');
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
