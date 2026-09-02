const express = require('express');
const router = express.Router();

const API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = process.env.STORE_LAT || '42.1667';
const LON = process.env.STORE_LON || '-87.9600';
const CACHE_MS = 10 * 60 * 1000;

let cache = null;

// Rain and cold visibly change how fast corrals fill, so weather is context for
// the counts rather than decoration.
function cartImpact({ main, temp, windSpeed }) {
  if (['Rain', 'Drizzle', 'Thunderstorm'].includes(main)) {
    return { level: 'high', note: 'Rain: shoppers abandon carts closer to the doors' };
  }
  if (main === 'Snow' || temp <= 20) {
    return { level: 'high', note: 'Cold: expect carts left short of the corrals' };
  }
  if (windSpeed >= 20) {
    return { level: 'medium', note: 'High wind: loose carts drift, check the lot edges' };
  }
  if (temp >= 85) {
    return { level: 'medium', note: 'Heat: corrals fill faster near the entrance' };
  }
  return { level: 'low', note: 'Clear conditions, normal cart flow' };
}

router.get('/', async (req, res) => {
  // The key stays server side. Proxying also lets one cached call serve every
  // client instead of each browser hitting OpenWeather directly.
  if (!API_KEY) {
    return res.json({
      configured: false,
      message: 'Set OPENWEATHER_API_KEY in .env to enable weather.',
    });
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return res.json({ ...cache.data, cached: true });
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${LAT}&lon=${LON}&units=imperial&appid=${API_KEY}`;

    const upstream = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!upstream.ok) throw new Error(`OpenWeather responded ${upstream.status}`);

    const raw = await upstream.json();
    const data = {
      configured: true,
      location: raw.name,
      temp: Math.round(raw.main.temp),
      feelsLike: Math.round(raw.main.feels_like),
      main: raw.weather?.[0]?.main,
      description: raw.weather?.[0]?.description,
      icon: raw.weather?.[0]?.icon,
      windSpeed: Math.round(raw.wind?.speed ?? 0),
      humidity: raw.main.humidity,
      observedAt: new Date(raw.dt * 1000).toISOString(),
    };
    data.impact = cartImpact(data);

    cache = { at: Date.now(), data };
    res.json(data);
  } catch (err) {
    console.error('Weather lookup failed:', err.message);
    // A stale reading beats an empty panel, so the last good value is served
    // with its age rather than dropped.
    if (cache) {
      return res.json({ ...cache.data, cached: true, stale: true });
    }
    res.status(503).json({ configured: true, error: 'Weather unavailable' });
  }
});

module.exports = router;
