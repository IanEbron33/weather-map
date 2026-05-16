// ===== API Functions =====
const apiCache = new Map();
const temperatureLabelCache = new Map();
const temperatureLabelPending = new Map();

async function fetchWithCache(url, cacheTimeMs = 300000) { // 5 minutes cache
  if (apiCache.has(url)) {
    const { data, timestamp } = apiCache.get(url);
    if (Date.now() - timestamp < cacheTimeMs) {
      return data;
    }
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed');
  const data = await resp.json();
  apiCache.set(url, { data, timestamp: Date.now() });
  return data;
}

export async function fetchWeatherData(lat, lon, tempUnit, windUnit) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day,visibility',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    temperature_unit: tempUnit,
    wind_speed_unit: windUnit,
    timezone: 'auto',
    forecast_days: 7,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  try {
    return await fetchWithCache(url);
  } catch (err) {
    throw new Error('Weather fetch failed');
  }
}

export async function fetchAirQualityData(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,uv_index&timezone=auto`;
    return await fetchWithCache(url);
  } catch {
    return null;
  }
}

export async function searchCities(query) {
  const resp = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
  );
  if (!resp.ok) throw new Error('Search failed');
  const data = await resp.json();
  return data.results || [];
}

// In-memory cache: key = "lat,lon" rounded to 2dp, value = city name string
// Nominatim's policy asks for max 1 req/sec and encourages caching.
// Rounding to 2dp (~1.1km precision) means nearby clicks reuse the same result.
const geocodeCache = new Map();

export async function reverseGeocode(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
    );
    if (!resp.ok) return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const data = await resp.json();
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county ||
      data.address.state ||
      '';
    const country = data.address.country_code
      ? data.address.country_code.toUpperCase()
      : '';
    const result = city
      ? country ? `${city}, ${country}` : city
      : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

    geocodeCache.set(key, result);
    return result;
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

export async function fetchRainViewerData() {
  const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
  const data = await resp.json();
  return data.radar.past.concat(data.radar.nowcast || []);
}

async function fetchTemperatureLabel(point, tempUnit) {
  const cacheKey = `${point.id}:${tempUnit}`;
  const cached = temperatureLabelCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 900000) {
    return cached.data;
  }

  if (temperatureLabelPending.has(cacheKey)) {
    return temperatureLabelPending.get(cacheKey);
  }

  const params = new URLSearchParams({
    latitude: point.lat,
    longitude: point.lon,
    current: 'temperature_2m',
    temperature_unit: tempUnit,
    timezone: 'auto',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const pending = fetchWithCache(url, 900000).then((data) => {
    const temperature = data?.current?.temperature_2m;
    if (typeof temperature !== 'number') {
      throw new Error(`Temperature unavailable for ${point.id}`);
    }

    const labelData = {
      ...point,
      temperature,
      unit: tempUnit,
      fetchedAt: Date.now(),
    };

    temperatureLabelCache.set(cacheKey, { data: labelData, timestamp: Date.now() });
    return labelData;
  }).finally(() => {
    temperatureLabelPending.delete(cacheKey);
  });

  temperatureLabelPending.set(cacheKey, pending);
  return pending;
}

export async function fetchTemperatureLabels(points, tempUnit, concurrency = 4) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < points.length) {
      const point = points[nextIndex++];
      try {
        results.push(await fetchTemperatureLabel(point, tempUnit));
      } catch (err) {
        console.warn('Temperature label fetch failed:', point.id, err);
      }
    }
  }

  const workerCount = Math.min(concurrency, points.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export function getCachedTemperatureLabels(points, tempUnit) {
  return points
    .map((point) => {
      const cached = temperatureLabelCache.get(`${point.id}:${tempUnit}`);
      return cached && Date.now() - cached.timestamp < 900000 ? cached.data : null;
    })
    .filter(Boolean);
}
