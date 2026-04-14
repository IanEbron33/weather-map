import { getAqiInfo } from '../utils/weatherCodes';

export default function AirQuality({ aqiData }) {
  if (!aqiData || !aqiData.current) return null;

  const c = aqiData.current;
  const aqi = c.us_aqi ?? 0;
  const info = getAqiInfo(aqi);

  return (
    <div
      className="mx-6 mb-4 p-4 rounded-2xl max-md:mx-4 max-md:mb-3 max-md:p-3.5"
      style={{
        background: 'var(--gradient-card)',
        border: '1px solid var(--border)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        🌿 Air Quality
      </h3>

      {/* AQI badge + status */}
      <div className="flex items-center gap-4 mb-3.5">
        <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center font-bold flex-shrink-0 transition-colors max-md:w-14 max-md:h-14 ${info.cls}`}>
          <span className="text-xl leading-none max-md:text-lg">{Math.round(aqi)}</span>
          <span className="text-[10px] opacity-80 mt-0.5">AQI</span>
        </div>
        <div className="text-sm font-semibold leading-relaxed">
          {info.label}
          <small className="block font-normal text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {info.desc}
          </small>
        </div>
      </div>

      {/* Detail values */}
      <div className="flex gap-3 max-md:gap-2">
        {[
          { label: 'PM2.5', value: c.pm2_5 != null ? `${c.pm2_5.toFixed(1)} µg/m³` : '—' },
          { label: 'PM10', value: c.pm10 != null ? `${c.pm10.toFixed(1)} µg/m³` : '—' },
          { label: '☀️ UV Index', value: c.uv_index != null ? c.uv_index.toFixed(1) : '—' },
        ].map((d) => (
          <div
            key={d.label}
            className="flex-1 p-2 rounded-lg text-center max-md:p-1.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
            <span className="text-[15px] font-semibold max-md:text-[13px]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
