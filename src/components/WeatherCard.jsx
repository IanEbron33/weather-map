import { useMemo } from 'react';
import { getWeatherInfo, getTempColor } from '../utils/weatherCodes';
import WeatherAnimation from './WeatherAnimation';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle } from 'lucide-react';

const WeatherIcons = { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle };

export default function WeatherCard({
  weatherData, currentLocation, tempUnit, windUnit,
  isFavorite, onToggleFavorite, onShareLocation,
}) {
  // ALL hooks must be called unconditionally before any early return
  const unitSym = tempUnit === 'celsius' ? '°C' : '°F';
  const wUnit = windUnit === 'kmh' ? 'km/h' : 'mph';

  const w = useMemo(
    () => weatherData ? getWeatherInfo(weatherData.current.weather_code, weatherData.current.is_day) : null,
    [weatherData]
  );
  const tempColor = useMemo(
    () => weatherData ? getTempColor(weatherData.current.temperature_2m, tempUnit) : null,
    [weatherData, tempUnit]
  );
  const sunrise = useMemo(() => {
    if (!weatherData?.daily?.sunrise?.[0]) return '--:--';
    return new Date(weatherData.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }, [weatherData]);
  const sunset = useMemo(() => {
    if (!weatherData?.daily?.sunset?.[0]) return '--:--';
    return new Date(weatherData.daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }, [weatherData]);
  
  const currentVisibility = useMemo(() => {
  if (!weatherData) return null;
  const hourly = weatherData.hourly;
  const now = new Date();
  let idx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]) >= now) { idx = i; break; }
  }
  const vis = hourly.visibility?.[idx];
  if (vis == null) return '—';
  // API returns metres; convert to km
  return `${(vis / 1000).toFixed(1)} km`;
}, [weatherData]);

  // Early return is now AFTER all hooks
  if (!weatherData) return null;

  const c = weatherData.current;

  return (
    <div
      className="mx-6 mb-4 rounded-2xl relative overflow-hidden max-md:mx-4 max-md:mb-3"
      style={{
        border: '1px solid var(--border)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <WeatherAnimation code={c.weather_code} isDay={c.is_day} />

      <div className="relative z-[1] p-6 max-md:p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight max-md:text-lg">
                {currentLocation.city || '—'}
              </h2>
              <button
                onClick={onToggleFavorite}
                className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-all max-md:w-9 max-md:h-9"
                style={{ color: isFavorite ? '#fbbf24' : 'var(--text-muted)' }}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? '#fbbf24' : 'none'} stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </button>
              <button
                onClick={onShareLocation}
                className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-all max-md:w-9 max-md:h-9"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-hover)';
                  e.currentTarget.style.background = 'var(--accent-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Share location"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
                  <polyline points="16,6 12,2 8,6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
            <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {w.desc}
            </p>
          </div>
          <div className="text-[52px] leading-none max-md:text-[44px]">
            {w && w.icon && WeatherIcons[w.icon] ? (
              (() => {
                const IconComp = WeatherIcons[w.icon];
                return <IconComp size={52} strokeWidth={1.5} />;
              })()
            ) : null}
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-5xl font-extrabold tracking-tight max-md:text-[42px]" style={{ color: tempColor }}>
            {Math.round(c.temperature_2m)}{unitSym}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Feels like {Math.round(c.apparent_temperature)}{unitSym}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 max-md:gap-2">
          {[
            { label: 'Humidity', value: `${c.relative_humidity_2m}%` },
            { label: 'Wind', value: `${c.wind_speed_10m} ${wUnit}` },
            { label: 'Pressure', value: `${Math.round(c.surface_pressure)} hPa` },
            { label: 'Visibility', value: currentVisibility ?? '—' },
            { label: 'Sunrise', value: sunrise },
            { label: 'Sunset', value: sunset },
          ].map((d) => (
            <div
              key={d.label}
              className="flex flex-col gap-1 p-2.5 rounded-lg max-md:p-2"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
              <span className="text-[15px] font-semibold max-md:text-sm">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}