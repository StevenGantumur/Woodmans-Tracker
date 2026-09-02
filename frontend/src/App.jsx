import { useCallback, useEffect, useState } from "react";

import LotMap from "./Components/LotMap";
import CorralDetail from "./Components/CorralDetail";
import UpdateForm from "./Components/UpdateForm";
import LoginForm from "./Components/LoginForm";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const JOB = {
  restock: { label: "Restock the storefront", tone: "text-signal-stop" },
  collection: { label: "Collection sweep", tone: "text-signal-watch" },
  idle: { label: "Nothing urgent", tone: "text-signal-go" },
};

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

  const planRoute = async () => {
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

  const selectedCorral = lot?.corrals.find((c) => c.id === selected);

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-600 bg-ink-800/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-signal-go animate-pulse" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Cart Corral Tracker</h1>
              <p className="text-xs text-haze-500">Woodman's Food Market · live lot operations</p>
            </div>
          </div>
          {user ? (
            <div className="text-right text-sm">
              <p className="font-medium">{user.username}</p>
              <button onClick={handleLogout} className="text-xs text-haze-500 hover:text-haze-100">
                Log out
              </button>
            </div>
          ) : (
            <span className="text-xs text-haze-500">Viewing as guest</span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {loadError && (
          <div className="panel border-signal-stop/50 p-5">
            <p className="font-semibold text-signal-stop">Unable to load lot data</p>
            <p className="text-sm text-haze-300 mt-1">{loadError}</p>
            <button
              onClick={loadLot}
              className="btn cut-sm mt-3 bg-signal-stop text-white text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !loadError && <p className="text-haze-500">Loading lot data…</p>}

        {lot && !loadError && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="In building" value={lot.building.cartsInBuilding} highlight />
              <Stat label="In lot" value={lot.building.cartsInLot} />
              <Stat label="Fleet size" value={lot.building.fleetSize ?? "—"} />
              <Stat
                label="Unaccounted"
                value={lot.building.unaccounted}
                alert={lot.building.unaccounted !== 0}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              <section className="panel p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="label">Lot map</h2>
                  <Legend />
                </div>
                <LotMap
                  counts={lot.counts}
                  route={route?.optimizedRoute || []}
                  selected={selected}
                  onSelect={setSelected}
                />
              </section>

              <div className="space-y-5">
                <section className="panel p-5">
                  <h2 className="label mb-3">Next job</h2>
                  <button
                    onClick={planRoute}
                    disabled={routeLoading}
                    className="btn cut-sm w-full py-2.5"
                  >
                    {routeLoading ? "Planning…" : "Plan Route"}
                  </button>
                  {routeError && <p className="mt-3 text-sm text-signal-stop">{routeError}</p>}
                  {route && <RouteResult route={route} />}
                </section>

                {selected ? (
                  <CorralDetail
                    apiBase={API_BASE}
                    corralId={selected}
                    corral={selectedCorral}
                    count={lot.counts[selected] ?? 0}
                    onClose={() => setSelected(null)}
                  />
                ) : (
                  <section className="panel p-5">
                    <h2 className="label mb-2">Corral detail</h2>
                    <p className="text-sm text-haze-500">
                      Select a corral on the map to see its count and recent history.
                    </p>
                  </section>
                )}
              </div>
            </div>

            <section className="panel p-5">
              <h2 className="label mb-3">Update a corral</h2>
              {token ? (
                <UpdateForm
                  apiBase={API_BASE}
                  token={token}
                  corrals={lot.corrals}
                  onUpdate={setLot}
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
  const items = [
    ["bg-signal-go", "Healthy"],
    ["bg-signal-watch", "Watch"],
    ["bg-signal-stop", "Needs action"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-haze-300">
      {items.map(([cls, text]) => (
        <span key={text} className="flex items-center gap-1.5">
          <i className={`w-2.5 h-2.5 rounded-sm ${cls} inline-block`} />
          {text}
        </span>
      ))}
      <span className="text-haze-500">lot red when full · storefront red when empty</span>
    </div>
  );
}

function Stat({ label, value, highlight, alert }) {
  return (
    <div
      className={`panel p-4 ${highlight ? "border-signal-route/40" : ""} ${
        alert ? "border-signal-watch/50" : ""
      }`}
    >
      <p className="label">{label}</p>
      <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}

function RouteResult({ route }) {
  const job = JOB[route.job] || { label: route.job, tone: "text-haze-100" };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className={`font-semibold ${job.tone}`}>{job.label}</p>
        <p className="text-sm text-haze-300 mt-0.5">{route.reason}</p>
      </div>

      {route.optimizedRoute?.length > 0 && (
        <>
          <p className="font-mono text-sm break-words bg-ink-700 cut-sm p-3 leading-relaxed">
            {route.optimizedRoute.join(" → ")}
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Stops" value={route.corralsCovered} />
            <Metric
              label="Distance"
              value={route.totalDistance != null ? `${Math.round(route.totalDistance)} ft` : "—"}
            />
            <Metric label="Carts" value={route.cartsMoved ?? "—"} />
          </dl>
          <p className="text-[11px] text-haze-500 text-center">solver: {route.method}</p>
        </>
      )}

      {route.degraded && (
        <p className="text-sm text-signal-watch bg-signal-watch/10 border border-signal-watch/30 cut-sm p-3">
          {route.note}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-ink-700 cut-sm py-2">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-haze-500">{label}</p>
    </div>
  );
}

export default App;
