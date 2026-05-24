import { Map, CloudRain, Wind, Thermometer, Satellite, Activity, Tornado, X } from 'lucide-react';

const layers = [
  { id: 'none', icon: Map, label: 'Map Only' },
  { id: 'radar', icon: CloudRain, label: 'Radar' },
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
}) {
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

        {/* Layer options */}
        <div className="map-layer-sheet-body">
          {/* Layer grid */}
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

          {/* Divider */}
          <div className="map-layer-sheet-divider" />

          {/* Toggles */}
          <div className="map-layer-sheet-toggles">
            {/* Wind Particles */}
            <button
              onClick={() => setShowWindParticles(!showWindParticles)}
              className="map-layer-sheet-toggle-row"
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
              className="map-layer-sheet-toggle-row"
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

          {/* Divider */}
          <div className="map-layer-sheet-divider" />

          {/* Units */}
          <div className="map-layer-sheet-units">
            <span className="map-layer-sheet-units-title">Units</span>

            <div className="map-layer-sheet-unit-row">
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

            <div className="map-layer-sheet-unit-row">
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
    </>
  );
}
