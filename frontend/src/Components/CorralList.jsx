import { useEffect, useState } from "react";

function CorralList({ corrals, lastUpdated }) {
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    if (!lastUpdated) return;
    setHighlight(lastUpdated);
    const timer = setTimeout(() => setHighlight(null), 2000);
    // Clears the pending timer if another update lands first, so the highlight
    // does not get cancelled early by the previous corral's timeout.
    return () => clearTimeout(timer);
  }, [lastUpdated]);

  const entries = Object.entries(corrals);
  if (entries.length === 0) {
    return <p className="text-gray-500">No corral data available.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(([id, count]) => (
        <li
          key={id}
          className={`px-3 py-1.5 rounded-full border text-sm transition-colors duration-300 ${
            id === highlight
              ? "bg-green-100 border-green-400 text-green-900 font-semibold"
              : "bg-gray-50 border-gray-200 text-gray-700"
          }`}
        >
          {id}: {count} {count === 1 ? "cart" : "carts"}
        </li>
      ))}
    </ul>
  );
}

export default CorralList;
