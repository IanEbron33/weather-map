import { Map, CloudDrizzle, Wind, Thermometer, Satellite, Activity, Tornado, X } from 'lucide-react';
import Skeleton from './Skeleton';

const layers = [
  { id: 'none', icon: Map, label: 'Map Only' },
  { id: 'radar', icon: CloudDrizzle, label: 'Rain Radar' },
  { id: 'wind', icon: Wind, label: 'Wind' },
  { id: 'temp', icon: Thermometer, label: 'Temperature' },
  { id: 'satellite', icon: Satellite, label: 'Satellite' },
];

export default function MapLayerSheet({
  visible,
  onClose,
  currentLayerType,
  onSetLayerType,
  showTyphoonLayer,
  onToggleTyphoonLayer,
  tempUnit,
  onSetTempUnit,
  windUnit,
  onSetWindUnit,
  showWindParticles,
  setShowWindParticles,
  showSkeleton,
}) {
  const renderSkeleton = () => (
    <div className="map-layer-sheet-body">
      {/* Layer Type Skeleton Card */}
      <div className="map-layer-section animate-pulse">
        <span className="map-layer-section-title">Layer Type</span>
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <Skeleton width="32px" height="32px" borderRadius="10px" />
              <Skeleton width="50px" height="10px" />
            </div>
          ))}
        </div>
      </div>

      {/* Overlays Skeleton Card */}
      <div className="map-layer-section animate-pulse">
        <span className="map-layer-section-title">Overlays</span>
        <div className="flex flex-col gap-2 mt-1">
          {[1, 2].map(i => (
            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Skeleton width="18px" height="18px" borderRadius="50%" />
                <Skeleton width="80px" height="12px" />
              </div>
              <Skeleton width="40px" height="22px" borderRadius="11px" />
            </div>
          ))}
        </div>
      </div>

      {/* Units Skeleton Card */}
      <div className="map-layer-section animate-pulse">
        <span className="map-layer-section-title">Units</span>
        <div className="flex flex-col gap-2.5 mt-1">
          {[1, 2].map(i => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <Skeleton width="60px" height="12px" />
              <Skeleton width="100%" height="28px" borderRadius="8px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`map-layer-sheet-backdrop ${visible ? 'map-layer-backdrop-open' : 'map-layer-backdrop-closed'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={`map-layer-sheet ${visible ? 'map-layer-sheet-open' : 'map-layer-sheet-closed'}`}>
        {/* Drag handle */}
        <div className="map-layer-sheet-handle">
          <div className="map-layer-sheet-handle-bar" />
        </div>

        {/* Header */}
        <div className="map-layer-sheet-header">
          <h3>Map Layers</h3>
          <button
            onClick={onClose}
            className="map-layer-sheet-close"
          >
            <X size={16} />
          </button>
        </div>

        {showSkeleton ? (
          renderSkeleton()
        ) : (
          /* Layer options */
          <div className="map-layer-sheet-body">
            {/* Section 1: Layer Type */}
            <div className="map-layer-section">
              <span className="map-layer-section-title">Layer Type</span>
              <div className="map-layer-sheet-grid">
                {layers.map((layer) => {
                  const Icon = layer.icon;
                  const isActive = currentLayerType === layer.id;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => {
                        onSetLayerType(layer.id);
                      }}
                      className={`map-layer-sheet-option${isActive ? ' map-layer-sheet-option-active' : ''}`}
                    >
                      <div className="map-layer-sheet-option-icon">
                        <Icon size={22} />
                      </div>
                      <span>{layer.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Overlays */}
            <div className="map-layer-section">
              <span className="map-layer-section-title">Overlays</span>
              <div className="map-layer-sheet-toggles">
                {/* Wind Particles */}
                <button
                  onClick={() => setShowWindParticles(!showWindParticles)}
                  className="map-layer-sheet-toggle-row map-layer-sheet-toggle-card"
                >
                  <div className="map-layer-sheet-toggle-label">
                    <Activity size={18} />
                    <span>Wind Particles</span>
                  </div>
                  <div className={`map-layer-sheet-switch${showWindParticles ? ' map-layer-sheet-switch-on' : ''}`}>
                    <div className="map-layer-sheet-switch-thumb" />
                  </div>
                </button>

                {/* Typhoons */}
                <button
                  onClick={onToggleTyphoonLayer}
                  className="map-layer-sheet-toggle-row map-layer-sheet-toggle-card"
                >
                  <div className="map-layer-sheet-toggle-label">
                    <Tornado size={18} />
                    <span>Typhoons</span>
                  </div>
                  <div className={`map-layer-sheet-switch${showTyphoonLayer ? ' map-layer-sheet-switch-on' : ''}`}>
                    <div className="map-layer-sheet-switch-thumb" />
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: Units */}
            <div className="map-layer-section">
              <span className="map-layer-section-title">Units</span>
              <div className="map-layer-sheet-units">
                <div className="map-layer-sheet-unit-row map-layer-sheet-unit-card">
                  <span>Temperature</span>
                  <div className="map-layer-sheet-unit-toggle">
                    <button
                      onClick={() => onSetTempUnit('celsius')}
                      className={tempUnit === 'celsius' ? 'map-layer-sheet-unit-active' : ''}
                    >
                      °C
                    </button>
                    <button
                      onClick={() => onSetTempUnit('fahrenheit')}
                      className={tempUnit === 'fahrenheit' ? 'map-layer-sheet-unit-active' : ''}
                    >
                      °F
                    </button>
                  </div>
                </div>

                <div className="map-layer-sheet-unit-row map-layer-sheet-unit-card">
                  <span>Wind Speed</span>
                  <div className="map-layer-sheet-unit-toggle">
                    <button
                      onClick={() => onSetWindUnit('kmh')}
                      className={windUnit === 'kmh' ? 'map-layer-sheet-unit-active' : ''}
                    >
                      km/h
                    </button>
                    <button
                      onClick={() => onSetWindUnit('mph')}
                      className={windUnit === 'mph' ? 'map-layer-sheet-unit-active' : ''}
                    >
                      mph
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
