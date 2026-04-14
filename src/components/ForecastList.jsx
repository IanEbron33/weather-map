import { useMemo } from 'react';
import { getWeatherInfo, getTempColor } from '../utils/weatherCodes';

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
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        📅 7-Day Forecast
      </h3>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 py-2.5 px-3.5 rounded-lg transition-colors max-md:gap-2 max-md:py-2.5 max-md:px-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          >
            <span className="text-[13px] font-semibold w-12 flex-shrink-0 max-md:w-10 max-md:text-xs">
              {item.dayName}
            </span>
            <span className="text-2xl w-9 text-center flex-shrink-0 max-md:text-xl max-md:w-7">
              {item.icon}
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
