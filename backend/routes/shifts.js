const express = require('express');
const router = express.Router();

// Stub. Shift scheduling is planned but not implemented — there is no shifts
// table yet, so this returns fixed sample data and flags itself as such.
const SAMPLE_SHIFTS = [
  { worker: 'Alice', shift: '9AM - 1PM' },
  { worker: 'Bob', shift: '1PM - 5PM' },
];

router.get('/', (req, res) => {
  res.json({ implemented: false, shifts: SAMPLE_SHIFTS });
});

module.exports = router;
