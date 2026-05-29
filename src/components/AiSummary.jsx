import { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, BarChart3, MessageCircle } from 'lucide-react';
import { Cloud, Thermometer, Droplets, ShieldCheck, Sun } from 'lucide-react';
import { Wind as WindIcon } from 'lucide-react';
import CloudlyMark from './CloudlyMark';
import AiChat from './AiChat';

const SECTIONS = [
  { key: 'weather',     label: 'Weather',      icon: 'cloud'       },
  { key: 'temperature', label: 'Temperature',  icon: 'thermometer' },
  { key: 'wind',        label: 'Wind',         icon: 'wind'        },
  { key: 'rain',        label: 'Rain Outlook', icon: 'droplets'    },
  { key: 'air_quality', label: 'Air Quality',  icon: 'shield'      },
  { key: 'uv',          label: 'UV Index',     icon: 'sun'         },
];

function SectionIcon({ type }) {
  const props = { size: 14, style: { color: 'var(--accent-primary)' } };
  if (type === 'cloud')       return <Cloud {...props} />;
  if (type === 'thermometer') return <Thermometer {...props} />;
  if (type === 'wind')        return <WindIcon {...props} />;
  if (type === 'droplets')    return <Droplets {...props} />;
  if (type === 'shield')      return <ShieldCheck {...props} />;
  if (type === 'sun')         return <Sun {...props} />;
  return null;
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const GEMINI_STREAM_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;

// Marker keys that map directly to section keys
const MARKER_KEYS = ['weather', 'temperature', 'wind', 'rain', 'air_quality', 'uv'];

function getCacheKey(city) {
  return `ai_summary_v4_${(city || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;
}

function safeLoadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'weather' in parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}

// Parse a streamed text buffer into completed sections
// Format: "[weather] sentence.\n[temperature] sentence.\n..."
function parseStreamedSections(buffer) {
  const result = {};
  const regex = /\[(\w+)\]([^\[]+)/g;
  let match;
  while ((match = regex.exec(buffer)) !== null) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (MARKER_KEYS.includes(key) && val) {
      result[key] = val;
    }
  }
  return result;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'chat',     label: 'Chat',     icon: MessageCircle },
];

export default function AiSummary({ weatherData, aqiData, currentLocation, pagasaData }) {
  const city = currentLocation?.city || 'this location';

  const [activeTab, setActiveTab] = useState('overview');
  const [sections, setSections] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    setSections(safeLoadCache(getCacheKey(city)));
    setError('');
  }, [city]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generateSummary = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);
    setError('');
    setSections({});

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY in .env');

      const temp     = Math.round(weatherData?.current?.temperature_2m ?? 0);
      const apparent = Math.round(weatherData?.current?.apparent_temperature ?? temp);
      const humidity = weatherData?.current?.relative_humidity_2m ?? 'N/A';
      const wind     = weatherData?.current?.wind_speed_10m ?? 'N/A';
      const windDir  = weatherData?.current?.wind_direction_10m ?? 'N/A';
      const rainProb = weatherData?.hourly?.precipitation_probability?.[0] ?? 0;
      const uvIndex  = weatherData?.daily?.uv_index_max?.[0] ?? 'N/A';
      const aqi      = aqiData?.current?.us_aqi ?? 'N/A';
      const pm25     = aqiData?.current?.pm2_5 ?? 'N/A';

      // ✅ Compact marker-based prompt — no JSON, ~40% fewer tokens
      const prompt = `Weather report for ${city}. Data: ${temp}°C(feels ${apparent}°C), ${humidity}%RH, wind ${wind}km/h dir ${windDir}°, rain ${rainProb}%, UV ${uvIndex}, AQI ${aqi} PM2.5 ${pm25}µg.
Output exactly 6 lines using these markers. Each line: one friendly sentence with exact numbers.
[weather] ...
[temperature] ...
[wind] ...
[rain] ...
[air_quality] ...
[uv] ...`;

      const res = await fetch(GEMINI_STREAM_URL(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawAccum = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (delta) {
              rawAccum += delta;
              // Re-parse completed sections on every chunk and update UI live
              setSections(parseStreamedSections(rawAccum));
            }
          } catch { /* skip malformed */ }
        }
      }

      // Final parse + cache
      const finalSections = parseStreamedSections(rawAccum);
      setSections(finalSections);
      try { localStorage.setItem(getCacheKey(city), JSON.stringify(finalSections)); } catch { /* ignore */ }

    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setSections(null);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="w-full flex flex-col" style={{ background: 'var(--bg-secondary)', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-[15px] font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
          <CloudlyMark size={22} />
          Cloudly Weather
        </h3>
      </div>

      {/* Tab Bar */}
      <div className="relative flex gap-1 flex-shrink-0"
           style={{
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
          width: 'calc((100% - 8px - 4px) / 2)',
          height: 'calc(100% - 8px)',
          background: 'var(--accent-primary, #6366f1)',
          borderRadius: '10px',
          transition: 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: activeTab === 'overview' ? 'translateX(0)' : 'translateX(calc(100% + 4px))',
          zIndex: 0,
        }} />

        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="ai-tab-btn flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{
              background: 'transparent',
              color: activeTab === id ? 'white' : 'var(--text-secondary)',
              border: '1px solid transparent',
              transition: 'color 0.22s ease',
              zIndex: 1,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content — key forces remount + animation on every tab switch */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div key={activeTab} style={{ animation: 'tabSlide 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)', height: '100%' }}>
        {activeTab === 'overview' ? (
          /* ===== OVERVIEW TAB ===== */
          <div>
            {/* Action button */}
            <div className="flex justify-end px-5 pt-3 pb-1">
              <button
                onClick={generateSummary}
                disabled={isStreaming}
                className="text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-opacity"
                style={{ background: 'var(--accent-primary)', color: 'white', opacity: isStreaming ? 0.6 : 1 }}
              >
                {isStreaming
                  ? <><Loader2 size={11} className="animate-spin" /> Generating...</>
                  : sections && Object.keys(sections).length > 0
                    ? <><RefreshCw size={11} /> Refresh</>
                    : <> Summarize</>}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs mx-5 my-3 p-3 rounded-lg"
                   style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {/* Empty state */}
            {!isStreaming && !error && (!sections || Object.keys(sections).length === 0) && (
              <p className="text-xs px-5 py-3" style={{ color: 'var(--text-muted)' }}>
                Click "Summarize" for an AI-powered weather report for {city}.
              </p>
            )}

            {/* Sections — render live as they stream in */}
            {sections && Object.keys(sections).length > 0 && (
              <div>
                {SECTIONS.map(({ key, label, icon }, i) => {
                  const text = sections[key];
                  const isLastSection = key === SECTIONS[SECTIONS.length - 1].key;
                  const isCurrentlyStreaming = isStreaming && !text && i === Object.keys(sections).length;
                  return text ? (
                    <div key={key}
                         className="flex gap-3 px-5 py-3 items-start"
                         style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', animation: 'fadeIn 0.3s ease' }}>
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                           style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <SectionIcon type={icon} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-semibold uppercase tracking-widest block mb-0.5"
                              style={{ color: 'var(--accent-primary)' }}>
                          {label}
                        </span>
                        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {text}
                          {/* Blinking cursor on the last received section while streaming */}
                          {isStreaming && isLastSection && (
                            <span
                              className="inline-block w-0.5 h-3 ml-0.5 align-middle rounded-sm"
                              style={{ background: 'var(--text-secondary)', animation: 'blink 0.8s step-end infinite' }}
                            />
                          )}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        ) : (
          /* ===== CHAT TAB ===== */
          <AiChat
            weatherData={weatherData}
            aqiData={aqiData}
            currentLocation={currentLocation}
            pagasaData={pagasaData}
          />
        )}
        </div>{/* end animation wrapper */}
      </div>
    </div>
  );
}
