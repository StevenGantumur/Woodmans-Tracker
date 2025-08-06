// backend/routes/shifts.js

// This won't be worked on just yet, this is the shifts of each worker, but not the main workflow that I want to finish first.
const express = require('express');
const router = express.Router();

const dummyShifts = [
  { worker: "Alice", shift: "9AM - 1PM" },
  { worker: "Bob", shift: "1PM - 5PM" }
];

router.get('/', (req, res) => {
  res.json(dummyShifts);
});

module.exports = router;
