import { getAqiInfo } from '../utils/weatherCodes';

export default function AirQuality({ aqiData }) {
  if (!aqiData || !aqiData.current) return null;

  const c = aqiData.current;
  const aqi = c.us_aqi ?? 0;
  const info = getAqiInfo(aqi);
  const aqiColor = (() => {
    if (aqi <= 50) return '#7c8a45';
    if (aqi <= 100) return '#d49626';
    if (aqi <= 150) return '#d08a55';
    if (aqi <= 200) return '#dc2626';
    if (aqi <= 300) return '#7c3aed';
    return '#450a0a';
  })();
  const ringValue = Math.min(Math.max(aqi / 300, 0), 1) * 100;

  return (
    <div
      className="mx-6 mb-4 p-4 rounded-2xl max-md:mx-4 max-md:mb-3 max-md:p-3.5"
      style={{
        background: 'rgba(255, 249, 239, 0.96)',
        border: '1px solid #450a0a',
        boxShadow: '0 10px 28px rgba(107, 69, 40, 0.08)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <h3 className="text-md font-extrabold uppercase tracking-wide mb-4" style={{ color: '#3f2a18' }}>
        Air Quality
      </h3>

      <div className="flex items-center gap-5 mb-4 max-md:gap-4">
        <div
          className="w-[74px] h-[74px] rounded-full flex items-center justify-center flex-shrink-0 max-md:w-[68px] max-md:h-[68px]"
          style={{
            background: `conic-gradient(${aqiColor} ${ringValue}%, rgba(201, 120, 47, 0.18) 0)`,
          }}
        >
          <div
            className="w-[58px] h-[58px] rounded-full flex flex-col items-center justify-center max-md:w-[52px] max-md:h-[52px]"
            style={{ background: '#fff8eb', color: '#3f2a18' }}
          >
            <span className="text-xl font-extrabold leading-none max-md:text-lg">{Math.round(aqi)}</span>
            <span className="text-[12px] font-bold mt-0.5">AQI</span>
          </div>
        </div>

        <div className="min-w-0 text-[16px] font-extrabold leading-snug max-md:text-md" style={{ color: '#3f2a18' }}>
          {info.label}
          <small className="block font-bold text-sm mt-1" style={{ color: '#6f5536' }}>
            {info.desc}
          </small>
        </div>
      </div>

      <div className="grid grid-cols-3">
        {[
          { label: 'PM2.5', value: c.pm2_5 != null ? `${c.pm2_5.toFixed(1)} ug/m3` : '-' },
          { label: 'PM10', value: c.pm10 != null ? `${c.pm10.toFixed(1)} ug/m3` : '-' },
          { label: 'UV Index', value: c.uv_index != null ? c.uv_index.toFixed(1) : '-' },
        ].map((d, index) => (
          <div
            key={d.label}
            className="px-3 py-1.5 text-left max-md:px-2"
            style={{
              borderLeft: index === 0 ? 'none' : '1px solid rgba(185, 151, 91, 0.34)',
            }}
          >
            <span className="text-[15px] block mb-1 font-extrabold" style={{ color: '#6f5536' }}>{d.label}</span>
            <span className="text-[14px] font-semibold max-md:text-[13px]" style={{ color: '#3f2a18' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
