// backend/routes/shifts.js
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
