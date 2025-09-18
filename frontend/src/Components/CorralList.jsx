// CorralList.jsx

// Importing React hooks
import { useEffect, useState } from "react"

// Define the CorralList function, and corrals is taken as a prop from App.jsx
function CorralList({ corrals, lastUpdated }) {
    // State to track which corral is being highlighted
    const [highlight, setHighlight] = useState(null);

    // Whenever corral changes or updates, useEffect runs
    useEffect(() => {
        // We only want this to run if we have data
        if(lastUpdated) {

            // We want to store the corral ID in state, which tells react which one to highlight
            // vvv
            setHighlight(lastUpdated);

            // After two seconds reset the highlight back to null
            const timer = setTimeout(() => setHighlight(null), 2000)

            // Cleanup: If the corral updates before the old timer, clear the timer.
            return () => clearTimeout(timer);
        }
    }, [lastUpdated]); // Runs this effect every time a corral is updated
    return (
        <ul>
            {Object.entries(corrals).map(([id, count]) => (
                <li
                    key={id}
                    style={{
                        fontWeight: id === highlight ? "bold" : "normal",
                        color: id === highlight ? "green" : "black",
                        transition: "all 0.3s ease",
                    }}
                >
                    Corral {id}: {count} carts
                </li>
            ))}
        </ul>
    );
}

export default CorralList;