// backend/routes/corrals.js
const express = require('express');
const router = express.Router();

let corralData = {
  A: 5,
  B: 12,
  C: 8
};

router.get('/', (req, res) => {
  res.json(corralData);
});

router.post('/update', (req, res) => {
  const { corral_id, count } = req.body;
  if (!corral_id || count === undefined) {
    return res.status(400).send('Missing data');
  }

  corralData[corral_id] = count;
  res.send(`Corral ${corral_id} updated to ${count} carts.`);
});

module.exports = router;
