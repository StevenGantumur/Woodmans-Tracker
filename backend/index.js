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

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cart-corral-backend',
    timestamp: new Date().toISOString()
  });

  
}

app.listen(PORT, () => {
    //log sends it to the terminal
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


