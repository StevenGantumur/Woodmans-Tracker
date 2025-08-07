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

    const handleSubmit = async (e) => {
        // Prevents reloading the page (default form behavior)
        e.preventDefault();

        // Send the POST request here using fetch
        fetch('http://localhost:3001/api/corrals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                corral_id: corral,
                count: parseInt(count, 10) // assuming it's a number
              })
        }).then(res => {
                res.json()
            })
            .then(data => console.log(data))
            .catch(error => console.log('ERROR'))
    };


    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Corral Letter (esg. A)"
                value={corral}
                onChange={(e) => setCorral(e.target.value)}
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