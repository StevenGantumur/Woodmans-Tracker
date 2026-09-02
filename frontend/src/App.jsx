import { useCallback, useEffect, useState } from "react";

import CorralList from "./Components/CorralList";
import UpdateForm from "./Components/UpdateForm";
import CorralGrid from "./Components/CorralGrid";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

function App() {
  const [corrals, setCorrals] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const loadCorrals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/corrals`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setCorrals(await res.json());
    } catch (err) {
      setLoadError(`Could not reach the server at ${API_BASE}. ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCorrals();
  }, [loadCorrals]);

  const handleCorralUpdate = (newData, updatedId) => {
    setCorrals(newData);
    setLastUpdated(updatedId);
  };

  const getOptimizedRoute = async () => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const res = await fetch(`${API_BASE}/api/optimize-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corrals }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setRoute(await res.json());
    } catch (err) {
      setRoute(null);
      setRouteError(`Could not build a route. ${err.message}`);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Cart Corral Tracker</h1>
          <p className="text-gray-600">
            Live cart counts across 24 corrals, with optimized collection routing.
          </p>
        </header>

        {loadError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="font-semibold text-red-900">Unable to load corral data</p>
            <p className="text-sm text-red-700 mt-1">{loadError}</p>
            <button
              onClick={loadCorrals}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !loadError && <p className="text-gray-500">Loading corral data…</p>}

        {!loading && !loadError && (
          <>
            <section className="bg-white rounded-lg shadow p-6">
              <CorralGrid corrals={corrals} />
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Update a Corral</h2>
              <UpdateForm onUpdate={handleCorralUpdate} apiBase={API_BASE} />
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Collection Route</h2>
              <button
                onClick={getOptimizedRoute}
                disabled={routeLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {routeLoading ? "Optimizing…" : "Get Optimized Route"}
              </button>

              {routeError && <p className="mt-3 text-sm text-red-700">{routeError}</p>}

              {route && <RouteResult route={route} />}
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">All Corrals</h2>
              <CorralList corrals={corrals} lastUpdated={lastUpdated} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function RouteResult({ route }) {
  if (!route.optimizedRoute?.length) {
    return <p className="mt-3 text-sm text-gray-600">{route.message || "No corrals need collection."}</p>;
  }

  return (
    <div className="mt-4">
      <p className="text-lg font-mono text-gray-900">{route.optimizedRoute.join(" → ")}</p>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
        <div>
          <dt className="inline font-medium">Stops: </dt>
          <dd className="inline">{route.corralsCovered}</dd>
        </div>
        {route.totalDistance != null && (
          <div>
            <dt className="inline font-medium">Distance: </dt>
            <dd className="inline">{route.totalDistance} units</dd>
          </div>
        )}
        <div>
          <dt className="inline font-medium">Method: </dt>
          <dd className="inline">{route.method}</dd>
        </div>
      </dl>

      {/* The API returns success:true even when it falls back, so the degraded
          flag is the only signal that this is not a real distance-optimized route. */}
      {route.degraded && (
        <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          {route.note}
        </p>
      )}
    </div>
  );
}

export default App;
