// backend/routes/optimize.js

// Import express framework
const express = require('express');

//Creates router, mini version of server
const router = express.Router();

// Define post route at /api/optimize-route
router.post('/', (req, res) => {
    // Grabs corral data from the request body
    const { corrals } = req.body;

    // If the data being received is not what the corral data should be, or is missing, send an error
    if(!corrals || typeof corrals != "object"){
        return res.status(400).json({ error: "Missing or invalid cart corral data."});
    }

    // Turn the data from the frontend into something we can use, (JSON)
    const corralEntries = Object.entries(corrals);

    // Sort the array by count, highest to lowest.
    const sorted = corralEntries.sort((a,b) => b[1] - a[1]);

    // Extra corral ID data by order from highest count to lowest count
    const optimizedRoutes = sorted.map(entry => entry[0]);

    // Send a response back to the frontend with results, + extra information.
    res.json({
        optimizedRoutes, //Array of corral IDS sorted by priority.
        metadata: {
            method: "stub-sort", // lets us know this is just a placeholder algorithm
            timestamp: new Date().toISOString(), // Useful for logging and debugging
        },
    });
});

// Export the router for index.js
module.exports = router;