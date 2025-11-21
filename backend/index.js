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

app.get('/', (req, res) => {
    //send is good for testing purposes, but not usually for actual product. (Gets sent into the website)
  res.send('Backend is working!');
});

// Health check endpoint - Claude claims that it is good for production purposes. Monitoring tools can ping this to verify the server is responsive.
app.get('/health', (req, res) => {
  res.json({
    // Status Field
    status: 'healthy',
    //Service Name
    service: 'cart-corral-backend',
    // When health checkup of server occurs
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
    //log sends it to the terminal
  console.log(`Server running at http://localhost:${PORT}`);

  console.log(`Endpoints available:`)
  console.log(`GET /api/corrals - Get all corral counts`)
  console.log(`POST /api/corrals - Update a corral`)
  console.log(`POST /api/optimize-route - Get optimized collection route`)
  console.log(`GET /api/shifts - Shift management (TBD WIP)`)
});


