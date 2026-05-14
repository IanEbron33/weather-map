import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudLightning, AlertTriangle, MapPin, Wind, Navigation, 
  ExternalLink, FileText, RefreshCw, Clock, Waves, X, ChevronDown, ChevronUp 
} from 'lucide-react';
import Image from 'next/image';

export default function PagasaBulletin({ visible, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchBulletin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pagasa-bulletin?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch bulletin');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setData(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pagasa-bulletin?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchBulletin();
  }, [visible, fetchBulletin]);

  if (!visible) return null;

  const bulletin = data?.bulletins?.[0];
  const hasBulletin = data?.hasBulletin && bulletin;

  return (
    <div className="pagasa-panel" style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: expanded ? '540px' : '460px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: expanded ? '80vh' : '360px',
      zIndex: 1005,
      borderRadius: '20px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%)',
      border: '1px solid rgba(239,68,68,0.25)',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.08)',
      animation: 'pagasaSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`
        @keyframes pagasaSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(40px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pagasaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .pagasa-panel::-webkit-scrollbar { width: 5px; }
        .pagasa-panel::-webkit-scrollbar-track { background: transparent; }
        .pagasa-panel::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
        .pagasa-stat-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 10px 12px;
          transition: all 0.2s ease;
        }
        .pagasa-stat-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.1);
        }
        .pagasa-pdf-link {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 8px;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.15);
          color: #818cf8; font-size: 11px; font-weight: 600;
          text-decoration: none; transition: all 0.2s ease;
        }
        .pagasa-pdf-link:hover {
          background: rgba(99,102,241,0.15);
          border-color: rgba(99,102,241,0.3);
          color: #a5b4fc;
        }
        @media (max-width: 640px) {
          .pagasa-panel {
            bottom: 12px !important;
            width: calc(100vw - 24px) !important;
            max-height: 70vh !important;
            border-radius: 16px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}>
            <CloudLightning size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.3px' }}>
              PAGASA Bulletin
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
              Severe Weather Bulletin
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasBulletin && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', borderRadius: '6px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#ef4444',
                animation: 'pagasaPulse 1.5s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active
              </span>
            </div>
          )}
          <button onClick={handleRefresh} disabled={loading} style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            color: '#94a3b8',
          }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => setExpanded(p => !p)} style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            color: '#94a3b8',
          }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          <button onClick={onClose} style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            color: '#94a3b8',
          }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px 16px' }}>
        {loading && !data && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 0', gap: '12px',
          }}>
            <RefreshCw size={20} style={{ color: '#ef4444', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Scraping PAGASA bulletin...</span>
          </div>
        )}

        {error && !data && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '30px 0', gap: '10px',
          }}>
            <AlertTriangle size={20} style={{ color: '#f97316' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Unable to reach PAGASA. Try again later.
            </span>
          </div>
        )}

        {data && !hasBulletin && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '30px 0', gap: '10px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '20px' }}>☀️</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
              All Clear
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', maxWidth: '280px' }}>
              No active tropical cyclone bulletin from PAGASA at this time.
            </span>
          </div>
        )}

        {hasBulletin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Cyclone Name + Category */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.05) 100%)',
              border: '1px solid rgba(239,68,68,0.12)',
              borderRadius: '14px',
              padding: '14px',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
                {bulletin.title}
              </div>
              {bulletin.issuedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                  <Clock size={11} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    Issued at {bulletin.issuedAt}
                  </span>
                </div>
              )}
              {bulletin.summary && (
                <div style={{
                  fontSize: '11px', fontWeight: 600, color: '#fbbf24',
                  lineHeight: '1.5',
                  padding: '8px 10px',
                  background: 'rgba(251,191,36,0.06)',
                  border: '1px solid rgba(251,191,36,0.1)',
                  borderRadius: '8px',
                }}>
                  {bulletin.summary}
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {bulletin.maxWinds && (
                <div className="pagasa-stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Wind size={11} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Max Winds
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9' }}>
                    {bulletin.maxWinds}
                  </div>
                </div>
              )}
              {bulletin.gustiness && (
                <div className="pagasa-stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Waves size={11} style={{ color: '#f97316' }} />
                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Gusts
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9' }}>
                    {bulletin.gustiness}
                  </div>
                </div>
              )}
              {bulletin.movement && (
                <div className="pagasa-stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Navigation size={11} style={{ color: '#3b82f6' }} />
                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Movement
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                    {bulletin.movement}
                  </div>
                </div>
              )}
              {bulletin.currentPosition && (
                <div className="pagasa-stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <MapPin size={11} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Location
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#f1f5f9', lineHeight: '1.4' }}>
                    {bulletin.currentPosition.substring(0, 80)}{bulletin.currentPosition.length > 80 ? '...' : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Coordinates badge */}
            {bulletin.coordinates && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '8px',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.1)',
              }}>
                <MapPin size={11} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                  {bulletin.coordinates.lat}°N, {bulletin.coordinates.lon}°E
                </span>
              </div>
            )}

            {/* Track Image */}
            {bulletin.trackImageUrl && expanded && (
              <div style={{
                borderRadius: '12px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Image
                  src={bulletin.trackImageUrl}
                  alt="PAGASA Track Forecast"
                  width={800}
                  height={600}
                  style={{
                    width: '100%', height: 'auto', display: 'block',
                    background: '#0f172a',
                  }}
                />
              </div>
            )}

            {/* Track Outlook (expanded) */}
            {bulletin.trackOutlook && expanded && (
              <div style={{
                padding: '10px 12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Track & Intensity Outlook
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  {bulletin.trackOutlook}
                </div>
              </div>
            )}

            {/* Forecast Positions (expanded) */}
            {bulletin.forecastPositions.length > 0 && expanded && (
              <div style={{
                padding: '10px 12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Forecast Positions
                </div>
                {bulletin.forecastPositions.map((fp, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '6px 0',
                    borderBottom: i < bulletin.forecastPositions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#f97316', marginTop: '4px', flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{fp.time}</div>
                      <div style={{ fontSize: '11px', color: '#e2e8f0' }}>{fp.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PDF Bulletin Links */}
            {bulletin.bulletinPdfs.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Official Bulletins
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {bulletin.bulletinPdfs.slice(0, expanded ? 10 : 3).map((pdf, i) => (
                    <a key={i} href={pdf.url} target="_blank" rel="noopener noreferrer" className="pagasa-pdf-link">
                      <FileText size={10} />
                      {pdf.label.length > 20 ? pdf.label.substring(0, 20) + '...' : pdf.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Source + View Full */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: '4px',
            }}>
              <span style={{ fontSize: '9px', color: '#475569' }}>
                Source: DOST-PAGASA • Scraped {data?.scrapedAt ? new Date(data.scrapedAt).toLocaleTimeString() : ''}
              </span>
              <a
                href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', color: '#6366f1', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View Full <ExternalLink size={9} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
