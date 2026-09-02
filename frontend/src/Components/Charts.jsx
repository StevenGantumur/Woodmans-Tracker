import { useState } from "react";

// Validated against the dark surface with the dataviz palette validator:
// CVD separation dE 26.8, normal-vision 31.8, contrast >= 3:1.
export const SERIES = "#3987e5";
export const SERIES_ALT = "#d95926";

const AXIS = "#4d4d4d";
const GRID = "#2b2b2b";
const TEXT = "#a8a8a8";

function Tooltip({ x, y, lines }) {
  if (!lines) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 px-2.5 py-1.5 text-xs bg-ink-900/95 border border-ink-600 whitespace-nowrap"
      style={{ left: x, top: y, transform: "translate(-50%, -115%)" }}
    >
      {lines.map((l, i) => (
        <div key={i} className={i === 0 ? "font-semibold text-haze-100" : "text-haze-300"}>
          {l}
        </div>
      ))}
    </div>
  );
}

/** Cyclical measure over the day: a line reads the shape better than 24 bars. */
export function HourChart({ data, height = 190 }) {
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const P = { t: 14, r: 14, b: 26, l: 34 };

  if (!data?.length) return <Empty />;

  const max = Math.max(...data.map((d) => d.avgCarts), 1);
  const xFor = (i) => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const yFor = (v) => H - P.b - (v / max) * (H - P.t - P.b);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)},${yFor(d.avgCarts)}`).join(" ");
  const area = `${line} L ${xFor(data.length - 1)},${H - P.b} L ${xFor(0)},${H - P.b} Z`;
  const ticks = [0, Math.round(max / 2), Math.round(max)];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="Average carts by hour of day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={yFor(t)} y2={yFor(t)} stroke={GRID} strokeWidth="1" />
            <text x={P.l - 7} y={yFor(t) + 4} textAnchor="end" fill={TEXT} fontSize="11">{t}</text>
          </g>
        ))}

        <path d={area} fill={SERIES} fillOpacity="0.16" />
        <path d={line} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" />

        {/* Only the peak is labelled directly; a number on all 24 would be noise. */}
        {(() => {
          const peak = data.reduce((a, b) => (b.avgCarts > a.avgCarts ? b : a));
          const i = data.indexOf(peak);
          return (
            <>
              <circle cx={xFor(i)} cy={yFor(peak.avgCarts)} r="4.5" fill={SERIES}
                stroke="#1a1a1a" strokeWidth="2" />
              <text x={xFor(i)} y={yFor(peak.avgCarts) - 10} textAnchor="middle"
                fill={TEXT} fontSize="11" fontWeight="600">
                peak {peak.avgCarts}
              </text>
            </>
          );
        })()}

        {data.map((d, i) =>
          d.hour % 3 === 0 ? (
            <text key={d.hour} x={xFor(i)} y={H - 8} textAnchor="middle" fill={TEXT} fontSize="11">
              {String(d.hour).padStart(2, "0")}
            </text>
          ) : null
        )}

        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke={AXIS} strokeWidth="1" />

        {hover !== null && (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={P.t} y2={H - P.b}
            stroke={SERIES} strokeWidth="1" strokeDasharray="3 3" />
        )}

        {/* Hit targets wider than the marks. */}
        {data.map((d, i) => (
          <rect key={d.hour} x={xFor(i) - 14} y={P.t} width="28" height={H - P.t - P.b}
            fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>

      {hover !== null && (
        <Tooltip
          x={`${(xFor(hover) / W) * 100}%`}
          y={`${(yFor(data[hover].avgCarts) / H) * 100}%`}
          lines={[`${String(data[hover].hour).padStart(2, "0")}:00`,
                  `${data[hover].avgCarts} carts avg`]}
        />
      )}
    </div>
  );
}

/** Seven discrete categories: bars, not a line. */
export function DayChart({ data, height = 190 }) {
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const P = { t: 14, r: 14, b: 26, l: 34 };

  if (!data?.length) return <Empty />;

  const max = Math.max(...data.map((d) => d.avgCarts), 1);
  const band = (W - P.l - P.r) / data.length;
  const barW = band - 10; // 2px+ surface gap between neighbours
  const yFor = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const ticks = [0, Math.round(max / 2), Math.round(max)];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="Average carts by day of week">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={yFor(t)} y2={yFor(t)} stroke={GRID} strokeWidth="1" />
            <text x={P.l - 7} y={yFor(t) + 4} textAnchor="end" fill={TEXT} fontSize="11">{t}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = P.l + i * band + (band - barW) / 2;
          const y = yFor(d.avgCarts);
          const isWeekend = d.day >= 5;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={P.t} width={barW} height={H - P.t - P.b} fill="transparent" />
              {/* Rounded data-end, square against the baseline. */}
              <path
                d={`M ${x},${H - P.b} L ${x},${y + 4} Q ${x},${y} ${x + 4},${y}
                    L ${x + barW - 4},${y} Q ${x + barW},${y} ${x + barW},${y + 4}
                    L ${x + barW},${H - P.b} Z`}
                fill={isWeekend ? SERIES_ALT : SERIES}
                fillOpacity={hover === null || hover === i ? 1 : 0.55}
              />
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill={TEXT} fontSize="11">
                {d.name}
              </text>
            </g>
          );
        })}

        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke={AXIS} strokeWidth="1" />
      </svg>

      <div className="flex gap-4 mt-2 text-[11px] text-haze-300">
        <span className="flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 inline-block" style={{ background: SERIES }} /> Weekday
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 inline-block" style={{ background: SERIES_ALT }} /> Weekend
        </span>
      </div>

      {hover !== null && (
        <Tooltip
          x={`${((P.l + hover * band + band / 2) / W) * 100}%`}
          y={`${(yFor(data[hover].avgCarts) / H) * 100}%`}
          lines={[data[hover].name, `${data[hover].avgCarts} carts avg`]}
        />
      )}
    </div>
  );
}

/** Ranked categories read better horizontally: the labels stay level. */
export function CorralRanking({ data, limit = 10 }) {
  const [hover, setHover] = useState(null);
  const rows = data.slice(0, limit);
  if (!rows.length) return <Empty />;

  const max = Math.max(...rows.map((d) => d.avgCarts), 1);

  return (
    <div className="space-y-1.5">
      {rows.map((d, i) => (
        <div
          key={d.id}
          className="flex items-center gap-3 text-sm"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="w-6 font-mono text-haze-300">{d.id}</span>
          <div className="flex-1 h-5 bg-ink-700 relative">
            <div
              className="h-full transition-opacity"
              style={{
                width: `${(d.avgCarts / max) * 100}%`,
                background: d.type === "supply" ? SERIES_ALT : SERIES,
                opacity: hover === null || hover === i ? 1 : 0.55,
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>
          <span className="w-20 text-right tabular-nums text-haze-300">
            {d.avgCarts} <span className="text-haze-500">avg</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-haze-500 py-6">No data in this range.</p>;
}
