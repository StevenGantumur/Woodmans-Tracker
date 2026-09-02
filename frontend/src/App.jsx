import { useCallback, useEffect, useState } from "react";

import LotMap from "./Components/LotMap";
import UpdateForm from "./Components/UpdateForm";
import LoginForm from "./Components/LoginForm";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

function App() {
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  const loadLot = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/corrals`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setLot(await res.json());
    } catch (err) {
      setLoadError(`Could not reach the server at ${API_BASE}. ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLot();
  }, [loadLot]);

  // A stored token may have expired while the tab was closed, so it is checked
  // once on load rather than trusted until the first write fails.
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      });
  }, [token]);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const getRoute = async () => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const res = await fetch(`${API_BASE}/api/optimize-route`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setRoute(await res.json());
    } catch (err) {
      setRoute(null);
      setRouteError(`Could not plan a route. ${err.message}`);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cart Corral Tracker</h1>
            <p className="text-sm text-gray-600">
              Live cart counts and collection routing for the Woodman's lot
            </p>
          </div>
          {user ? (
            <div className="text-sm text-right">
              <p className="text-gray-900 font-medium">{user.username}</p>
              <button onClick={handleLogout} className="text-blue-600 hover:underline">
                Log out
              </button>
            </div>
          ) : (
            <span className="text-sm text-gray-500">Viewing as guest</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {loadError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="font-semibold text-red-900">Unable to load lot data</p>
            <p className="text-sm text-red-700 mt-1">{loadError}</p>
            <button
              onClick={loadLot}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !loadError && <p className="text-gray-500">Loading lot data…</p>}

        {lot && !loadError && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Carts in building" value={lot.building.cartsInBuilding} accent />
              <Stat label="Carts in lot" value={lot.building.cartsInLot} />
              <Stat label="Fleet size" value={lot.building.fleetSize ?? "—"} />
              <Stat
                label="Unaccounted"
                value={lot.building.unaccounted}
                alert={lot.building.unaccounted < 0}
              />
            </div>

            <section className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl font-semibold text-gray-900">Lot Map</h2>
                <Legend />
              </div>
              <LotMap
                counts={lot.counts}
                route={route?.optimizedRoute || []}
                selected={selected}
                onSelect={setSelected}
              />
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Next Job</h2>
              <button
                onClick={getRoute}
                disabled={routeLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {routeLoading ? "Planning…" : "Plan Route"}
              </button>
              {routeError && <p className="mt-3 text-sm text-red-700">{routeError}</p>}
              {route && <RouteResult route={route} />}
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Update a Corral</h2>
              {token ? (
                <UpdateForm
                  apiBase={API_BASE}
                  token={token}
                  corrals={lot.corrals}
                  onUpdate={(next) => setLot(next)}
                  onAuthExpired={handleLogout}
                />
              ) : (
                <LoginForm apiBase={API_BASE} onLogin={handleLogin} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-700">
      <span className="flex items-center gap-1.5">
        <i className="w-3 h-3 rounded bg-[#16a34a] inline-block" /> Healthy
      </span>
      <span className="flex items-center gap-1.5">
        <i className="w-3 h-3 rounded bg-[#eab308] inline-block" /> Watch
      </span>
      <span className="flex items-center gap-1.5">
        <i className="w-3 h-3 rounded bg-[#dc2626] inline-block" /> Needs action
      </span>
      <span className="text-gray-500">
        Lot corrals turn red when full · storefront corrals when empty
      </span>
    </div>
  );
}

function Stat({ label, value, accent, alert }) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${accent ? "border-2 border-blue-500" : ""} ${
        alert ? "border-2 border-red-500" : ""
      }`}
    >
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function RouteResult({ route }) {
  const JOB_LABEL = {
    restock: "Restock the storefront",
    collection: "Collection sweep",
    idle: "Nothing urgent",
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-lg font-semibold text-gray-900">{JOB_LABEL[route.job] || route.job}</p>
        <p className="text-sm text-gray-600">{route.reason}</p>
      </div>

      {route.optimizedRoute?.length > 0 && (
        <>
          <p className="font-mono text-gray-900 break-words">{route.optimizedRoute.join(" → ")}</p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            <span>
              <dt className="inline font-medium">Stops: </dt>
              <dd className="inline">{route.corralsCovered}</dd>
            </span>
            {route.totalDistance != null && (
              <span>
                <dt className="inline font-medium">Walking distance: </dt>
                <dd className="inline">{Math.round(route.totalDistance)} ft</dd>
              </span>
            )}
            {route.cartsMoved != null && (
              <span>
                <dt className="inline font-medium">Carts: </dt>
                <dd className="inline">{route.cartsMoved}</dd>
              </span>
            )}
            <span>
              <dt className="inline font-medium">Method: </dt>
              <dd className="inline">{route.method}</dd>
            </span>
          </dl>
        </>
      )}

      {route.degraded && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          {route.note}
        </p>
      )}
    </div>
  );
}

export default App;
