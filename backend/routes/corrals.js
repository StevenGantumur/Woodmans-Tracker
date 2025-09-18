// backend/routes/corrals.js

//This line imports the express.js framework.
const express = require('express');
//Creates the router, a mini version of my server.
const router = express.Router();

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
  if (!corral_id || count === undefined) {
    return res.status(400).send('Missing data');
  }
  // Updates count
  corralData[corral_id] = count;
  
  // Sends back confirmation in JSON and shows a new message showing new cart count
  res.json({
    message: `Corral ${corral_id} updated`,
    currentStatus: corralData,
    lastUpdated,
  });
});


module.exports = router;
