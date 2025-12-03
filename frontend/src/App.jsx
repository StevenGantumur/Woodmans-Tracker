// Importing react hooks vvv

// useState: useState lets you store and update the corrals object (like { A: 5, B: 12 })
// useEffect lets you run code (fetch) after the component loads.
import { useEffect, useState } from 'react';

// Importing the jsx files
import CorralList from "./Components/CorralList";
import UpdateForm from "./Components/UpdateForm";
import CorralGrid from "./Components/CorralGrid";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

// We want to display the cart count from the Express backend to our React frontend. We will connect them here.

function App() {
  // Initializes an empty object that will later hold the data of the cart count from the server.
  const [corrals, setCorrals] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null); // Used because one of the const statements in CorralList.jsx ended up outside function
  const [optimizedRoute, setOptimizedRoute] = useState([]); // Holds optimized route data from backend ML stub
  const [routeLoading, setRouteLoading] = useState(false);
  
  // Fetch from your backend (GET /api/corrals).
  useEffect(() => {
    fetch(`${API_BASE}/api/corrals`)
      // Then Parses the JSON.
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch corrals: ${res.status}`);
        }
        return res.json();
      })
      // Update the corrals state.
      .then(data => setCorrals(data))
      // Only run once, when the page loads (because of the empty []).
      .catch(err => console.error('Fetch error:', err));
  }, []);

  // Function to update corrals (will be called updateForm)
  const updateCorrals = (newData, updatedID) => {
    console.log("updateCorrals called with:", newData, "Updated:", updatedID); // debug
    // Replace old data with updated data
    setCorrals(newData);
    setLastUpdated(updatedID);
  };

  // Function to fetch optimized route from backend ML stub (TEMPORARY, WILL ADD ML LATER)
  const getOptimizedRoute = async () => {
    if (routeLoading) return; // prevent spam clicks
    setRouteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrals }) // Send current corrals state
      });

      if(!res.ok) throw new Error(`HTTP error! ${res.status}`);

      const data = await res.json();
      console.log("Optimized Route:", data);

      // Make sure it's always an array, fallback to empty if missing
      setOptimizedRoute(Array.isArray(data.optimizedRoute) ? data.optimizedRoute : []);
    }
    catch(err) {
      console.error("Error fetching optimized route: ", err);
      setOptimizedRoute([]);
    }
    finally {
      setRouteLoading(false);
    }
  };
  
  
  // Rendering the UI
  // Converts the entries into a readable array format.
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Cart Corrals</h1>
      <CorralList corrals={corrals} lastUpdated={lastUpdated} />
      <UpdateForm updateCorrals={updateCorrals} apiBase={API_BASE} />
      <CorralGrid corrals={corrals} />

      {/* Button that calls backend to get optimized route */}
      <button onClick={getOptimizedRoute} style={{ marginTop: "1rem" }} disabled={routeLoading}>
        {routeLoading ? "Optimizing..." : "Get Optimized Route"}
      </button>

      {/* Only render route if optimizedRoute is a valid array with items */}
      {Array.isArray(optimizedRoute) && optimizedRoute.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Optimized Route:</h3>
          <p>{optimizedRoute.join(" ➝ ")}</p>
        </div>
      )}
    </div>
  );
}

export default App;
