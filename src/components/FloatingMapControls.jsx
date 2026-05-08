import { useState, useRef, useEffect } from 'react';
import { Layers, CloudRain, Satellite, Wind, Thermometer, Map, Tornado } from 'lucide-react';

export default function FloatingMapControls({ 
  currentLayerType, 
  onSetLayerType, 
  showTyphoonLayer, 
  onToggleTyphoonLayer,
  tempUnit,
  onSetTempUnit,
  windUnit,
  onSetWindUnit
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const layers = [
    { id: 'none', icon: <Map size={16} />, label: 'Map Only' },
    { id: 'radar', icon: <CloudRain size={16} />, label: 'Radar' },
    { id: 'wind', icon: <Wind size={16} />, label: 'Wind' },
    { id: 'temp', icon: <Thermometer size={16} />, label: 'Temperature' },
    { id: 'satellite', icon: <Satellite size={16} />, label: 'Satellite' },
  ];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed z-[1001] flex items-start gap-2 transition-all duration-300 max-md:top-20 max-md:right-4"
      style={{ top: '24px', right: '24px' }}
    >
      {/* Pop-out Menu */}
      <div 
        className={`flex flex-col gap-1 transition-all duration-300 origin-top-right overflow-hidden ${
          isOpen ? 'opacity-100 scale-100 w-[200px] h-auto p-3 pointer-events-auto' : 'opacity-0 scale-95 w-0 h-0 p-0 pointer-events-none'
        }`}
        style={{
          background: 'var(--bg-card)',
          border: isOpen ? '1px solid var(--border)' : 'none',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>
          Map Layers
        </span>

        {layers.map((layer) => {
          const isActive = currentLayerType === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => onSetLayerType(layer.id)}
              className="flex items-center gap-3 py-2 px-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: isActive ? 'var(--accent)' : 'inherit' }}>{layer.icon}</span>
              {layer.label}
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          );
        })}

        <div className="w-full h-[1px] my-2" style={{ background: 'var(--border)' }} />

        {/* Typhoon Tracker Toggle */}
        <button
          onClick={onToggleTyphoonLayer}
          className="flex items-center justify-between py-2 px-3 rounded-xl text-sm font-medium transition-all w-full"
          style={{ background: showTyphoonLayer ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}
          onMouseEnter={(e) => {
            if (!showTyphoonLayer) e.currentTarget.style.background = 'var(--bg-card-hover)';
          }}
          onMouseLeave={(e) => {
            if (!showTyphoonLayer) e.currentTarget.style.background = 'transparent';
          }}
        >
          <div className="flex items-center gap-3" style={{ color: showTyphoonLayer ? '#ef4444' : 'var(--text-secondary)' }}>
            <Tornado size={16} />
            Typhoons
          </div>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${showTyphoonLayer ? 'bg-red-500' : 'bg-gray-600'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${showTyphoonLayer ? 'left-5' : 'left-1'}`} />
          </div>
        </button>

        <div className="w-full h-[1px] my-2" style={{ background: 'var(--border)' }} />

        {/* Units Section */}
        <span className="text-xs font-semibold uppercase tracking-wider mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>
          Units
        </span>
        
        <div className="flex flex-col gap-2 px-1">
          {/* Temp Unit */}
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Temp</span>
            <div className="flex rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-input)]">
              <button
                onClick={() => onSetTempUnit('celsius')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${tempUnit === 'celsius' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}
              >°C</button>
              <button
                onClick={() => onSetTempUnit('fahrenheit')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${tempUnit === 'fahrenheit' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}
              >°F</button>
            </div>
          </div>

          {/* Wind Unit */}
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Wind</span>
            <div className="flex rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-input)]">
              <button
                onClick={() => onSetWindUnit('kmh')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${windUnit === 'kmh' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}
              >km/h</button>
              <button
                onClick={() => onSetWindUnit('mph')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${windUnit === 'mph' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}
              >mph</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-md active:scale-95"
        style={{
          background: isOpen ? 'var(--accent-primary)' : 'var(--bg-card)',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
          color: isOpen ? 'white' : 'var(--text-primary)',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'var(--bg-card-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'var(--bg-card)';
        }}
      >
        <Layers size={20} />
      </button>

    </div>
  );
}
