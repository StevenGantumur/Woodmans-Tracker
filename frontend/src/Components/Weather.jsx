import { useEffect, useState } from "react";

const IMPACT = {
  high: { cls: "text-signal-stop", dot: "bg-signal-stop" },
  medium: { cls: "text-signal-watch", dot: "bg-signal-watch" },
  low: { cls: "text-signal-go", dot: "bg-signal-go" },
};

function Weather({ apiBase }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase}/api/weather`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Server responded ${res.status}`))))
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  if (error) return null;
  if (!data) return <div className="panel p-4 text-sm text-haze-500">Loading weather…</div>;

  if (!data.configured) {
    return (
      <div className="panel p-4">
        <p className="label mb-1">Weather</p>
        <p className="text-sm text-haze-300">{data.message}</p>
        <p className="text-xs text-haze-500 mt-1">
          Set <span className="font-mono">OPENWEATHER_API_KEY</span>, plus{" "}
          <span className="font-mono">STORE_LAT</span> and{" "}
          <span className="font-mono">STORE_LON</span> for your store.
        </p>
      </div>
    );
  }

  const impact = IMPACT[data.impact?.level] || IMPACT.low;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {data.icon && (
            <img
              src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
              alt=""
              width="56"
              height="56"
              className="shrink-0"
            />
          )}
          <div>
            <p className="text-3xl font-bold tabular-nums leading-none">{data.temp}°F</p>
            <p className="text-sm text-haze-300 capitalize mt-1">{data.description}</p>
            <p className="text-xs text-haze-500">
              {data.location} · feels {data.feelsLike}° · wind {data.windSpeed} mph
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 max-w-xs">
          <span className={`w-2 h-2 mt-1.5 shrink-0 ${impact.dot}`} />
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${impact.cls}`}>
              {data.impact?.level} cart impact
            </p>
            <p className="text-sm text-haze-300">{data.impact?.note}</p>
          </div>
        </div>
      </div>

      {data.stale && (
        <p className="text-xs text-signal-watch mt-2">
          Showing the last successful reading; the weather service is unreachable.
        </p>
      )}
    </div>
  );
}

export default Weather;
