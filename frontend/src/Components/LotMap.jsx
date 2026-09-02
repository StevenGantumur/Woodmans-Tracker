import layout from "../../../shared/layout.json";

// The map is drawn in feet, the same units the optimizer solves in, so the
// picture cannot drift away from the route it is illustrating.
const PAD_X = 70;
const PAD_TOP = 150;
const PAD_BOTTOM = 60;

const xs = layout.corrals.map((c) => c.x);
const ys = layout.corrals.map((c) => c.y);
const MIN_X = Math.min(...xs);
const MAX_X = Math.max(...xs);
const MIN_Y = Math.min(...ys);
const MAX_Y = Math.max(...ys);

const VIEW_W = MAX_X - MIN_X + PAD_X * 2;
const VIEW_H = MAX_Y - MIN_Y + PAD_TOP + PAD_BOTTOM;

const px = (x) => x - MIN_X + PAD_X;
const py = (y) => y - MIN_Y + PAD_TOP;

const RETURN_W = 46;
const RETURN_H = 26;
const SUPPLY_H = 30;

const FILL = {
  critical: "#dc2626",
  moderate: "#eab308",
  good: "#16a34a",
  empty: "#9ca3af",
};

// Return corrals are urgent when full; supply corrals are urgent when empty.
// One shared scale would mark a well-stocked entrance as a problem.
function severityFor(corral, count) {
  if (corral.type === "supply") {
    const ratio = corral.capacity ? count / corral.capacity : 1;
    if (ratio < 0.4) return "critical";
    if (ratio < 0.7) return "moderate";
    return "good";
  }
  if (count >= 30) return "critical";
  if (count >= 15) return "moderate";
  if (count === 0) return "empty";
  return "good";
}

function LotMap({ counts = {}, route = [], selected, onSelect }) {
  const byId = Object.fromEntries(layout.corrals.map((c) => [c.id, c]));

  const routePoints = route
    .map((id) => byId[id])
    .filter(Boolean)
    .map((c) => `${px(c.x)},${py(c.y)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full min-w-[640px] h-auto rounded-lg"
        role="img"
        aria-label="Overhead map of the store lot showing cart corrals"
      >
        <rect width={VIEW_W} height={VIEW_H} fill="#e5e7eb" />

        {/* The store itself, along the top edge of the lot. */}
        <rect
          x={PAD_X - 40}
          y={10}
          width={MAX_X - MIN_X + 80}
          height={PAD_TOP - 90}
          fill="#475569"
          rx="4"
        />
        <text
          x={VIEW_W / 2}
          y={PAD_TOP - 105}
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="26"
          fontWeight="600"
        >
          Woodman's Food Market
        </text>

        {routePoints && (
          <polyline
            points={routePoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth="5"
            strokeDasharray="12 8"
            strokeLinejoin="round"
            opacity="0.85"
          />
        )}

        {layout.corrals.map((c) => {
          const count = counts[c.id] ?? 0;
          const isSupply = c.type === "supply";
          const w = isSupply ? c.width : RETURN_W;
          const h = isSupply ? SUPPLY_H : RETURN_H;
          const fill = FILL[severityFor(c, count)];
          const isSelected = selected === c.id;
          const inRoute = route.includes(c.id);

          return (
            <g
              key={c.id}
              onClick={() => onSelect?.(c.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`Corral ${c.id}, ${count} carts`}
            >
              <rect
                x={px(c.x) - w / 2}
                y={py(c.y) - h / 2}
                width={w}
                height={h}
                fill={fill}
                stroke={isSelected ? "#1d4ed8" : inRoute ? "#1e40af" : "#1f2937"}
                strokeWidth={isSelected ? 5 : inRoute ? 3 : 1.5}
                rx="3"
              />
              <text
                x={px(c.x)}
                y={py(c.y) - 1}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="15"
                fontWeight="700"
              >
                {c.id}
              </text>
              <text x={px(c.x)} y={py(c.y) + 12} textAnchor="middle" fill="#ffffff" fontSize="11">
                {count}
                {isSupply && c.capacity ? `/${c.capacity}` : ""}
              </text>
            </g>
          );
        })}

        {/* Real dimensions, so the schematic reads as a measured lot. */}
        <g stroke="#6b7280" strokeWidth="1.5" fill="#6b7280" fontSize="13">
          <line x1={px(0)} y1={py(MAX_Y) + 34} x2={px(130)} y2={py(MAX_Y) + 34} />
          <text x={px(65)} y={py(MAX_Y) + 50} textAnchor="middle" stroke="none">
            130 ft
          </text>
          <line x1={px(MAX_X) + 40} y1={py(0)} x2={px(MAX_X) + 40} y2={py(50)} />
          <text x={px(MAX_X) + 46} y={py(25) + 4} stroke="none">
            50 ft
          </text>
        </g>
      </svg>
    </div>
  );
}

export default LotMap;
