// backend/index.js
const express = require('express');
const app = express();
const PORT = 3001;

// Initializes the cors backend support
const cors = require('cors');

app.use(cors());
app.use(express.json()); // Parse JSON requests

// Import routes
const shiftRoutes = require('./routes/shifts');
const corralRoutes = require('./routes/corrals');
const optimizeRoutes = require('./routes/optimize');

//in url when looking at /api/shifts itll show me the data for the shifts
app.use('/api/shifts', shiftRoutes);
//same logic here
app.use('/api/corrals', corralRoutes);
// exact same logic again haha lol who knew
app.use('/api/optimize-route', optimizeRoutes);

app.post('/api/optimize-route', (req, res) => {
  // Grab corrals object sent from frontend
  const corrals = req.body.corrals || {};

  // Convert into array like [["A", 10], ["B", 3]]
  const entries = Object.entries(corrals);

  // Sort by cart count (descending = most carts first)
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  // Extract just the corral IDs (["B", "A", "C"])
  const optimizedRoute = sorted.map(([id]) => id);

  console.log("Optimized route calculated:", optimizedRoute);

  // Send result back to frontend
  res.json({ optimizedRoute });
});

app.get('/', (req, res) => {
    //send is good for testing purposes, but not usually for actual product. (Gets sent into the website)
  res.send('Backend is working!');
});

app.listen(PORT, () => {
    //log sends it to the terminal
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


