export default function MapLayers({ currentLayerType, onSetLayerType }) {
  const layers = [
    { id: 'none', icon: '🗺️', label: 'Map Only' },
    { id: 'radar', icon: '🌧️', label: 'Precipitation Radar' },
    { id: 'satellite', icon: '🛰️', label: 'Satellite View' },
  ];

  return (
    <div className="px-6 pb-4 max-md:px-4 max-md:pb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        Radar &amp; Satellite
      </h3>
      <div className="flex flex-col gap-1.5">
        {layers.map((layer) => {
          const isActive = currentLayerType === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => onSetLayerType(layer.id)}
              className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg text-sm font-medium transition-all max-md:py-3 max-md:px-3.5"
              style={{
                background: isActive ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,0.04)'}`,
                color: isActive ? 'var(--accent-hover)' : 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              <span className="text-base">{layer.icon}</span>
              {layer.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
