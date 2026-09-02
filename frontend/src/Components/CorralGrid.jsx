import { useState } from "react";
import ALL_CORRALS from "../../../shared/corrals.json";

const THRESHOLDS = { critical: 30, moderate: 15 };

const STATUS = {
  Critical: { label: "Critical", badge: "🔴", classes: "bg-red-500 hover:bg-red-600 text-white" },
  Moderate: { label: "Moderate", badge: "⚠️", classes: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  Good: { label: "Good", badge: null, classes: "bg-green-500 hover:bg-green-600 text-white" },
};

function statusFor(count) {
  if (count >= THRESHOLDS.critical) return STATUS.Critical;
  if (count >= THRESHOLDS.moderate) return STATUS.Moderate;
  return STATUS.Good;
}

function CorralGrid({ corrals, onCorralClick }) {
  const [selectedCorral, setSelectedCorral] = useState(null);

  const counts = corrals ?? {};
  const totalCarts = ALL_CORRALS.reduce((sum, id) => sum + (counts[id] || 0), 0);
  const criticalCount = ALL_CORRALS.filter((id) => (counts[id] || 0) >= THRESHOLDS.critical).length;
  const averageCarts = (totalCarts / ALL_CORRALS.length).toFixed(1);

  const handleClick = (id, count) => {
    setSelectedCorral(id);
    onCorralClick?.(id, count);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Carts" value={totalCarts} />
        <StatCard label="Average per Corral" value={averageCarts} />
        <StatCard label="Critical Corrals" value={criticalCount} alert={criticalCount > 0} />
      </div>

      <div className="flex gap-4 mb-4 text-sm">
        <LegendItem color="bg-green-500" text={`Good (0-${THRESHOLDS.moderate - 1})`} />
        <LegendItem color="bg-yellow-500" text={`Moderate (${THRESHOLDS.moderate}-${THRESHOLDS.critical - 1})`} />
        <LegendItem color="bg-red-500" text={`Critical (${THRESHOLDS.critical}+)`} />
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {ALL_CORRALS.map((id) => {
          const count = counts[id] || 0;
          const status = statusFor(count);
          const isSelected = selectedCorral === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleClick(id, count)}
              aria-label={`Corral ${id}, ${count} ${count === 1 ? "cart" : "carts"}, ${status.label}`}
              className={`${status.classes} relative rounded-lg shadow-md p-4 text-left
                transition-transform duration-200 hover:scale-105 focus:outline-none
                focus:ring-4 focus:ring-blue-400
                ${isSelected ? "ring-4 ring-blue-500 scale-105" : ""}`}
            >
              <div className="text-2xl font-bold text-center mb-1">{id}</div>
              <div className="text-sm text-center">
                {count} {count === 1 ? "cart" : "carts"}
              </div>

              {status.badge && (
                <span className="absolute -top-2 -right-2 bg-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
                  {status.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedCorral && (
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Corral {selectedCorral}</h3>
            <p className="text-sm text-blue-700">
              {counts[selectedCorral] || 0}{" "}
              {(counts[selectedCorral] || 0) === 1 ? "cart" : "carts"} ·{" "}
              {statusFor(counts[selectedCorral] || 0).label}
            </p>
          </div>
          <button
            onClick={() => setSelectedCorral(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 ${color} rounded`} />
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

function StatCard({ label, value, alert }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 text-center ${alert ? "border-2 border-red-500" : ""}`}>
      <div className="text-3xl font-bold text-gray-800">
        {value}
        {alert && <span className="ml-2 text-red-500">⚠️</span>}
      </div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

export default CorralGrid;
