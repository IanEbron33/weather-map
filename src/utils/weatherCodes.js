// ===== WMO Weather Code Mapping =====
export const WMO_CODES = {
  0:  { desc: 'Clear sky',              icon: 'Sun', night: 'Moon', type: 'sun' },
  1:  { desc: 'Mainly clear',           icon: 'CloudSun', night: 'CloudMoon', type: 'sun' },
  2:  { desc: 'Partly cloudy',          icon: 'Cloud',  night: 'Cloud', type: 'cloud' },
  3:  { desc: 'Overcast',               icon: 'Cloudy',  night: 'Cloudy', type: 'cloud' },
  45: { desc: 'Foggy',                  icon: 'CloudFog', night: 'CloudFog', type: 'cloud' },
  48: { desc: 'Rime fog',               icon: 'CloudFog', night: 'CloudFog', type: 'cloud' },
  51: { desc: 'Light drizzle',          icon: 'CloudDrizzle', night: 'CloudDrizzle', type: 'rain' },
  53: { desc: 'Moderate drizzle',       icon: 'CloudDrizzle', night: 'CloudDrizzle', type: 'rain' },
  55: { desc: 'Dense drizzle',          icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  56: { desc: 'Freezing drizzle',       icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  57: { desc: 'Dense freezing drizzle', icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  61: { desc: 'Slight rain',            icon: 'CloudDrizzle', night: 'CloudDrizzle', type: 'rain' },
  63: { desc: 'Moderate rain',          icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  65: { desc: 'Heavy rain',             icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  66: { desc: 'Light freezing rain',    icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  67: { desc: 'Heavy freezing rain',    icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  71: { desc: 'Slight snowfall',        icon: 'CloudSnow', night: 'CloudSnow', type: 'snow' },
  73: { desc: 'Moderate snowfall',      icon: 'CloudSnow', night: 'CloudSnow', type: 'snow' },
  75: { desc: 'Heavy snowfall',         icon: 'Snowflake',  night: 'Snowflake', type: 'snow' },
  77: { desc: 'Snow grains',            icon: 'Snowflake',  night: 'Snowflake', type: 'snow' },
  80: { desc: 'Slight rain showers',    icon: 'CloudDrizzle', night: 'CloudDrizzle', type: 'rain' },
  81: { desc: 'Moderate rain showers',  icon: 'CloudRain', night: 'CloudRain', type: 'rain' },
  82: { desc: 'Violent rain showers',   icon: 'CloudLightning', night: 'CloudLightning', type: 'storm' },
  85: { desc: 'Slight snow showers',    icon: 'CloudSnow', night: 'CloudSnow', type: 'snow' },
  86: { desc: 'Heavy snow showers',     icon: 'Snowflake',  night: 'Snowflake', type: 'snow' },
  95: { desc: 'Thunderstorm',           icon: 'CloudLightning', night: 'CloudLightning', type: 'storm' },
  96: { desc: 'Thunderstorm with hail', icon: 'CloudLightning', night: 'CloudLightning', type: 'storm' },
  99: { desc: 'Severe thunderstorm',    icon: 'CloudLightning', night: 'CloudLightning', type: 'storm' },
};

export function getWeatherInfo(code, isDay) {
  const info = WMO_CODES[code] || { desc: 'Unknown', icon: 'Thermometer', night: 'Thermometer', type: 'cloud' };
  return { desc: info.desc, icon: isDay ? info.icon : info.night, type: info.type };
}

export function getBackgroundImage(code, isDay) {
  const timeSfx = isDay ? 'day' : 'night';
  
  if (code === 0) return `/weather-image/clear-and-mainly/clear-sky-${timeSfx}.webp`;
  if (code === 1) return `/weather-image/clear-and-mainly/mainly-clear-${timeSfx}.webp`;
  if (code === 2) return `/weather-image/partly-overcast-foggy/partly-cloudy-${timeSfx}.webp`;
  if (code === 3) return `/weather-image/partly-overcast-foggy/overcast-${timeSfx}.webp`;
  if (code === 45 || code === 48) return `/weather-image/partly-overcast-foggy/foggy-${timeSfx}.webp`;
  
  // Snow Logic (Must be before general Rain/Storm checks to catch 85/86)
  if (code === 71 || code === 73 || code === 85) return '/weather-image/snow/slight-snow.webp';
  if (code === 75 || code === 77 || code === 86) return '/weather-image/snow/heavy-snowfall.webp';

  if (code >= 51 && code <= 61) return `/weather-image/drizzle-rain-lightning/drizzle-${timeSfx}.webp`;
  if (code >= 63 && code <= 81) return `/weather-image/drizzle-rain-lightning/rain-${timeSfx}.webp`;
  if (code >= 82 || code >= 95) return '/weather-image/drizzle-rain-lightning/thunderstorm-day-and-night.webp';
  
  return '';
}

// ===== AQI Levels =====
export function getAqiInfo(aqi) {
  if (aqi <= 50)  return { label: 'Good',                   desc: 'Air quality is satisfactory',      cls: 'aqi-good' };
  if (aqi <= 100) return { label: 'Moderate',               desc: 'Acceptable for most people',       cls: 'aqi-moderate' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', desc: 'Sensitive groups may be affected', cls: 'aqi-unhealthy-sg' };
  if (aqi <= 200) return { label: 'Unhealthy',              desc: 'Everyone may begin to feel effects', cls: 'aqi-unhealthy' };
  if (aqi <= 300) return { label: 'Very Unhealthy',         desc: 'Health alert: serious effects',    cls: 'aqi-very-unhealthy' };
  return { label: 'Hazardous', desc: 'Emergency conditions', cls: 'aqi-hazardous' };
}

// ===== Simple Temperature Color (for Leaflet popups etc.) =====
export function getTempColor(val, unit) {
  const tempC = unit === 'fahrenheit' ? (val - 32) * 5 / 9 : val;
  if (tempC <= 0)  return '#60a5fa';
  if (tempC <= 10) return '#38bdf8';
  if (tempC <= 18) return '#4ade80';
  if (tempC <= 26) return '#facc15';
  if (tempC <= 33) return '#fb923c';
  return '#f87171';
}

// ===== Temperature Gradient Style =====
export function getTempStyle(val, unit) {
  const tempC = unit === 'fahrenheit' ? (val - 32) * 5 / 9 : val;
  let grad;
  if (tempC <= 0)       grad = 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)';
  else if (tempC <= 10) grad = 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)';
  else if (tempC <= 18) grad = 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)';
  else if (tempC <= 26) grad = 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)';
  else if (tempC <= 33) grad = 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)';
  else                  grad = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';

  return {
    backgroundImage: grad,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    display: 'inline-block',
  };
}
