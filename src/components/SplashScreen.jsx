export default function SplashScreen({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="text-center" style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Icon */}
        <div className="relative inline-block mb-6">
          <div className="text-7xl relative z-[2]" style={{ animation: 'float 3s ease-in-out infinite' }}>
            ⛅
          </div>
          <div
            className="absolute top-1/2 left-1/2 w-[70px] h-[70px] rounded-full z-[1]"
            style={{
              background: 'var(--accent)',
              transform: 'translate(-50%, -50%)',
              filter: 'blur(20px)',
              animation: 'bgPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          <span className="brand-gradient">WeatherScope</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[15px] font-medium mb-8" style={{ color: 'var(--text-secondary)' }}>
          Loading weather data...
        </p>

        {/* Loader bar */}
        <div className="w-[220px] h-1 rounded mx-auto overflow-hidden relative" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
          <div
            className="absolute left-0 top-0 h-full rounded"
            style={{
              background: 'var(--gradient-brand)',
              animation: 'loaderSlide 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
