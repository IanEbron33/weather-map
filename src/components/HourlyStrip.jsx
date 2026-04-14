import { useMemo } from 'react';
import { getWeatherInfo, getTempColor } from '../utils/weatherCodes';

export default function HourlyStrip({ weatherData, tempUnit }) {
  if (!weatherData) return null;

  const items = useMemo(() => {
    const hourly = weatherData.hourly;
    const now = new Date();
    let startIdx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]) >= now) { startIdx = i; break; }
    }

    const unitSym = '°';
    const result = [];
    for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
      const d = new Date(hourly.time[i]);
      const hour = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      const w = getWeatherInfo(hourly.weather_code[i], hourly.is_day[i]);
      const precip = hourly.precipitation_probability[i];

      result.push({
        key: i,
        time: i === startIdx ? 'Now' : hour,
        icon: w.icon,
        temp: Math.round(hourly.temperature_2m[i]),
        tempColor: getTempColor(hourly.temperature_2m[i], tempUnit),
        unitSym,
        precip,
      });
    }
    return result;
  }, [weatherData, tempUnit]);

  return (
    <div className="px-6 pb-4 max-md:px-4 max-md:pb-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-max">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex flex-col items-center gap-1 py-2 px-2.5 rounded-lg min-w-[58px] transition-colors max-md:min-w-[54px] max-md:py-1.5 max-md:px-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            >
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {item.time}
              </span>
              <span className="text-lg">{item.icon}</span>
              <span className="text-[13px] font-semibold" style={{ color: item.tempColor }}>
                {item.temp}{item.unitSym}
              </span>
              {item.precip > 0 && (
                <span className="text-[10px]" style={{ color: '#60a5fa' }}>
                  💧{item.precip}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
