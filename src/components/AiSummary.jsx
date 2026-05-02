import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Cloud, Thermometer, Droplets, ShieldCheck, Sun } from 'lucide-react';
import { Wind as WindIcon } from 'lucide-react';
import GeminiIcon from './GeminiIcon';

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

function getCacheKey(city) {
  return `ai_summary_v3_${(city || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;
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

export default function AiSummary({ weatherData, aqiData, currentLocation }) {
  const city = currentLocation?.city || 'this location';

  const [sections, setSections] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSections(safeLoadCache(getCacheKey(city)));
    setError('');
  }, [city]);

  const generateSummary = async () => {
    setIsLoading(true);
    setError('');
    setSections(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY in .env');

      const temp         = Math.round(weatherData?.current?.temperature_2m ?? 0);
      const apparentTemp = Math.round(weatherData?.current?.apparent_temperature ?? temp);
      const humidity     = weatherData?.current?.relative_humidity_2m ?? 'N/A';
      const wind         = weatherData?.current?.wind_speed_10m ?? 'N/A';
      const windDir      = weatherData?.current?.wind_direction_10m ?? 'N/A';
      const rainProb     = weatherData?.hourly?.precipitation_probability?.[0] ?? 0;
      const uvIndex      = weatherData?.daily?.uv_index_max?.[0] ?? 'N/A';
      const aqi          = aqiData?.current?.us_aqi ?? 'N/A';
      const pm25         = aqiData?.current?.pm2_5 ?? 'N/A';

      const prompt = `You are a professional meteorologist. Create a structured weather report for ${city}.

Data:
- Temperature: ${temp}°C, feels like ${apparentTemp}°C
- Humidity: ${humidity}%
- Wind: ${wind} km/h from ${windDir}°
- Rain probability: ${rainProb}%
- UV Index: ${uvIndex}
- AQI (US): ${aqi}, PM2.5: ${pm25} µg/m³

Return ONLY raw JSON (no markdown, no backticks) with exactly these 6 keys:
{"weather":"...","temperature":"...","wind":"...","rain":"...","air_quality":"...","uv":"..."}

Each value: 1 sentence. Include exact numbers. Be friendly and conversational.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      raw = raw.replace(/```json|```/gi, '').trim();

      const parsed = JSON.parse(raw);
      setSections(parsed);
      try { localStorage.setItem(getCacheKey(city), JSON.stringify(parsed)); } catch (_) { /* ignore */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full"
         style={{ background: 'var(--bg-secondary)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-[15px] font-bold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
          <GeminiIcon size={18} id="panel" />
          Gemini Weather Report
        </h3>
        {!isLoading && (
          <button
            onClick={generateSummary}
            className="text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            {sections
              ? <><RefreshCw size={11} /> Refresh</>
              : <> Summarize</>}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm px-5 py-4"
             style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: '#facc15' }} />
          Generating weather report, please wait...
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-xs mx-5 my-3 p-3 rounded-lg"
             style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && !sections && (
        <p className="text-xs px-5 py-3" style={{ color: 'var(--text-muted)' }}>
          Click "Summarize" for an AI-powered weather report for {city}.
        </p>
      )}

      {/* Structured rows */}
      {!isLoading && sections && (
        <div>
          {SECTIONS.map(({ key, label, icon }, i) =>
            sections[key] ? (
              <div key={key}
                   className="flex gap-3 px-5 py-3 items-start"
                   style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
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
                    {sections[key]}
                  </p>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
