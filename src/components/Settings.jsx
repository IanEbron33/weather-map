export default function Settings({ tempUnit, windUnit, onSetTempUnit, onSetWindUnit }) {
  return (
    <div
      className="px-6 py-4 mt-auto flex-shrink-0 max-md:px-4 max-md:py-3.5 sidebar-safe-bottom"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {/* Temperature unit */}
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span>Temperature Unit</span>
        <div
          className="flex overflow-hidden rounded-lg"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => onSetTempUnit('celsius')}
            className="px-3.5 py-1.5 text-[13px] font-semibold transition-all max-md:px-4 max-md:py-2 max-md:text-sm"
            style={{
              background: tempUnit === 'celsius' ? 'var(--accent)' : 'transparent',
              color: tempUnit === 'celsius' ? '#fff' : 'inherit',
            }}
          >
            °C
          </button>
          <button
            onClick={() => onSetTempUnit('fahrenheit')}
            className="px-3.5 py-1.5 text-[13px] font-semibold transition-all max-md:px-4 max-md:py-2 max-md:text-sm"
            style={{
              background: tempUnit === 'fahrenheit' ? 'var(--accent)' : 'transparent',
              color: tempUnit === 'fahrenheit' ? '#fff' : 'inherit',
            }}
          >
            °F
          </button>
        </div>
      </div>

      {/* Wind unit */}
      <div className="flex items-center justify-between text-sm mt-2.5" style={{ color: 'var(--text-secondary)' }}>
        <span>Wind Speed</span>
        <div
          className="flex overflow-hidden rounded-lg"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => onSetWindUnit('kmh')}
            className="px-3.5 py-1.5 text-[13px] font-semibold transition-all max-md:px-4 max-md:py-2 max-md:text-sm"
            style={{
              background: windUnit === 'kmh' ? 'var(--accent)' : 'transparent',
              color: windUnit === 'kmh' ? '#fff' : 'inherit',
            }}
          >
            km/h
          </button>
          <button
            onClick={() => onSetWindUnit('mph')}
            className="px-3.5 py-1.5 text-[13px] font-semibold transition-all max-md:px-4 max-md:py-2 max-md:text-sm"
            style={{
              background: windUnit === 'mph' ? 'var(--accent)' : 'transparent',
              color: windUnit === 'mph' ? '#fff' : 'inherit',
            }}
          >
            mph
          </button>
        </div>
      </div>
    </div>
  );
}
