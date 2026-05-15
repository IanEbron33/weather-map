import { useMemo } from 'react';
import { getWeatherInfo } from '../utils/weatherCodes';
import { getWeatherIconAsset } from '../utils/weatherIconAssets';

export default function HourlyStrip({ weatherData }) {
  if (!weatherData) return null;

  const items = useMemo(() => {
    const hourly = weatherData.hourly;
    const now = new Date();
    let startIdx = 0;

    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]) >= now) {
        startIdx = i;
        break;
      }
    }

    const result = [];
    for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
      const d = new Date(hourly.time[i]);
      const hour = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      const w = getWeatherInfo(hourly.weather_code[i], hourly.is_day[i]);
      const precip = hourly.precipitation_probability[i] ?? 0;

      result.push({
        key: i,
        time: i === startIdx ? 'Now' : hour,
        desc: w.desc,
        iconSrc: getWeatherIconAsset(w.icon),
        temp: Math.round(hourly.temperature_2m[i]),
        precip,
      });
    }

    return result;
  }, [weatherData]);

  return (
    <section className="px-6 pb-5 max-md:px-4 max-md:pb-4">
      <h2
        className="mb-3 text-lg font-extrabold leading-none max-md:text-[18px]"
        style={{ color: '#3f2a18', letterSpacing: '0' }}
      >
        Hourly Forecast
      </h2>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2.5 max-md:gap-2">
          {items.map((item) => (
            <article
              key={item.key}
              className="flex h-[114px] min-w-[74px] flex-col items-center justify-between rounded-[12px] px-2.5 py-3 max-md:h-[110px] max-md:min-w-[74px] max-md:rounded-[12px] max-md:px-2 max-md:py-2.5"
              style={{
                background: 'rgba(255, 252, 245, 0.96)',
                boxShadow: '0 8px 16px rgba(96, 58, 31, 0.12)',
              }}
            >
              <span className="text-[13px] font-extrabold max-md:text-[12px]" style={{ color: '#4d2d1c' }}>
                {item.time}
              </span>

              <img
                src={item.iconSrc}
                alt={item.desc}
                className="h-[40px] w-[40px] object-contain max-md:h-[40px] max-md:w-[40px]"
                style={{ transform: 'scale(1.18)' }}
                loading="lazy"
                draggable="false"
              />

              <div className="text-center">
                <div className="text-[18px] font-extrabold leading-none max-md:text-[18px]" style={{ color: '#bd7a53' }}>
                  {item.temp}°
                </div>
                <div className="mt-1 text-[11px] font-bold leading-none max-md:text-[11px]" style={{ color: '#4d2d1c' }}>
                  {item.precip}%
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
