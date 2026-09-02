import { useEffect, useState } from "react";

// Compact history plot. The endpoint returns newest first, so it is reversed to
// read left to right in time.
function Sparkline({ snapshots }) {
  if (snapshots.length < 2) return null;

  const points = [...snapshots].reverse();
  const values = points.map((s) => s.cart_count);
  const max = Math.max(...values, 1);
  const W = 320;
  const H = 60;

  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" aria-label="Recent cart counts">
      <path d={`${path} L ${W},${H} L 0,${H} Z`} fill="#38bdf8" fillOpacity="0.12" />
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" />
    </svg>
  );
}

function CorralDetail({ apiBase, corralId, corral, count, onClose }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!corralId) return;
    setHistory(null);
    setError(null);

    let cancelled = false;
    fetch(`${apiBase}/api/corrals/${corralId}/history?limit=48`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Server responded ${res.status}`))))
      // A stale response from a previously selected corral must not overwrite
      // the current one, so late results are dropped.
      .then((data) => !cancelled && setHistory(data.snapshots))
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [apiBase, corralId]);

  if (!corralId || !corral) return null;

  const isSupply = corral.type === "supply";

  return (
    <aside className="panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">{corral.label || (isSupply ? "Storefront corral" : "Lot corral")}</p>
          <h3 className="text-2xl font-bold">Corral {corralId}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-haze-500 hover:text-haze-100 text-sm"
          aria-label="Close detail"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ink-700 cut-sm p-3">
          <p className="label">Carts</p>
          <p className="text-2xl font-bold tabular-nums">
            {count}
            {isSupply && corral.capacity && (
              <span className="text-haze-500 text-base"> / {corral.capacity}</span>
            )}
          </p>
        </div>
        <div className="bg-ink-700 cut-sm p-3">
          <p className="label">Position</p>
          <p className="text-2xl font-bold tabular-nums">
            {corral.x}
            <span className="text-haze-500 text-base">, {corral.y} ft</span>
          </p>
        </div>
      </div>

      <div>
        <p className="label mb-1">Recent history</p>
        {error && <p className="text-sm text-signal-stop">{error}</p>}
        {!history && !error && <p className="text-sm text-haze-500">Loading…</p>}
        {history?.length > 1 && <Sparkline snapshots={history} />}
        {history?.length === 1 && <p className="text-sm text-haze-500">Only one reading so far.</p>}
        {history?.length === 0 && <p className="text-sm text-haze-500">No history yet.</p>}
      </div>
    </aside>
  );
}

export default CorralDetail;
