// Import react
import React from "react";
// Use this to style the grids
import "./CorralGrid.css";

// Define the fied 24 corrals 
const ALL_CORRALS = [
    "A", "B", "C", "D", "E", "F", "G", "H",
    "I", "J", "K", "L", "M", "N", "O", "P",
    "Q", "R", "S", "T", "U", "V", "W", "X"
];

function CorralGrid({ corrals }){
    return (
        <div className="grid-container">
            {ALL_CORRALS.map((id) => {
                //Default to 0 if backend didn't send to this corral
                const count = corrals[id] || 0;
                
                //Decide color based on severity
                let color = "green"; //Low
                if(count >=15 && count < 30) color = "yellow"; //Medium
                if(count >= 30) color = "red";
                
                return (
                    <div
                        key={id}
                        className="grid-item"
                        style={{ backgroundColor: color }}
                    >
                        <strong>{id}</strong>
                        <br />
                        {count} carts
                    </div>
                );
            })}
        </div>
    );
}

export default CorralGrid;




