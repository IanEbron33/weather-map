// ===== API Functions =====

export async function fetchWeatherData(lat, lon, tempUnit, windUnit) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    temperature_unit: tempUnit,
    wind_speed_unit: windUnit,
    timezone: 'auto',
    forecast_days: 7,
  });

  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error('Weather fetch failed');
  return resp.json();
}

export async function fetchAirQualityData(lat, lon) {
  try {
    const resp = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,uv_index&timezone=auto`
    );
    if (!resp.ok) return null;
    return resp.json();
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

export async function reverseGeocode(lat, lon) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
    );
    if (!resp.ok) return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const data = await resp.json();
    const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state || '';
    const country = data.address.country_code ? data.address.country_code.toUpperCase() : '';
    if (city) return country ? `${city}, ${country}` : city;
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

export async function fetchRainViewerData() {
  const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json');
  const data = await resp.json();
  return data.radar.past.concat(data.radar.nowcast || []);
}
