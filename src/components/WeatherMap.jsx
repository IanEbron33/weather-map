import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
window.L = L;
import 'leaflet/dist/leaflet.css';
import TyphoonLayer from './TyphoonLayer';
import { getWeatherInfo, getTempStyle, getTempColor, getBackgroundImage } from '../utils/weatherCodes';
import { formatUnixFull } from '../utils/helpers';
import { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle, Wind } from 'lucide-react';

const WeatherIcons = { Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudFog, CloudDrizzle, CloudRain, CloudSnow, Snowflake, CloudLightning, Thermometer, HelpCircle };

// ===== Map sub-components (hooks that render nothing) =====
let cachedBordersGeoJSON = null;

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

function OverlayLayer({ layerType, radarFrames, currentFrameIndex, theme, typhoonData, showTyphoonLayer, setWindLoading, showWindParticles }) {
  const map = useMap();
  const layersRef = useRef({}); // Store multiple layers
  const velocityLayerRef = useRef(null); // Separate ref for wind particles
  const windDataRef = useRef(null);
  const showWindParticlesRef = useRef(showWindParticles);

  // 1. Independent effect for Wind Particles
  useEffect(() => {
    showWindParticlesRef.current = showWindParticles;

    if (showWindParticles) {
      const loadVelocity = async () => {
        await import('leaflet-velocity/dist/leaflet-velocity.css');
        await import('leaflet-velocity/dist/leaflet-velocity.js');

        const addVelocity = (data) => {
          if (!velocityLayerRef.current) {
            velocityLayerRef.current = L.velocityLayer({
              displayValues: false,
              displayOptions: {
                velocityType: 'Global Wind',
                position: 'bottomleft',
                emptyString: 'No wind data'
              },
              data: data,
              maxVelocity: 40,
              particleMultiplier: 1 / 500,
              lineWidth: 2.0,
              velocityScale: 0.015,
              colorScale: [
                '#00ffff', '#00ffaa', '#00ff00', '#aaff00', '#ffff00', '#ffaa00', '#ff5500', '#ff0000', '#ff00ff'
              ],
            });
          }
          if (showWindParticlesRef.current && !map.hasLayer(velocityLayerRef.current)) {
            velocityLayerRef.current.addTo(map);
          }
        };

        if (windDataRef.current) {
          addVelocity(windDataRef.current);
        } else {
          setWindLoading(true);
          fetch('/wind-global.json')
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) {
                // Apply typhoon vortex logic if needed
                if (showTyphoonLayer && typhoonData && typhoonData.activeCyclones) {
                  typhoonData.activeCyclones.forEach(cyclone => {
                    const lat0 = parseFloat(cyclone.currentLocation?.lat);
                    const lon0 = parseFloat(cyclone.currentLocation?.lon);
                    
                    let v_max_kmh = cyclone.windSpeedKmh || 120;
                    if (cyclone.pagasaWind) {
                      const match = cyclone.pagasaWind.match(/(\d+)\s*km\/h/i);
                      if (match) v_max_kmh = parseInt(match[1]);
                    }
                    const v_max = v_max_kmh / 3.6;
                    const R_max = 40;
                    const R_out = 800;

                    const uData = data.find(d => d.header.parameterNumber === 2);
                    const vData = data.find(d => d.header.parameterNumber === 3);

                    if (uData && vData && !isNaN(lat0) && !isNaN(lon0)) {
                      const { la1, lo1, dx, dy, nx, ny } = uData.header;
                      let p = 0;
                      for (let j = 0; j < ny; j++) {
                        const lat = la1 - j * dy;
                        for (let i = 0; i < nx; i++, p++) {
                          const lon = lo1 + i * dx;
                          const R = 6371;
                          const dLat = (lat - lat0) * Math.PI / 180;
                          const dLon = (lon - lon0) * Math.PI / 180;
                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat0 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                          const r = R * c;

                          if (r < R_out) {
                            let v_t = 0;
                            if (r <= R_max) {
                              v_t = v_max * (r / R_max);
                            } else {
                              v_t = v_max * Math.exp(-(r - R_max) / 200);
                            }

                            const theta = Math.atan2(lat - lat0, (lon - lon0) * Math.cos(lat0 * Math.PI / 180)); 
                            const u_v = -v_t * Math.sin(theta);
                            const v_v = v_t * Math.cos(theta);
                            const blend = Math.exp(-Math.pow(r / 250, 2)); 
                            
                            uData.data[p] = uData.data[p] * (1 - blend) + (u_v * blend);
                            vData.data[p] = vData.data[p] * (1 - blend) + (v_v * blend);
                          }
                        }
                      }
                    }
                  });
                }
                windDataRef.current = data;
                addVelocity(data);
                setWindLoading(false);
              } else {
                setWindLoading(false);
              }
            })
            .catch(err => {
              console.error('Failed to load wind data', err);
              setWindLoading(false);
            });
        }
      };
      loadVelocity();
    } else {
      if (velocityLayerRef.current && map.hasLayer(velocityLayerRef.current)) {
        map.removeLayer(velocityLayerRef.current);
      }
    }
  }, [showWindParticles, map, showTyphoonLayer, typhoonData, setWindLoading]);

  // 2. Effect for Map Background Overlays (Temp, Wind Heatmap, Satellite, Radar)
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
          { opacity: 1, maxZoom: 18, maxNativeZoom: 6, zIndex: 10, crossOrigin: true, className: 'vibrant-wind-layer' }
        ).addTo(map);

        // Country borders ON TOP of wind overlay using crisp GeoJSON
        const addWindBorders = (data) => {
          if (layersRef.current['wind']) {
            layersRef.current['borders'] = L.geoJSON(data, {
              style: { color: 'rgba(0,0,0,0.4)', weight: 1.5, fillOpacity: 0 },
              interactive: false
            }).addTo(map);
          }
        };

        if (cachedBordersGeoJSON) {
          addWindBorders(cachedBordersGeoJSON);
        } else {
          fetch('/countries.geo.json')
            .then(res => res.json())
            .then(data => {
              cachedBordersGeoJSON = data;
              addWindBorders(data);
            })
            .catch(err => console.error("Failed to load borders", err));
        }
      } else if (layerType === 'temp') {
        layersRef.current['temp'] = L.tileLayer(
          `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${process.env.NEXT_PUBLIC_OWM_API_KEY}`,
          { opacity: 0.95, maxZoom: 18, maxNativeZoom: 6, zIndex: 10, crossOrigin: true, className: 'vibrant-temp-layer' }
        ).addTo(map);

        // Country borders ON TOP of temp overlay using crisp GeoJSON
        const addTempBorders = (data) => {
          if (layersRef.current['temp']) {
            layersRef.current['borders'] = L.geoJSON(data, {
              style: { color: 'rgba(0,0,0,0.5)', weight: 1.5, fillOpacity: 0 },
              interactive: false
            }).addTo(map);
          }
        };

        if (cachedBordersGeoJSON) {
          addTempBorders(cachedBordersGeoJSON);
        } else {
          fetch('/countries.geo.json')
            .then(res => res.json())
            .then(data => {
              cachedBordersGeoJSON = data;
              addTempBorders(data);
            })
            .catch(err => console.error("Failed to load borders", err));
        }
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

  const bgImage = getBackgroundImage(c.weather_code, c.is_day);

  const markerIcon = L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:#6366f1;border-radius:50%;border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 0 6px rgba(99,102,241,0.3),0 2px 8px rgba(0,0,0,0.3);animation:pulse 2s infinite;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <Marker ref={markerRef} position={[location.lat, location.lon]} icon={markerIcon}>
      <Popup maxWidth={260} className="weather-popup">
          <div 
            className="relative overflow-hidden rounded-xl shadow-2xl"
            style={{ 
              fontFamily: 'Quicksand, sans-serif',
              background: bgImage ? `url(${bgImage}) center/cover no-repeat` : 'var(--bg-card)',
              width: '230px',
              padding: '16px',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Overlay */}
            {bgImage && (
              <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" style={{ zIndex: 0 }} />
            )}
  
            <div className="relative z-[1]">
              <div className="font-bold text-sm mb-0.5 truncate pr-4">{location.city}</div>
              <span className="text-3xl font-extrabold mb-1" style={getTempStyle(c.temperature_2m, tempUnit)}>
                {Math.round(c.temperature_2m)}{unitSym}
              </span>
              <div className="text-[12px] capitalize flex items-center gap-1.5 mb-3" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {(() => {
                  const IconComp = WeatherIcons[w.icon] || WeatherIcons.HelpCircle;
                  return <IconComp size={14} />;
                })()}
                {w.desc}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-white/10 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span className="flex items-center gap-1">{c.relative_humidity_2m}% Humid</span>
                <span className="flex items-center gap-1">{c.wind_speed_10m} {wUnit} Wind</span>
              </div>
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
const WeatherMap = React.memo(function WeatherMap({
  mapRef, theme, currentLayerType, radarFrames, currentFrameIndex,
  weatherData, currentLocation, tempUnit, windUnit, sidebarCollapsed,
  onMapClick, onGeoLocate, onToggleTheme, onToggleSidebar,
  showTyphoonLayer, typhoonData, onTyphoonDataLoaded, onOpenBulletin, showWindParticles
}) {
  const [isWindLoading, setWindLoading] = useState(false);

  // Always use a dark base map when weather overlays (temp/wind/radar) are active,
  // because vibrant colors wash out completely on a light base map.
  const isWeatherLayerActive = currentLayerType !== 'none' && currentLayerType !== 'satellite';
  const effectiveTheme = isWeatherLayerActive ? 'dark' : theme;

  const tileUrl = effectiveTheme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png';

  return (
    <main className={`absolute inset-0 z-[1] overflow-hidden ${isWeatherLayerActive ? 'weather-layer-active' : ''}`}>
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
          className="base-map-tiles"
        />

        {/* Highlighted labels layer — show in dark mode OR when weather overlays are active */}
        {(theme === 'dark' || isWeatherLayerActive) && (
          <TileLayer
            key="dark-labels"
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png"
            subdomains="abcd"
            maxZoom={18}
            maxNativeZoom={18}
            className="highlighted-map-labels"
            zIndex={20}
          />
        )}

        <OverlayLayer
          layerType={currentLayerType}
          radarFrames={radarFrames}
          currentFrameIndex={currentFrameIndex}
          theme={theme}
          typhoonData={typhoonData}
          showTyphoonLayer={showTyphoonLayer}
          setWindLoading={setWindLoading}
          showWindParticles={showWindParticles}
        />

        <WeatherMarker
          location={currentLocation}
          weatherData={weatherData}
          tempUnit={tempUnit}
          windUnit={windUnit}
        />

        <TyphoonLayer
          visible={showTyphoonLayer}
          onDataLoaded={onTyphoonDataLoaded}
          windUnit={windUnit}
          onOpenBulletin={onOpenBulletin}
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

      {/* Active Layer Indicator */}
      {isWeatherLayerActive && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-[800] px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(var(--glass-blur))',
            color: 'var(--text-primary)',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {currentLayerType === 'temp' && <><Thermometer size={16} className="text-blue-400" /><span className="text-sm font-semibold">Temperature</span></>}
          {currentLayerType === 'wind' && <><Wind size={16} className="text-teal-400" /><span className="text-sm font-semibold">Wind Flow</span></>}
          {currentLayerType === 'radar' && <><CloudRain size={16} className="text-indigo-400" /><span className="text-sm font-semibold">Rain Radar</span></>}
        </div>
      )}

      {/* Wind Loading Skeleton */}
      {isWindLoading && currentLayerType === 'wind' && (
        <div
          className="absolute inset-0 z-[700] flex items-center justify-center backdrop-blur-sm transition-all"
          style={{ background: 'rgba(15, 23, 42, 0.4)' }}
        >
          <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--text-muted)] border-t-[var(--accent)] animate-spin" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Loading wind data...</span>
          </div>
        </div>
      )}

      {/* Thermal Legend */}
      {currentLayerType === 'temp' && (
        <div
          className="absolute bottom-[84px] left-6 z-[1000] w-[260px] p-3 px-4 rounded-xl transition-all max-md:bottom-24 max-md:left-4 max-md:w-[220px] max-md:p-2 max-md:px-3"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(var(--glass-blur))',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.3s ease-out'
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
      )}

      {/* Wind Legend */}
      {currentLayerType === 'wind' && !isWindLoading && (
        <div
          className="absolute bottom-[84px] left-6 z-[1000] w-[280px] p-3 px-4 rounded-xl transition-all max-md:bottom-24 max-md:left-4 max-md:w-[240px] max-md:p-2 max-md:px-3"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(var(--glass-blur))',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Wind Speed
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowWindParticles(!showWindParticles); }}
              className="text-[10px] font-bold px-2 py-1 rounded transition-colors"
              style={{
                background: showWindParticles ? 'var(--accent)' : 'var(--bg-modifier-hover)',
                color: showWindParticles ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {showWindParticles ? 'Particles: ON' : 'Particles: OFF'}
            </button>
          </div>
          <div className="wind-gradient" />
          <div className="flex justify-between mt-1.5 text-[10.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {(() => {
              const cPoints = [0, 10, 20, 30, 40];
              const unitSym = windUnit === 'kmh' ? 'km/h' : 'mph';
              return cPoints.map((c, idx) => {
                let prefix = '';
                if (idx === cPoints.length - 1) prefix = '≥';
                const val = windUnit === 'kmh' ? c : Math.round(c / 1.609);
                return <span key={c}>{prefix}{val} {idx === cPoints.length - 1 ? unitSym : ''}</span>;
              });
            })()}
          </div>
        </div>
      )}
    </main>
  );
});

export default WeatherMap;
