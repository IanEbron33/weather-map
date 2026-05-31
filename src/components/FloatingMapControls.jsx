import { useState, useRef, useEffect } from 'react';
import { Layers, CloudDrizzle, Satellite, Wind, Thermometer, Map, Tornado, Activity } from 'lucide-react';

export default function FloatingMapControls({
  currentLayerType,
  onSetLayerType,
  showTyphoonLayer,
  onToggleTyphoonLayer,
  tempUnit,
  onSetTempUnit,
  windUnit,
  onSetWindUnit,
  showWindParticles,
  setShowWindParticles
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const layers = [
    { id: 'none', icon: <Map size={16} />, label: 'Map Only' },
    { id: 'radar', icon: <CloudDrizzle size={16} />, label: 'Rain Radar' },
    { id: 'wind', icon: <Wind size={16} />, label: 'Wind' },
    { id: 'temp', icon: <Thermometer size={16} />, label: 'Temperature' },
    { id: 'satellite', icon: <Satellite size={16} />, label: 'Satellite' },
  ];

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
      className="fixed z-[1001] flex items-start gap-2 transition-all duration-300 max-md:hidden"
      style={{ top: '24px', right: '24px' }}
    >
      <div
        className={`flex flex-col gap-1 transition-all duration-300 origin-top-right overflow-hidden ${isOpen ? 'opacity-100 scale-100 w-[200px] h-auto p-3 pointer-events-auto' : 'opacity-0 scale-95 w-0 h-0 p-0 pointer-events-none'}`}
        style={{
          background: 'rgba(91, 57, 35, 0.97)',
          border: isOpen ? '1px solid rgba(185, 151, 91, 0.42)' : 'none',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(59,36,19,0.28)',
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider mb-2 ml-1" style={{ color: '#f3e7c8' }}>
          Map Layers
        </span>

        {layers.map((layer) => {
          const isActive = currentLayerType === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => {
                onSetLayerType(layer.id);
                setTimeout(() => setIsOpen(false), 200);
              }}
              className="flex items-center gap-3 py-2 px-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isActive ? 'rgba(231, 214, 173, 0.12)' : 'transparent',
                color: isActive ? '#fff8e8' : '#f3e7c8',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ color: isActive ? '#f8f1e5' : 'inherit' }}>{layer.icon}</span>
              {layer.label}
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full" style={{ background: '#e7d7b4' }} />
              )}
            </button>
          );
        })}

        <div className="my-1 border-t" style={{ borderColor: 'rgba(185, 151, 91, 0.35)' }} />

        <button
          onClick={() => {
            setShowWindParticles(!showWindParticles);
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="flex items-center gap-3 py-2 px-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: showWindParticles ? 'rgba(231, 214, 173, 0.12)' : 'transparent',
            color: showWindParticles ? '#fff8e8' : '#f3e7c8',
          }}
          onMouseEnter={(e) => {
            if (!showWindParticles) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            if (!showWindParticles) e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={{ color: showWindParticles ? '#f8f1e5' : 'inherit' }}><Activity size={16} /></span>
          Wind Particles
          {showWindParticles && (
            <div className="ml-auto w-2 h-2 rounded-full" style={{ background: '#e7d7b4' }} />
          )}
        </button>

        <div className="w-full h-[1px] my-2" style={{ background: 'rgba(185, 151, 91, 0.35)' }} />

        <button
          onClick={onToggleTyphoonLayer}
          className="flex items-center justify-between py-2 px-3 rounded-xl text-sm font-medium transition-all w-full"
          style={{ background: showTyphoonLayer ? 'rgba(231, 214, 173, 0.12)' : 'transparent' }}
          onMouseEnter={(e) => {
            if (!showTyphoonLayer) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            if (!showTyphoonLayer) e.currentTarget.style.background = 'transparent';
          }}
        >
          <div className="flex items-center gap-3" style={{ color: showTyphoonLayer ? '#fff8e8' : '#f3e7c8' }}>
            <Tornado size={16} />
            Typhoons
          </div>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${showTyphoonLayer ? 'bg-[#e7d7b4]' : 'bg-[#3f2a18]'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-[#fff8e8] absolute top-[3px] transition-all ${showTyphoonLayer ? 'left-5' : 'left-1'}`} />
          </div>
        </button>

        <div className="w-full h-[1px] my-2" style={{ background: 'rgba(185, 151, 91, 0.35)' }} />

        <span className="text-xs font-semibold uppercase tracking-wider mb-2 ml-1" style={{ color: '#f3e7c8' }}>
          Units
        </span>

        <div className="flex flex-col gap-2 px-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: '#e7d7b4' }}>Temp</span>
            <div className="flex rounded-lg overflow-hidden border border-[rgba(185,151,91,0.35)] bg-[rgba(255,255,255,0.08)]">
              <button
                onClick={() => onSetTempUnit('celsius')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${tempUnit === 'celsius' ? 'bg-[#e7d7b4] text-[#4b2f1d]' : 'text-[#f3e7c8]'}`}
              >
                Â°C
              </button>
              <button
                onClick={() => onSetTempUnit('fahrenheit')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${tempUnit === 'fahrenheit' ? 'bg-[#e7d7b4] text-[#4b2f1d]' : 'text-[#f3e7c8]'}`}
              >
                Â°F
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: '#e7d7b4' }}>Wind</span>
            <div className="flex rounded-lg overflow-hidden border border-[rgba(185,151,91,0.35)] bg-[rgba(255,255,255,0.08)]">
              <button
                onClick={() => onSetWindUnit('kmh')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${windUnit === 'kmh' ? 'bg-[#e7d7b4] text-[#4b2f1d]' : 'text-[#f3e7c8]'}`}
              >
                km/h
              </button>
              <button
                onClick={() => onSetWindUnit('mph')}
                className={`px-2 py-1 text-[11px] font-bold transition-all ${windUnit === 'mph' ? 'bg-[#e7d7b4] text-[#4b2f1d]' : 'text-[#f3e7c8]'}`}
              >
                mph
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-md active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #5e3b25 0%, #7a5535 100%)',
          border: '1px solid rgba(185,151,91,0.5)',
          color: '#fff8e8',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'linear-gradient(135deg, #6b4528 0%, #8a603c 100%)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'linear-gradient(135deg, #5e3b25 0%, #7a5535 100%)';
        }}
      >
        <Layers size={20} />
      </button>
    </div>
  );
}
