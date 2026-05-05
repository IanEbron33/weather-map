import { useMemo } from 'react';
import { getWeatherInfo, getTempColor } from '../utils/weatherCodes';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle } from 'lucide-react';

const WeatherIcons = { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle };
import { CalendarDays } from 'lucide-react';

export default function ForecastList({ weatherData, tempUnit }) {
  if (!weatherData) return null;

  const items = useMemo(() => {
    const d = weatherData.daily;
    const unitSym = '°';
    const result = [];
    for (let i = 0; i < d.time.length && i < 7; i++) {
      const date = new Date(d.time[i] + 'T12:00:00');
      const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const w = getWeatherInfo(d.weather_code[i], true);
      result.push({
        key: d.time[i],
        dayName,
        icon: w.icon,
        desc: w.desc,
        highTemp: Math.round(d.temperature_2m_max[i]),
        lowTemp: Math.round(d.temperature_2m_min[i]),
        highColor: getTempColor(d.temperature_2m_max[i], tempUnit),
        lowColor: getTempColor(d.temperature_2m_min[i], tempUnit),
        unitSym,
      });
    }
    return result;
  }, [weatherData, tempUnit]);

  return (
    <div className="px-6 pb-4 max-md:px-4 max-md:pb-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        <CalendarDays size={14} /> 7-Day Forecast
      </h3>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 py-2.5 px-3.5 rounded-lg transition-colors max-md:gap-2 max-md:py-2.5 max-md:px-3"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          >
            <span className="text-[13px] font-semibold w-12 flex-shrink-0 max-md:w-10 max-md:text-xs">
              {item.dayName}
            </span>
            <span className="flex justify-center w-9 flex-shrink-0 max-md:w-7 text-[var(--text-primary)]">
              {(() => {
                const IconComp = WeatherIcons[item.icon] || WeatherIcons.HelpCircle;
                return <IconComp size={24} strokeWidth={1.5} />;
              })()}
            </span>
            <span
              className="flex-1 text-[13px] capitalize whitespace-nowrap overflow-hidden text-ellipsis max-md:text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.desc}
            </span>
            <div className="flex gap-2 text-sm font-semibold flex-shrink-0 max-md:text-[13px]">
              <span style={{ color: item.highColor }}>{item.highTemp}{item.unitSym}</span>
              <span style={{ color: item.lowColor, opacity: 0.7 }}>{item.lowTemp}{item.unitSym}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
