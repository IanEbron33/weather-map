import { useMemo } from 'react';
import { getWeatherInfo } from '../utils/weatherCodes';
import { getWeatherIconAsset } from '../utils/weatherIconAssets';

export default function ForecastList({ weatherData }) {
  if (!weatherData) return null;

  const items = useMemo(() => {
    const d = weatherData.daily;
    const result = [];

    for (let i = 0; i < d.time.length && i < 7; i++) {
      const date = new Date(`${d.time[i]}T12:00:00`);
      const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const w = getWeatherInfo(d.weather_code[i], true);

      result.push({
        key: d.time[i],
        dayName,
        iconSrc: getWeatherIconAsset(w.icon),
        desc: w.desc,
        highTemp: Math.round(d.temperature_2m_max[i]),
        lowTemp: Math.round(d.temperature_2m_min[i]),
      });
    }

    return result;
  }, [weatherData]);

  return (
    <section className="px-5 pb-4 max-md:px-4 max-md:pb-4">
      <h2
        className="mb-3 text-lg font-extrabold leading-none max-md:text-lg"
        style={{ color: '#3f2a18', letterSpacing: '0' }}
      >
        7-Day Forecast
      </h2>

      <div className="flex flex-col gap-2.5 max-md:gap-2">
        {items.map((item) => (
          <article
            key={item.key}
            className="grid min-h-[50px] grid-cols-[58px_34px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] px-3.5 py-2 max-md:min-h-[46px] max-md:grid-cols-[52px_30px_minmax(0,1fr)_auto] max-md:gap-2 max-md:rounded-[13px] max-md:px-3 max-md:py-2"
            style={{
              background: 'rgba(255, 252, 245, 0.96)',
              boxShadow: '0 6px 14px rgba(96, 58, 31, 0.1)',
            }}
          >
            <span className="text-[17px] font-extrabold max-md:text-[18px]" style={{ color: '#4d2d1c' }}>
              {item.dayName}
            </span>

            <img
              src={item.iconSrc}
              alt={item.desc}
              className="h-[42px] w-[42px] object-contain max-md:h-[42px] max-md:w-[42px]"
              style={{ transform: 'scale(1.22)' }}
              loading="lazy"
              draggable="false"
            />

            <span
              className="truncate text-[15px] font-semibold capitalize max-md:text-[17px]"
              style={{ color: '#4d2d1c' }}
              title={item.desc}
            >
              {item.desc}
            </span>

            <div className="flex items-baseline gap-1.5 text-[16px] font-extrabold max-md:text-[17px]">
              <span style={{ color: '#bd7a53' }}>{item.highTemp}°</span>
              <span style={{ color: '#4d2d1c' }}>{item.lowTemp}°</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
