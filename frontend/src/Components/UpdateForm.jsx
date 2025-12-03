// UpdateForm.jsx

// Import useState from React so we can track user input values (corral + count)
import { useState } from "react";

const ALLOWED_CORRALS = [
    'A','B','C','D','E','F','G','H',
    'I','J','K','L','M','N','O','P',
    'Q','R','S','T','U','V','W','X'
];

// Declares new function named UpdateForm
function UpdateForm({ updateCorrals, apiBase = '' }) {
    // Sets up pieces of state called corral and count. Starting as empty string, ''.
    // Name is setCorral and setCount
        // setCorral is the function to update value of Corral, setCount is the count.
    const [corral, setCorral] = useState('');
    const [count, setCount] = useState('');
    const [error, setError] = useState('');

    // Called when form is submitted
    const handleSubmit = async (e) => {
        // Prevents reloading the page (default form behavior)
        e.preventDefault();

        const normalizedId = corral.trim().toUpperCase();
        const parsedCount = Number(count);

        if(!normalizedId) {
            setError('Corral is required');
            return;
        }
        if(!ALLOWED_CORRALS.includes(normalizedId)) {
            setError(`Unknown corral. Use one of: ${ALLOWED_CORRALS.join(', ')}`);
            return;
        }
        if(Number.isNaN(parsedCount) || !Number.isFinite(parsedCount)) {
            setError('Count must be a number');
            return;
        }
        setError('');
        
        try {
            // send a POST request to backend API
            const res = await fetch(`${apiBase}/api/corrals`, {
                method: 'POST', // Tells server this is a POST request
                headers: {
                    'Content-Type': 'application/json', // Sending JSON data
                },
                // Turn JS object into a JSON string for sending
                body: JSON.stringify({
                    corral_id: normalizedId,  // User entered corral ID
                    count: parsedCount, // User entered count (NOTE: This will be replaced by a real time update through RFID sensors in corrals)
                }),
            });
            
            // Checks if the server is OK, if not throws error
            if(!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            // Convert the server response from a JSON String into a JS Object
            const data = await res.json();

            console.log("POST response:", data); // Debug: see what backend sent back

            // Call the function from App.jsx to update corrals state
            updateCorrals(data.currentStatus, data.normalizedId || normalizedId);

            // Reset form fields back to empty strings
            setCorral('');
            setCount('');
        }
        catch (err) {
            // If something goes wrong in fetch or response pairing, log it to see whats wrong
            console.error("Error during POST", err)
        }
    };


    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Corral Letter (e.g. A)"
                value={corral}
                onChange={(e) => setCorral(e.target.value)} // Update local state as user types
            />
            <input
            type="number"
            placeholder="Cart Count"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            />
            <button type="submit">Update Corral</button>
            {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}
        </form>
    )
}

//  Export component so App.jsx can import and render it
export default UpdateForm;
