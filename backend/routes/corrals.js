// backend/routes/corrals.js

//This line imports the express.js framework.
const express = require('express');
//Creates the router, a mini version of my server.
const router = express.Router();

const ALLOWED_CORRALS = [
  'A','B','C','D','E','F','G','H',
  'I','J','K','L','M','N','O','P',
  'Q','R','S','T','U','V','W','X'
];

//Mock data, usually gonna be replaced later by my RFID sensor on the carts in the corrals.
let corralData = {
  A: 5,
  B: 12,
  C: 8
};


// This is the get request for /api/corrals
// It returns the corralData created above as JSON for the front end to use and design the UI (View the cart count)
router.get('/', (req, res) => {
  res.json(corralData);
});

let lastUpdated = null;
// Starts a post route at /api/corrals/update
// Extracts corral_id and count
router.post('/', (req, res) => {
  const { corral_id, count } = req.body;

  //Invalid input
  if (corral_id === undefined || corral_id === null || count === undefined || count === null) {
    return res.status(400).send('Missing data');
  }
  const normalizedId = String(corral_id).trim().toUpperCase();
  const parsedCount = Number(count);

  if (!normalizedId) {
    return res.status(400).send('Corral ID required');
  }
  if (Number.isNaN(parsedCount) || !Number.isFinite(parsedCount)) {
    return res.status(400).send('Count must be a number');
  }
  if (!ALLOWED_CORRALS.includes(normalizedId)) {
    return res.status(400).send('Unknown corral ID');
  }

  // Updates count
  corralData[normalizedId] = parsedCount;
  lastUpdated = new Date().toISOString();
  
  // Sends back confirmation in JSON and shows a new message showing new cart count
  res.json({
    message: `Corral ${normalizedId} updated`,
    normalizedId,
    currentStatus: corralData,
    lastUpdated,
  });
});


module.exports = router;
