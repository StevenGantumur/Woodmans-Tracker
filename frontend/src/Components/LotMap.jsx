import layout from "../../../shared/layout.json";

// Drawn in feet, the same units the optimizer solves in, so the picture cannot
// drift away from the route it is illustrating.
const PAD_X = 80;
const PAD_TOP = 160;
const PAD_BOTTOM = 70;

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

const RETURN_W = 34;
const RETURN_H = 48;
const SUPPLY_H = 44;

const FILL = {
  critical: "#ef4444",
  moderate: "#f59e0b",
  good: "#22c55e",
  empty: "#3d3d3d",
};

// Return corrals are urgent when full; supply corrals when empty. One shared
// scale would flag a well-stocked entrance as a problem.
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

  const stops = route.map((id) => byId[id]).filter(Boolean);
  const routePath = stops.length
    ? stops.map((c, i) => `${i === 0 ? "M" : "L"} ${px(c.x)},${py(c.y)}`).join(" ")
    : "";

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full min-w-[680px] h-auto"
        role="img"
        aria-label="Overhead map of the store lot"
      >
        <defs>
          <pattern id="asphalt" width="26" height="26" patternUnits="userSpaceOnUse">
            <rect width="26" height="26" fill="#1a1a1a" />
            <path d="M26 0 L0 0 0 26" fill="none" stroke="#242424" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill="url(#asphalt)" />

        {/* The store along the top edge. */}
        <rect
          x={PAD_X - 50}
          y={14}
          width={MAX_X - MIN_X + 100}
          height={PAD_TOP - 96}
          fill="#2b2b2b"
          stroke="#3d3d3d"
          strokeWidth="2"
        />
        <text
          x={VIEW_W / 2}
          y={PAD_TOP - 112}
          textAnchor="middle"
          fill="#9a9a9a"
          fontSize="24"
          fontWeight="700"
          letterSpacing="3"
        >
          X
        </text>

        {routePath && (
          <>
            <path
              key={route.join()}
              id="routePath"
              className="route-line"
              d={routePath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* A marker walking the route makes the direction unambiguous. */}
            <circle r="8" fill="#38bdf8">
              <animateMotion dur="5s" repeatCount="indefinite" path={routePath} />
            </circle>
          </>
        )}

        {layout.corrals.map((c) => {
          const count = counts[c.id] ?? 0;
          const isSupply = c.type === "supply";
          const w = isSupply ? c.width : RETURN_W;
          const h = isSupply ? SUPPLY_H : RETURN_H;
          const fill = FILL[severityFor(c, count)];
          const isSelected = selected === c.id;
          const order = route.indexOf(c.id);

          return (
            <g
              key={c.id}
              onClick={() => onSelect?.(c.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(c.id)}
              aria-label={`Corral ${c.id}, ${count} carts`}
            >
              <rect
                x={px(c.x) - w / 2}
                y={py(c.y) - h / 2}
                width={w}
                height={h}
                fill={fill}
                fillOpacity={isSelected ? 1 : 0.9}
                stroke={isSelected ? "#ededed" : order >= 0 ? "#38bdf8" : "#0d0d0d"}
                strokeWidth={isSelected ? 4 : order >= 0 ? 3 : 1.5}
              />
              <text
                x={px(c.x)}
                y={py(c.y) - 4}
                textAnchor="middle"
                fill="#0d0d0d"
                fontSize="15"
                fontWeight="800"
              >
                {c.id}
              </text>
              <text
                x={px(c.x)}
                y={py(c.y) + 13}
                textAnchor="middle"
                fill="#0d0d0d"
                fontSize="11"
                fontWeight="600"
              >
                {count}
                {isSupply && c.capacity ? `/${c.capacity}` : ""}
              </text>

              {/* Storefront corrals are named; lot corrals go by letter alone. */}
              {isSupply && c.label && (
                <text
                  x={px(c.x)}
                  y={py(c.y) - h / 2 - 9}
                  textAnchor="middle"
                  fill="#9a9a9a"
                  fontSize="12"
                  fontWeight="600"
                  letterSpacing="0.5"
                >
                  {c.label}
                </text>
              )}

              {/* Position in the walking order. */}
              {order >= 0 && order < route.length - 1 && (
                <>
                  <circle cx={px(c.x) + w / 2 - 4} cy={py(c.y) - h / 2 - 2} r="10" fill="#0ea5e9" />
                  <text
                    x={px(c.x) + w / 2 - 4}
                    y={py(c.y) - h / 2 + 2.5}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {order + 1}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Real dimensions, so the schematic reads as a measured lot. */}
        <g stroke="#5a5a5a" strokeWidth="1.5" fill="#757575" fontSize="13">
          <line x1={px(0)} y1={py(MAX_Y) + 38} x2={px(130)} y2={py(MAX_Y) + 38} />
          <text x={px(65)} y={py(MAX_Y) + 55} textAnchor="middle" stroke="none">
            130 ft
          </text>
          <line x1={px(MAX_X) + 46} y1={py(0)} x2={px(MAX_X) + 46} y2={py(50)} />
          <text x={px(MAX_X) + 54} y={py(25) + 4} stroke="none">
            50 ft
          </text>
        </g>
      </svg>
    </div>
  );
}

export default LotMap;
