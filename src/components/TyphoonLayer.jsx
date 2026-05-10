import React, { useEffect, useState, useCallback } from 'react';
import { Marker, Polyline, Circle, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

function getCycloneColor(category = '') {
  const cat = category.toLowerCase();
  if (cat.includes('super')) return '#dc2626';
  if (cat.includes('typhoon')) return '#ef4444';
  if (cat.includes('severe tropical')) return '#f97316';
  if (cat.includes('tropical storm')) return '#facc15';
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
        style="width:42px;height:42px;max-width:42px;max-height:42px;object-fit:contain;position:relative;z-index:10;"
        alt="Typhoon"
      />
    </div>
  `;
}

// Track dots are now native CircleMarkers


let globalTyphoonCache = null;

const TyphoonLayer = React.memo(function TyphoonLayer({ visible, onDataLoaded, windUnit = 'kmh', onOpenBulletin }) {
  const [typhoonData, setTyphoonData] = useState(null);
  const map = useMap();

  const fetchTyphoonData = useCallback(async () => {
    // Use cache if available
    if (globalTyphoonCache) {
      setTyphoonData(globalTyphoonCache);
      if (onDataLoaded) onDataLoaded(globalTyphoonCache);
      return;
    }

    try {
      const res = await fetch(`/api/typhoon?t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch typhoon data');

      const merged = await res.json();

      if (!merged.error) {
        globalTyphoonCache = merged;
      }

      setTyphoonData(merged);
      if (onDataLoaded) onDataLoaded(merged);
    } catch (err) {
      console.error('Typhoon fetch error:', err);
      const fallback = { activeCyclones: [], error: err.message };
      setTyphoonData(fallback);
      if (onDataLoaded) onDataLoaded(fallback);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    if (!visible) return;
    fetchTyphoonData();

    // Auto-refresh every 15 minutes (900000 ms) when active
    const intervalId = setInterval(fetchTyphoonData, 900000);
    return () => clearInterval(intervalId);
  }, [visible, fetchTyphoonData]);

  useEffect(() => {
    if (visible && typhoonData?.activeCyclones?.length > 0) {
      const loc = typhoonData.activeCyclones[0].currentLocation;
      map.flyTo([loc.lat, loc.lon], 6, { animate: true, duration: 1.8 });
    }
  }, [visible, typhoonData, map]);

  // OPTION A: Smart Pause - Disable animations during map interaction to prevent zoom lag
  useEffect(() => {
    if (!map) return;
    const pauseAnim = () => map.getContainer().classList.add('pause-animations');
    const resumeAnim = () => map.getContainer().classList.remove('pause-animations');

    map.on('zoomstart movestart', pauseAnim);
    map.on('zoomend moveend', resumeAnim);

    return () => {
      map.off('zoomstart movestart', pauseAnim);
      map.off('zoomend moveend', resumeAnim);
    };
  }, [map]);

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
      {/* Option A CSS: Force pause all animations inside the map container while zooming/panning */}
      <style>{`
        .pause-animations * {
          animation-play-state: paused !important;
        }
      `}</style>

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
        const color = getCycloneColor(cyclone.category);
        const historyPts = cyclone.projectedPath.filter(p => !p.isForecast || p.isCurrent).map(p => [p.lat, p.lon]);
        const forecastPts = cyclone.projectedPath.filter(p => p.isForecast || p.isCurrent).map(p => [p.lat, p.lon]);
        const inPAR = isInsidePAR(cyclone.currentLocation.lat, cyclone.currentLocation.lon);
        const pg = cyclone.pagasa; // PAGASA enrichment (may be undefined)

        // Display name: prefer PAGASA local name
        const displayName = pg?.localName || cyclone.name;
        const intlName = cyclone.name;
        const hasPagasa = !!pg;

        // Wind data: prefer PAGASA if available
        const displayWindLabel = hasPagasa ? pg.maxWinds : formatWind(cyclone.windSpeedKmh, windUnit);
        const displayGustLabel = pg?.gustiness || null;

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

            {/* Continuous Forecast Line (Option B: Simplified to static dashes) */}
            {forecastPts.length > 1 && (
              <Polyline
                positions={forecastPts}
                pathOptions={{
                  color: color,
                  weight: 4,
                  opacity: 1,
                  dashArray: '8, 8'
                }}
              />
            )}

            {/* Forecast track dots - OPTIMIZED: Using CircleMarker instead of DOM Markers */}
            {cyclone.projectedPath.map((pt, pIdx) => {
              const dotColor = pt.isCurrent ? '#ffffff' : (pt.isForecast ? color : '#94a3b8');
              const radius = pt.isCurrent ? 7 : 4;
              const weight = pt.isCurrent ? 3 : 2;

              return (
                <CircleMarker
                  key={`pt-${pIdx}`}
                  center={[pt.lat, pt.lon]}
                  radius={radius}
                  pathOptions={{
                    color: 'rgba(255,255,255,0.9)',
                    weight: weight,
                    fillColor: dotColor,
                    fillOpacity: 1
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Quicksand,sans-serif', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700 }}>{formatForecastTime(pt.time)}</div>
                      <div style={{ color: '#94a3b8' }}>
                        {pt.isCurrent ? 'Current Position' : (pt.isForecast ? 'Forecast Position' : 'Historical Position')}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Main typhoon icon marker with merged popup */}
            <Marker
              position={[cyclone.currentLocation.lat, cyclone.currentLocation.lon]}
              icon={typhoonIcon}
              zIndexOffset={1000}
            >
              <Popup minWidth={280} maxWidth={340}>
                <div style={{ fontFamily: 'Quicksand,sans-serif', margin: '-4px -4px 0', padding: 0 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <img
                      src="/typhoon-icon.png"
                      className="typhoon-spiral"
                      style={{ width: '30px', height: '30px', maxWidth: '30px', maxHeight: '30px', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}
                      alt="Typhoon"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color, lineHeight: '1.2' }}>
                        {displayName}
                      </div>
                      {hasPagasa && intlName.toUpperCase() !== displayName.toUpperCase() && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                          International: {intlName}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{cyclone.category}</div>
                    </div>
                  </div>

                  {/* Source + PAR badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {hasPagasa && (
                        <div style={{
                          fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px',
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.2)', letterSpacing: '0.3px'
                        }}>
                          PAGASA
                        </div>
                      )}
                      <div style={{
                        fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px',
                        background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                        border: '1px solid rgba(148,163,184,0.15)', letterSpacing: '0.3px'
                      }}>
                        GDACS
                      </div>
                    </div>
                    <div style={{
                      fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                      background: inPAR ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
                      color: inPAR ? '#ef4444' : '#94a3b8',
                      border: inPAR ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(148,163,184,0.2)'
                    }}>
                      {inPAR ? 'INSIDE PAR' : 'OUTSIDE PAR'}
                    </div>
                  </div>

                  {/* PAGASA Issued At */}
                  {hasPagasa && pg.issuedAt && (
                    <div style={{
                      fontSize: '10px', color: '#94a3b8', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span style={{ fontSize: '10px' }}>🕐</span>
                      Issued at {pg.issuedAt}
                    </div>
                  )}

                  {/* Summary Headline from PAGASA */}
                  {hasPagasa && pg.summary && (
                    <div style={{
                      fontSize: '11px', fontWeight: 700, color: '#fbbf24',
                      lineHeight: '1.45', padding: '7px 9px', marginBottom: '8px',
                      background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)',
                      borderRadius: '6px',
                    }}>
                      {pg.summary}
                    </div>
                  )}

                  {/* Stats Grid — PAGASA official data or GDACS fallback */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                    <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '6px 8px' }}>
                      <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px', letterSpacing: '0.3px' }}>
                        Max Winds
                      </div>
                      <div style={{ fontWeight: 700, color, fontSize: '13px' }}>
                        {displayWindLabel}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '6px 8px' }}>
                      <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px', letterSpacing: '0.3px' }}>
                        {displayGustLabel ? 'Gusts' : 'Alert Level'}
                      </div>
                      <div style={{
                        fontWeight: 700, fontSize: '13px',
                        color: displayGustLabel ? color : (
                          cyclone.alertLevel.toLowerCase() === 'green' ? '#22c55e' :
                            cyclone.alertLevel.toLowerCase() === 'orange' ? '#f97316' : '#ef4444'
                        )
                      }}>
                        {displayGustLabel || cyclone.alertLevel}
                      </div>
                    </div>
                  </div>

                  {/* Movement & Location from PAGASA */}
                  {hasPagasa && (pg.movement || pg.currentPosition) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '12px' }}>
                      {pg.movement && (
                        <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: '8px', padding: '6px 8px' }}>
                          <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px', letterSpacing: '0.3px' }}>Movement</div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '11px', lineHeight: '1.3' }}>{pg.movement.split('at')[0]}</div>
                        </div>
                      )}
                      {pg.currentPosition && (
                        <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: '8px', padding: '6px 8px' }}>
                          <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px', letterSpacing: '0.3px' }}>Location</div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '10px', lineHeight: '1.3' }}>
                            {pg.currentPosition.substring(0, 40)}{pg.currentPosition.length > 40 ? '...' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Links */}
                  {hasPagasa ? (
                    <button
                      onClick={() => {
                        // Close Leaflet popup when opening the deep-dive panel
                        map.closePopup();
                        if (onOpenBulletin) onOpenBulletin();
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                        fontSize: '11px', fontWeight: 700, padding: '8px 10px',
                        borderRadius: '8px', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Read Full PAGASA Bulletin
                    </button>
                  ) : (
                    <a
                      href={cyclone.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block', textAlign: 'center',
                        background: 'rgba(148,163,184,0.1)', color: '#cbd5e1',
                        fontSize: '10px', fontWeight: 700, padding: '6px 8px',
                        borderRadius: '6px', textDecoration: 'none',
                        border: '1px solid rgba(148,163,184,0.2)',
                      }}
                    >
                      View GDACS Report
                    </a>
                  )}

                  {/* Data Source footer */}
                  <div style={{ marginTop: '8px', fontSize: '9px', color: '#475569', textAlign: 'center' }}>
                    Track: GDACS/JTWC{hasPagasa ? ' • Details: DOST-PAGASA' : ''}
                  </div>
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}

      {/* Top warning badge */}
      {typhoonData.activeCyclones.length > 0 && (() => {
        const first = typhoonData.activeCyclones[0];
        const pg = first.pagasa;
        const badgeName = pg?.localName || first.name;
        const badgeCategory = first.category;
        const badgeColor = getCycloneColor(badgeCategory);

        return (
          <div
            className="warning-badge absolute top-6 left-1/2 z-[1000] px-4 py-2.5 rounded-2xl flex items-center gap-3 pointer-events-auto"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${badgeColor}`,
              backdropFilter: 'blur(var(--glass-blur))',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: badgeColor, boxShadow: `0 0 10px ${badgeColor}`, animation: 'pulse 1.5s infinite' }} />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                Active Warning
              </span>
              <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
                {badgeCategory.toUpperCase()} {badgeName.toUpperCase()}
                {pg && first.name.toUpperCase() !== badgeName.toUpperCase() && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}> ({first.name})</span>
                )}
              </span>
            </div>
            {pg && (
              <div style={{
                fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px',
                background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.2)', marginLeft: '4px'
              }}>
                PAGASA
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
});

export default TyphoonLayer;
