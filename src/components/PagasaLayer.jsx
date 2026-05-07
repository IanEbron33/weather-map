import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

// Calculate the visual radius of the storm based on its category and intensity
function getDangerRadius(category, windKmh) {
  const cat = category.toLowerCase();
  let baseRadius = 60000; // Base 60km
  
  if (cat.includes('super')) baseRadius = 250000;
  else if (cat.includes('typhoon')) baseRadius = 150000;
  else if (cat.includes('severe')) baseRadius = 100000;
  else if (cat.includes('storm')) baseRadius = 80000;
  
  // Dynamic scaling: Base Size + Intensity Modifier
  return baseRadius + (windKmh * 180); 
}

function formatWind(windKmh, unit) {
  if (unit === 'mph') return `${Math.round(windKmh * 0.621371)} mph`;
  return `${windKmh} km/h`;
}

// Uses the classic simple red cyclone symbol directly via a standard image tag
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

// Set to null to always pull fresh data from the live GDACS API
// (set to a cached value after first fetch to avoid redundant calls per session)
let globalPagasaCache = null;

const PagasaLayer = React.memo(function PagasaLayer({ visible, onDataLoaded, windUnit = 'kmh' }) {
  const [pagasaData, setPagasaData] = useState(null);
  const map = useMap();

  const fetchPagasa = useCallback(async () => {
    if (globalPagasaCache) {
      setPagasaData(globalPagasaCache);
      if (onDataLoaded) onDataLoaded(globalPagasaCache);
      return;
    }
    try {
      // Add timestamp to bust Next.js's route cache during development
      const res = await fetch(`/api/pagasa?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch PAGASA data');
      const data = await res.json();
      // Only cache if the API succeeded without an error flag
      if (!data.error) {
        globalPagasaCache = data;
      }
      setPagasaData(data);
      if (onDataLoaded) onDataLoaded(data);
    } catch (err) {
      console.error('PAGASA fetch error:', err);
      // Set empty state so "no active typhoon" toast fires correctly
      const fallback = { activeCyclones: [], rainfallAdvisories: [], error: err.message };
      setPagasaData(fallback);
      if (onDataLoaded) onDataLoaded(fallback);
    }
  }, [onDataLoaded]);

  useEffect(() => { fetchPagasa(); }, [fetchPagasa]);

  useEffect(() => {
    if (visible && pagasaData?.activeCyclones?.length > 0) {
      const loc = pagasaData.activeCyclones[0].currentLocation;
      map.flyTo([loc.lat, loc.lon], 6, { animate: true, duration: 1.8 });
    }
  }, [visible, pagasaData, map]);

  if (!visible || !pagasaData) return null;

  return (
    <>
      {pagasaData.activeCyclones.map((cyclone, idx) => {
        const color      = getCycloneColor(cyclone.category);
        const pathCoords = cyclone.projectedPath.map(p => [p.lat, p.lon]);

        const typhoonIcon = L.divIcon({
          html: buildTyphoonIconHtml(color),
          className: '',
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        });

        return (
          <div key={`cyclone-${idx}`}>

            {/* Wind radius danger zone */}
            <Circle
              center={[cyclone.currentLocation.lat, cyclone.currentLocation.lon]}
              radius={getDangerRadius(cyclone.category, cyclone.windSpeedKmh)}
              className="danger-zone-pulse"
              pathOptions={{ color, fillColor: color, fillOpacity: 0.06, weight: 1.5, dashArray: '6 4', opacity: 0.4 }}
            />

            {/* Track line segments */}
            {pathCoords.slice(0, -1).map((_, si) => (
              <Polyline
                key={`seg-${si}`}
                positions={[pathCoords[si], pathCoords[si + 1]]}
                className="marching-ants-path"
                pathOptions={{
                  color: si === 0 ? color : si === 1 ? '#f97316' : '#facc15',
                  weight: si === 0 ? 4 : 3,
                  opacity: 1 - si * 0.15,
                  dashArray: si > 0 ? '8 6' : undefined,
                }}
              />
            ))}

            {/* Forecast track dots */}
            {cyclone.projectedPath.map((pt, pIdx) => (
              <Marker
                key={`pt-${pIdx}`}
                position={[pt.lat, pt.lon]}
                icon={L.divIcon({
                  className: '',
                  html: buildTrackDotHtml(color, pIdx === 0 ? 14 : 10),
                  iconSize: [pIdx === 0 ? 14 : 10, pIdx === 0 ? 14 : 10],
                  iconAnchor: [pIdx === 0 ? 7 : 5, pIdx === 0 ? 7 : 5],
                })}
              >
                <Popup>
                  <div style={{ fontFamily: 'Quicksand,sans-serif', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700 }}>{pt.time}</div>
                    <div style={{ color: '#94a3b8' }}>Forecast position</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Main spinning typhoon marker */}
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

                  <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'8px' }}>
                    Int'l: <span style={{ color:'#cbd5e1' }}>{cyclone.internationalName}</span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
                    {[['Wind', formatWind(cyclone.windSpeedKmh, windUnit), color], ['Pressure', `${cyclone.pressureHpa} hPa`, '#f1f5f9']].map(([label, val, c]) => (
                      <div key={label} style={{ background:'rgba(239,68,68,0.1)', borderRadius:'8px', padding:'6px 8px' }}>
                        <div style={{ color:'#94a3b8', fontSize:'10px', textTransform:'uppercase', marginBottom:'2px' }}>{label}</div>
                        <div style={{ fontWeight:700, color:c, fontSize:'13px' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {cyclone.signals && (
                    <div>
                      <div style={{ fontSize:'10px', textTransform:'uppercase', color:'#94a3b8', marginBottom:'4px', letterSpacing:'0.05em' }}>
                        Storm Signals
                      </div>
                      {Object.entries(cyclone.signals).map(([sig, areas]) => {
                        const sigColors = { 1:'#facc15', 2:'#f97316', 3:'#ef4444', 4:'#a855f7' };
                        return (
                          <div key={sig} style={{ display:'flex', alignItems:'flex-start', gap:'6px', marginBottom:'4px', fontSize:'11px' }}>
                            <span style={{ background: sigColors[sig]||'#ef4444', color:'white', borderRadius:'4px', padding:'1px 5px', fontWeight:700, flexShrink:0 }}>
                              #{sig}
                            </span>
                            <span style={{ color:'#cbd5e1', lineHeight:1.4 }}>{areas.join(', ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
      {pagasaData.activeCyclones.length > 0 && (
        <div 
          className="warning-badge absolute top-6 left-1/2 z-[1000] px-4 py-2.5 rounded-2xl flex items-center gap-3 pointer-events-auto"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${getCycloneColor(pagasaData.activeCyclones[0].category)}`,
            backdropFilter: 'blur(var(--glass-blur))',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: getCycloneColor(pagasaData.activeCyclones[0].category), boxShadow: `0 0 10px ${getCycloneColor(pagasaData.activeCyclones[0].category)}`, animation: 'pulse 1.5s infinite' }} />
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              Active Warning
            </span>
            <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
              {pagasaData.activeCyclones[0].category.toUpperCase()} {pagasaData.activeCyclones[0].name.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </>
  );
});

export default PagasaLayer;
