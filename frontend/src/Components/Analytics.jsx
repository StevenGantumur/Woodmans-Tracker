import { useCallback, useEffect, useState } from "react";

import { HourChart, DayChart, CorralRanking } from "./Charts";
import Weather from "./Weather";

const RANGES = [7, 30, 90];

const fmtHour = (h) => (h == null ? "—" : `${String(h).padStart(2, "0")}:00`);

function Analytics({ apiBase }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/analytics?days=${days}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <Weather apiBase={apiBase} />

      {/* Filters sit in one row above the charts. */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`cut-sm px-3 py-1.5 text-sm font-medium transition ${
                days === d
                  ? "bg-signal-route text-ink-900"
                  : "bg-ink-700 text-haze-300 hover:text-haze-100"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-xs text-haze-500 hover:text-haze-100 underline"
        >
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>

      {error && (
        <div className="panel p-5">
          <p className="text-signal-stop font-semibold">Could not load analytics</p>
          <p className="text-sm text-haze-300 mt-1">{error}</p>
          <button onClick={load} className="btn cut-sm mt-3 text-sm">Retry</button>
        </div>
      )}

      {loading && !error && <p className="text-haze-500">Crunching history…</p>}

      {data && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Peak hour" value={fmtHour(data.summary.peakHour)}
              sub={`${data.summary.peakAvg ?? "—"} carts avg`} />
            <Tile label="Busiest corral" value={data.summary.busiestCorral ?? "—"}
              sub={`${data.summary.busiestCorralAvg ?? "—"} carts avg`} />
            <Tile label="Lot average" value={data.summary.lotAverage ?? "—"} sub="carts per corral" />
            <Tile label="Snapshots" value={data.range.snapshots.toLocaleString()}
              sub={`last ${data.range.days} days`} />
          </div>

          <section className="panel p-5">
            <h2 className="label mb-1">Average carts by hour</h2>
            <p className="text-xs text-haze-500 mb-3">
              Across all lot corrals. Quietest around {fmtHour(data.summary.quietestHour)}.
            </p>
            <HourChart data={data.byHour} />
          </section>

          <div className="grid lg:grid-cols-2 gap-5">
            <section className="panel p-5">
              <h2 className="label mb-1">Average carts by day</h2>
              <p className="text-xs text-haze-500 mb-3">Monday through Sunday.</p>
              <DayChart data={data.byDay} />
            </section>

            <section className="panel p-5">
              <h2 className="label mb-1">Busiest corrals</h2>
              <p className="text-xs text-haze-500 mb-3">
                Highest average count. Storefront corrals shown in orange.
              </p>
              <CorralRanking data={data.byCorral} />
            </section>
          </div>

          {showTable && <DataTable data={data} />}
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="panel p-4">
      <p className="label">{label}</p>
      <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
      <p className="text-xs text-haze-500 mt-0.5">{sub}</p>
    </div>
  );
}

// The numbers behind the charts, for anyone who cannot read color or wants exact values.
function DataTable({ data }) {
  return (
    <section className="panel p-5 overflow-x-auto">
      <h2 className="label mb-3">Underlying data</h2>
      <div className="grid md:grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-haze-300 font-medium mb-2">By hour</p>
          <table className="w-full">
            <thead>
              <tr className="text-haze-500 text-xs">
                <th className="text-left font-medium pb-1">Hour</th>
                <th className="text-right font-medium pb-1">Avg carts</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.byHour.map((r) => (
                <tr key={r.hour} className="border-t border-ink-700">
                  <td className="py-0.5">{fmtHour(r.hour)}</td>
                  <td className="text-right">{r.avgCarts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="text-haze-300 font-medium mb-2">By corral</p>
          <table className="w-full">
            <thead>
              <tr className="text-haze-500 text-xs">
                <th className="text-left font-medium pb-1">Corral</th>
                <th className="text-left font-medium pb-1">Type</th>
                <th className="text-right font-medium pb-1">Avg</th>
                <th className="text-right font-medium pb-1">Max</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.byCorral.map((r) => (
                <tr key={r.id} className="border-t border-ink-700">
                  <td className="py-0.5 font-mono">{r.id}</td>
                  <td className="text-haze-500">{r.type}</td>
                  <td className="text-right">{r.avgCarts}</td>
                  <td className="text-right">{r.maxCarts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Analytics;
