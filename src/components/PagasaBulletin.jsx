import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudLightning, AlertTriangle, MapPin, Wind, Navigation, 
  ExternalLink, FileText, RefreshCw, Clock, Waves, X, Map 
} from 'lucide-react';
import Image from 'next/image';
import { isMobile } from '../utils/helpers';

export default function PagasaBulletin({ visible, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const TABS = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'track', label: 'Track & Outlook', icon: Map },
  ];

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

  const mobile = isMobile();

  // Desktop: unmount when not visible (floating card)
  // Mobile: always mounted (for CSS slide transitions)
  if (!visible && !mobile) return null;

  const bulletin = data?.bulletins?.[0];
  const hasBulletin = data?.hasBulletin && bulletin;

  // Shared content (used in both mobile sheet and desktop card)
  const panelContent = (
    <>
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
        .pagasa-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        
        .pagasa-stat-card {
          background: rgba(107, 69, 40, 0.04);
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        .pagasa-stat-card:hover {
          background: rgba(107, 69, 40, 0.07);
          border-color: var(--accent);
        }
        .pagasa-pdf-link {
          display: flex; align-items: center; gap: 6px;
          padding: var(--pagasa-pdf-padding, 6px 10px); border-radius: 8px;
          background: rgba(201, 120, 47, 0.06);
          border: 1px solid rgba(201, 120, 47, 0.15);
          color: var(--accent); font-size: var(--pagasa-pdf-font, 11px); font-weight: 600;
          text-decoration: none; transition: all 0.2s ease;
        }
        .pagasa-pdf-link:hover {
          background: rgba(201, 120, 47, 0.12);
          border-color: var(--accent);
          color: var(--accent-hover);
        }
        @keyframes pagasaTabFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pagasa-tab-pane {
          animation: pagasaTabFade 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .pagasa-panel {
            --pagasa-panel-bottom: 84px !important;
            --pagasa-panel-radius: 16px !important;
            --pagasa-panel-max-height-expanded: 60vh !important;
            --pagasa-panel-max-height-collapsed: 300px !important;
            width: calc(100vw - 24px) !important;
          }
          /* Custom overrides via custom properties */
          .pagasa-panel {
            --pagasa-header-padding: 10px 12px 8px;
            --pagasa-body-padding: 10px 12px 12px;
            --pagasa-title-font: 11px;
            --pagasa-subtitle-font: 8px;
            --pagasa-summary-font: 9.5px;
            --pagasa-body-inner-padding: 10px;
            --pagasa-stat-padding: 6px 8px;
            --pagasa-stat-value-font: 11px;
            --pagasa-pdf-padding: 4px 8px;
            --pagasa-pdf-font: 10px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: 'var(--pagasa-header-padding, 14px 16px 10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}>
            <CloudLightning size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--pagasa-title-font, 13px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
              PAGASA Bulletin
            </div>
            <div style={{ fontSize: 'var(--pagasa-subtitle-font, 10px)', color: 'var(--text-muted)', fontWeight: 500 }}>
              Severe Weather Bulletin
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasBulletin && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.18)',
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
          <button 
            onClick={handleRefresh} 
            disabled={loading} 
            aria-label="Refresh bulletin"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'var(--bg-modifier-hover)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button 
            onClick={onClose} 
            aria-label="Close bulletin"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'var(--bg-modifier-hover)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      {hasBulletin && (
        <div style={{
          position: 'relative',
          display: 'flex',
          gap: '6px',
          flexShrink: 0,
          background: 'rgba(107, 69, 40, 0.04)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '4px',
          margin: '12px 16px 4px',
        }}>
          {/* Sliding Indicator */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: 'calc((100% - 8px - 6px) / 2)',
            height: 'calc(100% - 8px)',
            background: 'var(--accent)',
            borderRadius: '10px',
            transition: 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: activeTab === 'overview' ? 'translateX(0)' : 'translateX(calc(100% + 6px))',
            zIndex: 0,
          }} />

          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'color 0.22s ease',
                  background: 'transparent',
                  color: isActive ? '#fff8e8' : 'var(--text-secondary)',
                  border: '1px solid transparent',
                  zIndex: 1,
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="pagasa-body" style={{ overflowY: 'auto', flex: 1, padding: 'var(--pagasa-body-padding, 12px 16px 16px)' }}>
        {loading && !data && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 0', gap: '12px',
          }}>
            <RefreshCw size={20} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scraping PAGASA bulletin...</span>
          </div>
        )}

        {error && !data && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '30px 0', gap: '10px',
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
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
              background: 'rgba(124,138,69,0.1)', border: '1px solid rgba(124,138,69,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '20px' }}>☀️</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#7c8a45' }}>
              All Clear
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px' }}>
              No active tropical cyclone bulletin from PAGASA at this time.
            </span>
          </div>
        )}

        {hasBulletin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Cyclone Name + Category (Always Visible) */}
            <div style={{
              background: 'rgba(107,69,40,0.05)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: 'var(--pagasa-body-inner-padding, 14px)',
            }}>
              <div style={{ fontSize: 'var(--pagasa-title-font, 16px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {bulletin.title}
              </div>
              {bulletin.issuedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                  <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Issued at {bulletin.issuedAt}
                  </span>
                </div>
              )}
              {bulletin.summary && activeTab === 'overview' && (
                <div style={{
                  fontSize: 'var(--pagasa-summary-font, 11px)', fontWeight: 600, color: '#b25e15',
                  lineHeight: '1.5',
                  padding: '8px 10px',
                  background: 'rgba(201,120,47,0.08)',
                  border: '1px solid rgba(201,120,47,0.15)',
                  borderRadius: '8px',
                }}>
                  {bulletin.summary}
                </div>
              )}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div key="overview" className="pagasa-tab-pane">
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {bulletin.maxWinds && (
                    <div className="pagasa-stat-card" style={{ padding: 'var(--pagasa-stat-padding, 10px 12px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <Wind size={11} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Max Winds
                        </span>
                      </div>
                      <div className="pagasa-stat-value" style={{ fontSize: 'var(--pagasa-stat-value-font, 14px)', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {bulletin.maxWinds}
                      </div>
                    </div>
                  )}
                  {bulletin.gustiness && (
                    <div className="pagasa-stat-card" style={{ padding: 'var(--pagasa-stat-padding, 10px 12px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <Waves size={11} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Gusts
                        </span>
                      </div>
                      <div className="pagasa-stat-value" style={{ fontSize: 'var(--pagasa-stat-value-font, 14px)', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {bulletin.gustiness}
                      </div>
                    </div>
                  )}
                  {bulletin.movement && (
                    <div className="pagasa-stat-card" style={{ padding: 'var(--pagasa-stat-padding, 10px 12px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <Navigation size={11} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Movement
                        </span>
                      </div>
                      <div className="pagasa-stat-value" style={{ fontSize: 'var(--pagasa-stat-value-font, 12px)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {bulletin.movement}
                      </div>
                    </div>
                  )}
                  {bulletin.currentPosition && (
                    <div className="pagasa-stat-card" style={{ padding: 'var(--pagasa-stat-padding, 10px 12px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <MapPin size={11} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Location
                        </span>
                      </div>
                      <div className="pagasa-stat-value" style={{ fontSize: 'var(--pagasa-stat-value-font, 11px)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>
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
                    background: 'rgba(107,69,40,0.05)',
                    border: '1px solid var(--border)',
                  }}>
                    <MapPin size={11} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {bulletin.coordinates.lat}°N, {bulletin.coordinates.lon}°E
                    </span>
                  </div>
                )}

                {/* PDF Bulletin Links */}
                {bulletin.bulletinPdfs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Official Bulletins
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {bulletin.bulletinPdfs.slice(0, 6).map((pdf, i) => (
                        <a key={i} href={pdf.url} target="_blank" rel="noopener noreferrer" className="pagasa-pdf-link">
                          <FileText size={10} />
                          {pdf.label.length > 20 ? pdf.label.substring(0, 20) + '...' : pdf.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRACK & OUTLOOK TAB */}
            {activeTab === 'track' && (
              <div key="track" className="pagasa-tab-pane">
                {/* Track Image */}
                {bulletin.trackImageUrl && (
                  <div style={{
                    borderRadius: '12px', overflow: 'hidden',
                    border: '1px solid var(--border)',
                  }}>
                    <Image
                      src={bulletin.trackImageUrl}
                      alt="PAGASA Track Forecast"
                      width={800}
                      height={600}
                      style={{
                        width: '100%', height: 'auto', display: 'block',
                        background: 'var(--bg-primary)',
                      }}
                    />
                  </div>
                )}

                {/* Track Discussion Outlook */}
                {bulletin.trackOutlook && (
                  <div style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: 'rgba(107, 69, 40, 0.03)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Track & Intensity Outlook
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {bulletin.trackOutlook}
                    </div>
                  </div>
                )}

                {/* Forecast Positions */}
                {bulletin.forecastPositions.length > 0 && (
                  <div style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: 'rgba(107, 69, 40, 0.03)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Forecast Positions
                    </div>
                    {bulletin.forecastPositions.map((fp, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                        padding: '6px 0',
                        borderBottom: i < bulletin.forecastPositions.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: 'var(--accent)', marginTop: '4px', flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{fp.time}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{fp.position}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Source + View Full */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: '4px',
            }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                Source: DOST-PAGASA • Scraped {data?.scrapedAt ? new Date(data.scrapedAt).toLocaleTimeString() : ''}
              </span>
              <a
                href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', color: 'var(--accent)', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View Full <ExternalLink size={9} />
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Mobile: bottom sheet pattern
  if (mobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`pagasa-sheet-backdrop ${visible ? 'pagasa-sheet-backdrop-open' : 'pagasa-sheet-backdrop-closed'}`}
          onClick={onClose}
        />

        {/* Sheet */}
        <div className={`pagasa-sheet ${visible ? 'pagasa-sheet-open' : 'pagasa-sheet-closed'}`}>
          {/* Drag handle */}
          <div className="pagasa-sheet-handle">
            <div className="pagasa-sheet-handle-bar" />
          </div>

          {panelContent}
        </div>
      </>
    );
  }

  // Desktop: floating centered card
  return (
    <div className="pagasa-panel" style={{
      position: 'fixed',
      bottom: 'var(--pagasa-panel-bottom, 24px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'var(--pagasa-panel-width, 480px)',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'var(--pagasa-panel-max-height, 80vh)',
      zIndex: 1005,
      borderRadius: 'var(--pagasa-panel-radius, 20px)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      backdropFilter: 'blur(var(--glass-blur))',
      boxShadow: 'var(--shadow-lg)',
      animation: 'pagasaSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {panelContent}
    </div>
  );
}
