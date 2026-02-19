// Import react
import React, { useState } from "react";
// Use this to style the grids

// Define the fied 24 corrals 
const ALL_CORRALS = [
    "A", "B", "C", "D", "E", "F", "G", "H",
    "I", "J", "K", "L", "M", "N", "O", "P",
    "Q", "R", "S", "T", "U", "V", "W", "X"
];

function CorralGrid({ corrals = {}, onCorralClick }){

    const[hoveredCorral, setHoveredCorral] = useState(null);
    const[selectedCorral, setSelectedCorral] = useState(null);
    // Just for visual example
    if(!corrals || Object.keys(corrals).length === 0) {
        const demoData = {};
        ALL_CORRALS.forEach((id, index) => {
            demoData[id] = Math.floor(Math.random() * 40);
        });
        corrals = demoData;
    }
    
    const corralSeverity = (count) => {
        if (count >= 30) return 'bg-red-500 hover:bg-red-600 text-white';
        if (count >= 15) return 'bg-yellow-500 hover:bg-yellow-600 text-white';
        return 'bg-green-500 hover:bg-green-600 text-white';
    };

    const getStatus = (count) => {
        if (count >= 30) return 'CRITICAL';
        if (count >= 15) return 'Moderate';
        return 'Noice';
    };

    const handleClick = (id, count) => {
        setSelectedCorral(id);
        if (onCorralClick) {
            onCorralClick(id, count);
        }
    };

    const totalCarts = ALL_CORRALS.reduce((sum, id) => sum + (corrals[id] || 0), 0);
    const criticalCorrals = ALL_CORRALS.filter(id => (corrals[id] || 0) >= 30).length;
    const averageCarts = (totalCarts / ALL_CORRALS.length).toFixed(1);
    
    return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Carts" value={totalCarts} />
        <StatCard label="Average per Corral" value={averageCarts} />
        <StatCard 
          label="Critical Corrals" 
          value={criticalCorrals} 
          alert={criticalCorrals > 0}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-700">Good (0-14)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-gray-700">Moderate (15-29)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-700">Critical (30+)</span>
        </div>
      </div>

      {/* Corral Grid */}
      <div className="grid grid-cols-8 gap-3">
        {ALL_CORRALS.map((id) => {
          const count = corrals[id] || 0;
          const colorClasses = corralSeverity(count);
          const status = getStatus(count);
          const isSelected = selectedCorral === id;
          const isHovered = hoveredCorral === id;

          return (
            <div
              key={id}
              onClick={() => handleClick(id, count)}
              onMouseEnter={() => setHoveredCorral(id)}
              onMouseLeave={() => setHoveredCorral(null)}
              className={`
                ${colorClasses}
                relative
                rounded-lg shadow-md
                p-4
                cursor-pointer
                transition-all duration-200 ease-in-out
                transform
                ${isSelected ? 'ring-4 ring-blue-500 scale-105' : ''}
                ${isHovered ? 'scale-110 shadow-2xl' : ''}
              `}
            >
              {/* Corral ID */}
              <div className="text-2xl font-bold text-center mb-1">
                {id}
              </div>

              {/* Cart Count */}
              <div className="text-sm text-center">
                {count} carts
              </div>

              {/* Status Badge */}
              {count >= 15 && (
                <div className="absolute -top-2 -right-2 bg-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
                  {status === 'Critical' ? '🔴' : '⚠️'}
                </div>
              )}

              {/* Hover Tooltip */}
              {isHovered && (
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-10 whitespace-nowrap">
                  <div>Status: <strong>{status}</strong></div>
                  <div>Click for predictions</div>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Corral Info */}
      {selectedCorral && (
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Corral {selectedCorral} Selected
              </h3>
              <p className="text-sm text-blue-700">
                Current count: {corrals[selectedCorral] || 0} carts • 
                Status: {getStatus(corrals[selectedCorral] || 0)}
              </p>
            </div>
            <button
              onClick={() => setSelectedCorral(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View Predictions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, alert }) {
  return (
    <div className={`
      bg-white rounded-lg shadow-md p-4 text-center
      ${alert ? 'border-2 border-red-500' : ''}
    `}>
      <div className="text-3xl font-bold text-gray-800">
        {value}
        {alert && <span className="ml-2 text-red-500">⚠️</span>}
      </div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

export default CorralGrid;




