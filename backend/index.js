// backend/index.js
const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json()); // Parse JSON requests

// Import routes
const shiftRoutes = require('./routes/shifts');
const corralRoutes = require('./routes/corrals');

app.use('/api/shifts', shiftRoutes);
app.use('/api/corrals', corralRoutes);

app.get('/', (req, res) => {
  res.send('Backend is working!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
