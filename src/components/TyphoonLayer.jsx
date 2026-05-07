import React, { useEffect, useState, useCallback } from 'react';
import { Marker, Polyline, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

function getCycloneColor(category = '') {
  const cat = category.toLowerCase();
  if (cat.includes('super'))           return '#dc2626';
  if (cat.includes('typhoon'))         return '#ef4444';
  if (cat.includes('severe tropical')) return '#f97316';
  if (cat.includes('tropical storm'))  return '#facc15';
  return '#fb923c';
}

function getDangerRadius(category, windKmh) {
  const cat = category.toLowerCase();
  let baseRadius = 60000; 
  
  if (cat.includes('super')) baseRadius = 250000;
  else if (cat.includes('typhoon')) baseRadius = 150000;
  else if (cat.includes('severe')) baseRadius = 100000;
  else if (cat.includes('storm')) baseRadius = 80000;
  
  return baseRadius + (windKmh * 180); 
}

function formatWind(windKmh, unit) {
  if (unit === 'mph') return `${Math.round(windKmh * 0.621371)} mph`;
  return `${windKmh} km/h`;
}

function formatForecastTime(timeStr) {
  if (!timeStr || timeStr === 'Now') return 'Current Position';
  if (timeStr === 'Forecast') return 'Projected Position';
  
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeStr;
  }
}

function buildTyphoonIconHtml() {
  return `
    <div class="typhoon-icon-wrap" style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;position:relative;">
      <div class="typhoon-radar-ring"></div>
      <div class="typhoon-radar-ring-2"></div>
      <img
        class="typhoon-spiral"
        src="/typhoon-icon.png"
        style="width:42px;height:42px;max-width:42px;max-height:42px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(0,0,0,0.6));position:relative;z-index:10;"
        alt="Typhoon"
      />
    </div>
  `;
}

function buildTrackDotHtml(color, size) {
  return `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 0 8px ${color};"></div>`;
}

let globalTyphoonCache = null;

const TyphoonLayer = React.memo(function TyphoonLayer({ visible, onDataLoaded, windUnit = 'kmh' }) {
  const [typhoonData, setTyphoonData] = useState(null);
  const map = useMap();

  const fetchTyphoonData = useCallback(async () => {
    if (globalTyphoonCache) {
      setTyphoonData(globalTyphoonCache);
      if (onDataLoaded) onDataLoaded(globalTyphoonCache);
      return;
    }
    try {
      const res = await fetch(`/api/typhoon?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch typhoon data');
      const data = await res.json();
      if (!data.error) {
        globalTyphoonCache = data;
      }
      setTyphoonData(data);
      if (onDataLoaded) onDataLoaded(data);
    } catch (err) {
      console.error('Typhoon fetch error:', err);
      const fallback = { activeCyclones: [], error: err.message };
      setTyphoonData(fallback);
      if (onDataLoaded) onDataLoaded(fallback);
    }
  }, [onDataLoaded]);

  useEffect(() => { fetchTyphoonData(); }, [fetchTyphoonData]);

  useEffect(() => {
    if (visible && typhoonData?.activeCyclones?.length > 0) {
      const loc = typhoonData.activeCyclones[0].currentLocation;
      map.flyTo([loc.lat, loc.lon], 6, { animate: true, duration: 1.8 });
    }
  }, [visible, typhoonData, map]);

  if (!visible || !typhoonData) return null;

  // Helper to check if a coordinate is inside the PAR polygon
  function isInsidePAR(lat, lon) {
    const points = [[25, 120], [25, 135], [5, 135], [5, 115], [15, 115], [21, 120]];
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1];
      const xj = points[j][0], yj = points[j][1];
      const intersect = ((yi > lon) !== (yj > lon)) &&
        (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const PAR_POINTS = [
    [25, 120],
    [25, 135],
    [5, 135],
    [5, 115],
    [15, 115],
    [21, 120],
    [25, 120]
  ];

  return (
    <>
      {/* PAR Border */}
      <Polyline
        positions={PAR_POINTS}
        pathOptions={{
          color: '#ef4444',
          weight: 2,
          dashArray: '10, 10',
          opacity: 0.6,
          interactive: false
        }}
      />
      
      {/* PAR Label Marker */}
      <Marker 
        position={[25, 135]} 
        icon={L.divIcon({ 
          html: '<div style="color:#ef4444; font-size:10px; font-weight:800; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px; border:1px solid rgba(239,68,68,0.3); transform: translate(-100%, 0);">PAR</div>', 
          className: '',
          iconAnchor: [0, 0]
        })}
        interactive={false}
      />

      {typhoonData.activeCyclones.map((cyclone, idx) => {
        const color      = getCycloneColor(cyclone.category);
        const historyPts  = cyclone.projectedPath.filter(p => !p.isForecast || p.isCurrent).map(p => [p.lat, p.lon]);
        const forecastPts = cyclone.projectedPath.filter(p => p.isForecast || p.isCurrent).map(p => [p.lat, p.lon]);
        const inPAR       = isInsidePAR(cyclone.currentLocation.lat, cyclone.currentLocation.lon);

        const typhoonIcon = L.divIcon({
          html: buildTyphoonIconHtml(),
          className: '',
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        });

        return (
          <div key={`cyclone-${idx}`}>
            <Circle
              center={[cyclone.currentLocation.lat, cyclone.currentLocation.lon]}
              radius={getDangerRadius(cyclone.category, cyclone.windSpeedKmh)}
              className="danger-zone-pulse"
              pathOptions={{ color, fillColor: color, fillOpacity: 0.06, weight: 1.5, dashArray: '6 4', opacity: 0.4 }}
            />

            {/* Continuous History Line */}
            {historyPts.length > 1 && (
              <Polyline
                positions={historyPts}
                pathOptions={{
                  color: '#94a3b8',
                  weight: 2,
                  opacity: 0.5,
                  dashArray: '5, 8'
                }}
              />
            )}

            {/* Continuous Forecast Line */}
            {forecastPts.length > 1 && (
              <Polyline
                positions={forecastPts}
                className="marching-ants-path"
                pathOptions={{
                  color: color,
                  weight: 4,
                  opacity: 1
                }}
              />
            )}

            {/* Forecast track dots */}
            {cyclone.projectedPath.map((pt, pIdx) => (
              <Marker
                key={`pt-${pIdx}`}
                position={[pt.lat, pt.lon]}
                icon={L.divIcon({
                  className: '',
                  html: buildTrackDotHtml(pt.isCurrent ? '#ffffff' : (pt.isForecast ? color : '#94a3b8'), pt.isCurrent ? 16 : 10),
                  iconSize: [pt.isCurrent ? 16 : 10, pt.isCurrent ? 16 : 10],
                  iconAnchor: [pt.isCurrent ? 8 : 5, pt.isCurrent ? 8 : 5],
                })}
              >
                <Popup>
                  <div style={{ fontFamily: 'Quicksand,sans-serif', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700 }}>{formatForecastTime(pt.time)}</div>
                    <div style={{ color: '#94a3b8' }}>
                      {pt.isCurrent ? 'Current Position' : (pt.isForecast ? 'Forecast Position' : 'Historical Position')}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <Marker
              position={[cyclone.currentLocation.lat, cyclone.currentLocation.lon]}
              icon={typhoonIcon}
              zIndexOffset={1000}
            >
              <Popup minWidth={230}>
                <div style={{ fontFamily: 'Quicksand,sans-serif' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                    <img
                      src="/typhoon-icon.png"
                      className="typhoon-spiral"
                      style={{ width:'26px', height:'26px', maxWidth:'26px', maxHeight:'26px', objectFit:'contain', filter:'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}
                      alt="Typhoon"
                    />
                    <div>
                      <div style={{ fontWeight:800, fontSize:'15px', color }}>{cyclone.name}</div>
                      <div style={{ fontSize:'11px', color:'#94a3b8' }}>{cyclone.category}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize:'12px', color:'#94a3b8' }}>
                      via <span style={{ color:'#cbd5e1' }}>GDACS / JTWC</span>
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      background: inPAR ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
                      color: inPAR ? '#ef4444' : '#94a3b8',
                      border: inPAR ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(148,163,184,0.2)'
                    }}>
                      {inPAR ? 'INSIDE PAR' : 'OUTSIDE PAR'}
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
                    <div style={{ background:'rgba(239,68,68,0.1)', borderRadius:'8px', padding:'6px 8px' }}>
                      <div style={{ color:'#94a3b8', fontSize:'10px', textTransform:'uppercase', marginBottom:'2px' }}>Wind Speed</div>
                      <div style={{ fontWeight:700, color, fontSize:'13px' }}>{formatWind(cyclone.windSpeedKmh, windUnit)}</div>
                    </div>
                    <div style={{ background:'rgba(239,68,68,0.1)', borderRadius:'8px', padding:'6px 8px' }}>
                      <div style={{ color:'#94a3b8', fontSize:'10px', textTransform:'uppercase', marginBottom:'2px' }}>Alert Level</div>
                      <div style={{ fontWeight:700, color: cyclone.alertLevel.toLowerCase() === 'green' ? '#22c55e' : cyclone.alertLevel.toLowerCase() === 'orange' ? '#f97316' : '#ef4444', fontSize:'13px' }}>{cyclone.alertLevel}</div>
                    </div>
                  </div>

                  <a 
                    href={cyclone.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display:'block', textAlign:'center', background:'var(--bg-input)', color:'white', fontSize:'11px', padding:'6px', borderRadius:'6px', textDecoration:'none' }}
                  >
                    View Full GDACS Report
                  </a>
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
      {typhoonData.activeCyclones.length > 0 && (
        <div 
          className="warning-badge absolute top-6 left-1/2 z-[1000] px-4 py-2.5 rounded-2xl flex items-center gap-3 pointer-events-auto"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${getCycloneColor(typhoonData.activeCyclones[0].category)}`,
            backdropFilter: 'blur(var(--glass-blur))',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: getCycloneColor(typhoonData.activeCyclones[0].category), boxShadow: `0 0 10px ${getCycloneColor(typhoonData.activeCyclones[0].category)}`, animation: 'pulse 1.5s infinite' }} />
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              Active Warning
            </span>
            <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
              {typhoonData.activeCyclones[0].category.toUpperCase()} {typhoonData.activeCyclones[0].name.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </>
  );
});

export default TyphoonLayer;

