import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
window.L = L;
import 'leaflet/dist/leaflet.css';
import { getWeatherInfo, getTempStyle, getTempColor } from '../utils/weatherCodes';
import { formatUnixFull } from '../utils/helpers';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle } from 'lucide-react';

const WeatherIcons = { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle };

// ===== Map sub-components (hooks that render nothing) =====

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function ZoomControlAdder() {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control.zoom({ position: 'topright' });
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map]);
  return null;
}

function InvalidateOnChange({ sidebarCollapsed }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 350);
    return () => clearTimeout(timer);
  }, [sidebarCollapsed, map]);
  return null;
}

function OverlayLayer({ layerType, radarFrames, currentFrameIndex }) {
  const map = useMap();
  const layersRef = useRef({}); // Store multiple layers
  const windDataRef = useRef(null);

  useEffect(() => {
    // Cleanup everything if not radar
    if (layerType !== 'radar') {
      Object.values(layersRef.current).forEach(layer => map.removeLayer(layer));
      layersRef.current = {};

      if (layerType === 'satellite') {
        layersRef.current['sat'] = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 18, zIndex: 5 }
        ).addTo(map);
      } else if (layerType === 'wind') {
        layersRef.current['wind'] = L.tileLayer(
          `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${process.env.NEXT_PUBLIC_OWM_API_KEY}`,
          { opacity: 0.75, maxZoom: 18, maxNativeZoom: 6, zIndex: 10, crossOrigin: true }
        ).addTo(map);

        const loadVelocity = async () => {
          await import('leaflet-velocity/dist/leaflet-velocity.css');
          await import('leaflet-velocity/dist/leaflet-velocity.js');

          // Safety check: if user switched layers while downloading, abort
          if (!layersRef.current['wind']) return;

          const addVelocity = (data) => {
            if (!layersRef.current['velocity']) {
              layersRef.current['velocity'] = L.velocityLayer({
                displayValues: false,
                displayOptions: {
                  velocityType: 'Global Wind',
                  position: 'bottomleft',
                  emptyString: 'No wind data'
                },
                data: data,
                maxVelocity: 20,
                particleMultiplier: 1 / 700,
                lineWidth: 2,
                colorScale: [
                  '#3288bd',
                  '#66c2a5',
                  '#abdda4',
                  '#e6f598',
                  '#fee08b',
                  '#fdae61',
                  '#f46d43',
                  '#d53e4f'
                ],
              });
              layersRef.current['velocity'].addTo(map);
            }
          };

          if (windDataRef.current) {
            addVelocity(windDataRef.current);
          } else {
            fetch('/wind-global.json')
              .then(res => res.json())
              .then(data => {
                windDataRef.current = data;
                if (layersRef.current['wind']) {
                  addVelocity(data);
                }
              })
              .catch(err => console.error('Failed to load wind data', err));
          }
        };

        loadVelocity();
      } else if (layerType === 'temp') {
        layersRef.current['temp'] = L.tileLayer(
          `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${process.env.NEXT_PUBLIC_OWM_API_KEY}`,
          { opacity: 0.65, maxZoom: 18, maxNativeZoom: 6, zIndex: 10, crossOrigin: true }
        ).addTo(map);
      }
      return;
    }

    // Pre-load all radar frames if they aren't loaded yet
    if (radarFrames.length > 0 && Object.keys(layersRef.current).length === 0) {
      radarFrames.forEach((frame, idx) => {
        const layer = L.tileLayer(
          `https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
          { opacity: 0, maxZoom: 7, zIndex: 10 }
        ).addTo(map);
        layersRef.current[idx] = layer;
      });
    }

    // Toggle opacity for the current frame
    const zoom = map.getZoom();
    const baseOpacity = zoom > 7 ? 0 : 0.65;
    const targetIdx = Math.min(currentFrameIndex, radarFrames.length - 1);

    Object.entries(layersRef.current).forEach(([idx, layer]) => {
      layer.setOpacity(parseInt(idx) === targetIdx ? baseOpacity : 0);
    });

  }, [layerType, radarFrames, currentFrameIndex, map]);

  return null;
}

// ===== Weather marker with popup =====
function WeatherMarker({ location, weatherData, tempUnit, windUnit }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [location.lat, location.lon]);

  if (!location.lat || !weatherData) return null;

  const c = weatherData.current;
  const unitSym = tempUnit === 'celsius' ? '°C' : '°F';
  const wUnit = windUnit === 'kmh' ? 'km/h' : 'mph';
  const w = getWeatherInfo(c.weather_code, c.is_day);
  const tempColor = getTempColor(c.temperature_2m, tempUnit);

  const markerIcon = L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:#6366f1;border-radius:50%;border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 0 6px rgba(99,102,241,0.3),0 2px 8px rgba(0,0,0,0.3);animation:pulse 2s infinite;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <Marker ref={markerRef} position={[location.lat, location.lon]} icon={markerIcon}>
      <Popup maxWidth={260}>
        <div style={{ fontFamily: 'Quicksand, sans-serif' }}>
          <div className="font-bold text-base mb-0.5">{location.city}</div>
          <div className="text-[28px] font-extrabold" style={{ color: tempColor }}>
            {Math.round(c.temperature_2m)}{unitSym}
          </div>
          <div className="text-[13px] capitalize flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            {(() => {
              const IconComp = WeatherIcons[w.icon] || WeatherIcons.HelpCircle;
              return <IconComp size={14} />;
            })()}
            {w.desc}
          </div>
          <div className="flex gap-4 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{c.relative_humidity_2m}% Humidity</span>
            <span>{c.wind_speed_10m} {wUnit} Wind</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ===== Radar time indicator =====
function RadarTimeIndicator({ layerType, radarFrames, currentFrameIndex }) {
  if (layerType !== 'radar' || !radarFrames.length) return null;
  const frame = radarFrames[Math.min(currentFrameIndex, radarFrames.length - 1)];

  return (
    <div
      className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[800] px-4 py-2 rounded-lg text-[13px] whitespace-nowrap"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      Radar — {formatUnixFull(frame.time)}
    </div>
  );
}

// ===== Main WeatherMap component =====
export default function WeatherMap({
  mapRef, theme, currentLayerType, radarFrames, currentFrameIndex,
  weatherData, currentLocation, tempUnit, windUnit, sidebarCollapsed,
  onMapClick, onGeoLocate, onToggleTheme, onToggleSidebar,
}) {
  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

  return (
    <main className="absolute inset-0 z-[1] overflow-hidden">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        maxZoom={18}
        zoomControl={false}
        attributionControl={true}
        className="w-full h-full"
        style={{ background: 'var(--bg-primary)' }}
      >
        <MapRefSetter mapRef={mapRef} />
        <MapClickHandler onMapClick={onMapClick} />
        <ZoomControlAdder />
        <InvalidateOnChange sidebarCollapsed={sidebarCollapsed} />

        <TileLayer
          key={theme}
          url={tileUrl}
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          subdomains="abcd"
          maxZoom={18}
          maxNativeZoom={18}
        />

        <OverlayLayer
          layerType={currentLayerType}
          radarFrames={radarFrames}
          currentFrameIndex={currentFrameIndex}
        />

        <WeatherMarker
          location={currentLocation}
          weatherData={weatherData}
          tempUnit={tempUnit}
          windUnit={windUnit}
        />
      </MapContainer>

      {/* Radar time indicator */}
      <RadarTimeIndicator
        layerType={currentLayerType}
        radarFrames={radarFrames}
        currentFrameIndex={currentFrameIndex}
      />

      {/* Floating buttons */}
      {/* Locate */}
      <button
        onClick={onGeoLocate}
        className="absolute bottom-6 right-6 z-[1001] w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:scale-105 max-md:bottom-24 max-md:right-4 max-md:w-11 max-md:h-11"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(var(--glass-blur))',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
        }}
        title="My Location"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
        </svg>
      </button>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className="absolute bottom-[84px] right-6 z-[1001] w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:scale-105 max-md:bottom-[150px] max-md:right-4 max-md:w-11 max-md:h-11"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(var(--glass-blur))',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
        }}
        title="Toggle Theme"
      >
        {theme === 'dark' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>

      {/* Open sidebar button (shown when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={onToggleSidebar}
          className="absolute top-4 left-4 z-[1001] w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:scale-105 max-md:top-3 max-md:left-3 max-md:w-12 max-md:h-12"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(var(--glass-blur))',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Thermal Legend */}
      <div
        className="absolute bottom-[84px] left-6 z-[1000] w-[260px] p-3 px-4 rounded-xl transition-all max-md:bottom-24 max-md:left-4 max-md:w-[220px] max-md:p-2 max-md:px-3"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(var(--glass-blur))',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Temperature Scale
        </div>
        <div className="ftl-gradient" />
        <div className="flex justify-between mt-1.5 text-[10.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {(() => {
            const cPoints = [0, 10, 18, 26, 33];
            const unitSym = tempUnit === 'celsius' ? '°C' : '°F';
            return cPoints.map((c, idx) => {
              let prefix = '';
              if (idx === 0) prefix = '≤';
              else if (idx === cPoints.length - 1) prefix = '≥';
              const val = tempUnit === 'celsius' ? c : Math.round((c * 9 / 5) + 32);
              return <span key={c}>{prefix}{val}{unitSym}</span>;
            });
          })()}
        </div>
      </div>
    </main>
  );
}
