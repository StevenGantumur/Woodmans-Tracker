// UpdateForm.jsx

// Imports useState hook from React: using it for tracking user input in form
import { useState } from 'react';


// Declares new function named UpdateForm
function UpdateForm() {
    // Sets up pieces of state called corral and count. Starting as empty string, ''.
    // Name is setCorral and setCount
        // setCorral is the function to update value of Corral, setCount is the count.
    const [corral, setCorral] = useState('');
    const [count, setCount] = useState('');

    // Called when form is submitted
    const handleSubmit = async (e) => {
        // Prevents reloading the page (default form behavior)
        e.preventDefault();
        
        try {
            // send a POST request to backend API
            const res = await fetch('http://localhost:3001/api/corrals', {
                method: 'POST', // Tells server this is a POST request
                headers: {
                    'Content-Type': 'applicati  on/json', // Sending JSON data
                },
                // Turn JS object into a JSON string for sending
                body: JSON.stringify({
                    corral_id: corral,  // User entered corral ID
                    count: parseInt(count, 10), // User entered count (NOTE: This will be replaced by a real time update through RFID sensors in corrals)
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
            updateCorrals(data);

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
                placeholder="Corral Letter (esg. A)"
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
        </form>
    )
}



export default UpdateForm;