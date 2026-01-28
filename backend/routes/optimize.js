// backend/routes/optimize.js

// Import express framework
const express = require('express');

const { spawn } = require('child_process'); // Running the python as a seperate process

const path = require('path');

//Creates router, mini version of server
const router = express.Router();

const CORRAL_COORDS = {
    // Row 1 (y=0): A-H
    A: { x: 0, y: 0 }, B: { x: 1, y: 0 }, C: { x: 2, y: 0 }, D: { x: 3, y: 0 },
    E: { x: 4, y: 0 }, F: { x: 5, y: 0 }, G: { x: 6, y: 0 }, H: { x: 7, y: 0 },
    
    // Row 2 (y=1): I-P
    I: { x: 0, y: 1 }, J: { x: 1, y: 1 }, K: { x: 2, y: 1 }, L: { x: 3, y: 1 },
    M: { x: 4, y: 1 }, N: { x: 5, y: 1 }, O: { x: 6, y: 1 }, P: { x: 7, y: 1 },
    
    // Row 3 (y=2): Q-X
    Q: { x: 0, y: 2 }, R: { x: 1, y: 2 }, S: { x: 2, y: 2 }, T: { x: 3, y: 2 },
    U: { x: 4, y: 2 }, V: { x: 5, y: 2 }, W: { x: 6, y: 2 }, X: { x: 7, y: 2 }
}
const DEPOT_CORRAL = 'A'; // Where the route starts and ends. (SUBJECT TO CHANGE ACCORDING TO WHERE THEY SHOULD END UP)
const MIN_CART_THRESHOLD = 5; // Only visit carts with x value (5 as of now)


function callPythonOptimizer(corralData) {
    // Returns a promise that resolves with Python's result
    return new Promise((resolve, reject) => {
        // Path to python script
        const scriptPath = path.join(__dirname, "..", "..", "optimizer", "optimizer.py");

        // Spawn the python process
        const python = spawn('python3', [scriptPath]);

        let stdout = ''; // Gets output from python
        let stderr = ''; // Gets errors from python

        // Listen for output from Python
        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        // Listen for errors from Python
        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // When Python finishes (Lowkey universal for all python javascript middleware : remember this)
        python.on('close', (code) => {
            if (code !== 0) {
                // Python failed
                console.error('Python stderr:', stderr);
                reject(new Error(`Python script failed with code ${code}: ${stderr}`));
            } else {
                // Python succeeded - parse JSON output
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (err) {
                    reject(new Error(`Invalid JSON from Python: ${stdout}`));
                }
            }
        });

        // Handle spawn errors (e.g., Python not installed)
        python.on('error', (err) => {
            reject(new Error(`Failed to start Python: ${err.message}`));
        });
        
        // Send data to Python via stdin
        python.stdin.write(JSON.stringify(corralData));
        python.stdin.end(); // Signal we're done writing
    });
}

// Sort by cart count (fallback) | (AI says its good to have some fallbacks in case the product doesn't work for a bit but not important in this scenario)
function simpleSortFallback(corrals) {
    // If the python fails, just resort to a simple greedy algorithm.
    console.log(`Python failed: using fallback algorithm (Python optimizer unavailable)`);

    // Filter corrals with enough carts
    const entries = Object.entries(corrals).filter(([id, count]) => count >= MIN_CART_THRESHOLD);

    // Sort carts you bum
    const sorted = entries.sort((a, b) => b[1] - a[1]);

    // Extract the ids
    const optimizedRoute = sorted.map(([id]) => id);

    // Add depot at start and end
    return {
        success: true,
        optimizedRoute: [DEPOT_CORRAL, ...optimizedRoute, DEPOT_CORRAL],
        totalDistance: 0,
        method: 'fallback-sort',
        corralsCovered: optimizedRoute.length,
        note: 'Python optimizer unavailable - sorted by cart count'
    };
}
// Define post route at /api/optimize-route
router.post('/', async (req, res) => {
    try {
        const { corrals } = req.body;

        // Validate input
        if (!corrals || typeof corrals != 'object') {
            return res.status(400).json({
                error: 'Missing or invalid cart corral data'
            });
        }
        console.log(`Corrals received:`, corrals);

        // Filter corrals that need collection.

        const corralEntries = Object.entries(corrals).filter(([id, count]) => count >= MIN_CART_THRESHOLD);

        console.log(`Found ${corralEntries.length} corrals with ${MIN_CART_THRESHOLD}+ carts`);

        // If there are no carts needed....

        if(corralEntries.length === 0){
            return res.json({
                success: true,
                optimizedRoute: [],
                totalDistance: 0,
                corralsCovered: 0,
                message: `No corrals have ${MIN_CART_THRESHOLD}+ carts...`
            });
        }

        // Add coordinates to each corral (WILL BE UPDATED ACCORDINGLY)
        const corralDataForPython = {};
        for (const [id, count] of corralEntries) {
            if (CORRAL_COORDS[id]) {
                corralDataForPython[id] = {
                    x: CORRAL_COORDS[id].x,
                    y: CORRAL_COORDS[id].y,
                    count: count
                };
            }
            else {
                console.warn(`No coordinates for corral ${id}, skipping`)
            }
        }
        
        // Verify depot
        if(!corralDataForPython[DEPOT_CORRAL] && CORRAL_COORDS[DEPOT_CORRAL]) {
            corralDataForPython[DEPOT_CORRAL] = {
                x: CORRAL_COORDS[DEPOT_CORRAL].x,
                y: CORRAL_COORDS[DEPOT_CORRAL].y,
                count: corrals[DEPOT_CORRAL] || 0
            };
        }

        // Input for python
        const pythonInput = {
            corrals: corralDataForPython,
            depot: DEPOT_CORRAL
        };

        console.log('Calling the python optimizer...');

        // Call it
        try {
            const result = await callPythonOptimizer(pythonInput);

            console.log('Python result:', result);

            if(result.success) { 
                res.json(result); // Sends the optimized route to the front end
            }
            else {
                res.json(simpleSortFallback(corrals)); // NO SOLUTION
            }
        }
        catch (pythonError) {
            // Python failed, use the fallback method
            console.error('Python optimizer error:', pythonError.message);
            res.json(simpleSortFallback(corrals));
        }
    }
    catch(error) {
        // Shits fucked uh oh
        console.error('Route optimization error:', error);

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            detail: error.message
        });
    }
});

// GET /api/optimize-route/preview - Show configuration
router.get('/preview', (req, res) => {
    // Shows settings
    res.json({
        message: 'Use POST /api/optimize-route with corral data',
        minThreshold: MIN_CART_THRESHOLD,
        depot: DEPOT_CORRAL,
        availableCorrals: Object.keys(CORRAL_COORDS)
    });
}) 

// Export the router for index.js
module.exports = router;
