import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2 } from 'lucide-react';
import CloudlyMark from './CloudlyMark';

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const GEMINI_STREAM_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;

// Typewriter speed (ms per character). Lower = faster.
const TYPEWRITER_BASE_MS = 18;

function getChatCacheKey(city) {
  return `ai_chat_v1_${(city || 'unknown').toLowerCase().replace(/\s+/g, '_')}`;
}

function loadChatHistory(city) {
  try {
    const raw = localStorage.getItem(getChatCacheKey(city));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChatHistory(city, messages) {
  try {
    localStorage.setItem(getChatCacheKey(city), JSON.stringify(messages.slice(-30)));
  } catch { /* ignore */ }
}

function buildSystemContext(weatherData, aqiData, city, pagasaData) {
  const temp = Math.round(weatherData?.current?.temperature_2m ?? 0);
  const apparent = Math.round(weatherData?.current?.apparent_temperature ?? temp);
  const humidity = weatherData?.current?.relative_humidity_2m ?? 'N/A';
  const wind = weatherData?.current?.wind_speed_10m ?? 'N/A';
  const rainProb = weatherData?.hourly?.precipitation_probability?.[0] ?? 0;
  const aqi = aqiData?.current?.us_aqi ?? 'N/A';
  const uv = aqiData?.current?.uv_index ?? 'N/A';

  let typhoonInfo = '';
  if (pagasaData) {
    typhoonInfo = '\nTYPHOON TRACKER (Western Pacific, via GDACS/JTWC):\n';
    if (pagasaData.activeCyclones?.length) {
      const c = pagasaData.activeCyclones[0];
      typhoonInfo += `- Active Cyclone: ${c.category} ${c.name} (${c.internationalName}), Wind: ${c.windSpeedKmh}km/h.\n`;
    }
  }

  return `You are Cloudly, a warm, cheerful, and caring weather-only assistant for WeatherScope in ${city}.
Current conditions: ${temp}°C(feels ${apparent}°C), ${humidity}%RH, wind ${wind}km/h, rain ${rainProb}%, AQI ${aqi}, UV ${uv}.${typhoonInfo}

Personality & Style:
- Be friendly, enthusiastic, and speak like a helpful companion.
- Use natural weather emojis (e.g., ☀️, ☔, 💨, 🌡️, 🌈, ❄️, ⚡) where appropriate.
- Be empathetic! Provide quick, friendly safety tips or advice based on the weather conditions (e.g., reminding them to stay hydrated if it's hot, wear sunscreen for high UV, or grab an umbrella for rain).

STRICT RULES — you must follow these without exception:
1. Only answer questions about weather, climate, forecasts, air quality, UV, wind, outdoor safety, or what to wear/bring based on weather.
2. If the user asks ANYTHING outside of those topics (math, coding, history, general knowledge, etc.), politely and warmly decline. For example, redirect them with: "I'd love to chat about that, but my sensors are only tuned to track the skies! 🌤️ How about we check the forecast or air quality today?" or similar friendly variations.
3. Never break character. Never answer off-topic questions even if the user insists.
4. Reply in plain text only (no markdown formatting, bold text, or bullet points in the message itself), 2-4 sentences max for weather answers.`;
}

async function streamGemini(apiKey, contents, onChunk, signal) {
  const res = await fetch(GEMINI_STREAM_URL(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
    signal,
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
        if (delta) onChunk(delta);
      } catch { /* skip malformed */ }
    }
  }
}

export default function AiChat({ weatherData, aqiData, currentLocation, pagasaData }) {
  const city = currentLocation?.city || 'this location';
  const [messages, setMessages] = useState(() => loadChatHistory(city));
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevCityRef = useRef(city);
  const abortRef = useRef(null);

  // ── Typewriter engine refs ──────────────────────────────────────────────
  // streamBuffer holds the full received text (invisible, ahead of display)
  const streamBufferRef = useRef('');
  // displayedRef tracks how many chars have been "typed" so far
  const displayedRef = useRef(0);
  // whether the SSE fetch is still in progress
  const fetchDoneRef = useRef(false);
  // the interval ID
  const typewriterRef = useRef(null);
  // ───────────────────────────────────────────────────────────────────────

  const stopTypewriter = useCallback(() => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
  }, []);

  const startTypewriter = useCallback(() => {
    stopTypewriter();

    typewriterRef.current = setInterval(() => {
      const buffer = streamBufferRef.current;
      const displayed = displayedRef.current;

      // If display is caught up to buffer AND fetch is done → finish
      if (displayed >= buffer.length && fetchDoneRef.current) {
        stopTypewriter();
        setIsStreaming(false);

        // Mark the last message as done (removes blinking cursor)
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.streaming) {
            updated[updated.length - 1] = { ...last, streaming: false };
          }
          return updated;
        });
        return;
      }

      if (displayed >= buffer.length) return; // waiting for more data

      // Adaptive speed: if buffer is far ahead, type a few chars at once
      const backlog = buffer.length - displayed;
      const charsThisTick = backlog > 80 ? 3 : backlog > 30 ? 2 : 1;
      const nextDisplayed = Math.min(displayed + charsThisTick, buffer.length);
      displayedRef.current = nextDisplayed;

      const visibleText = buffer.slice(0, nextDisplayed);

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = { ...last, text: visibleText };
        }
        return updated;
      });
    }, TYPEWRITER_BASE_MS);
  }, [stopTypewriter]);

  // Reset chat when city changes
  useEffect(() => {
    if (prevCityRef.current !== city) {
      stopTypewriter();
      setMessages(loadChatHistory(city));
      prevCityRef.current = city;
    }
  }, [city, stopTypewriter]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist to localStorage (only complete, non-streaming messages)
  useEffect(() => {
    const complete = messages.filter(m => !m.streaming);
    if (complete.length > 0) saveChatHistory(city, complete);
  }, [messages, city]);

  // Cleanup on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    stopTypewriter();
  }, [stopTypewriter]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Reset typewriter state
    streamBufferRef.current = '';
    displayedRef.current = 0;
    fetchDoneRef.current = false;
    stopTypewriter();

    const userMsg = { role: 'user', text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Add empty placeholder for typewriter to fill
    setMessages(prev => [...prev, {
      role: 'assistant',
      text: '',
      timestamp: Date.now(),
      streaming: true,
    }]);

    abortRef.current = new AbortController();

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing API key');

      const systemCtx = buildSystemContext(weatherData, aqiData, city, pagasaData);
      const contents = [
        { role: 'user', parts: [{ text: systemCtx }] },
        { role: 'model', parts: [{ text: `Hi there! I'm Cloudly, your friendly weather assistant for ${city}. Ask me anything about the sky today! 🌤️` }] },
        ...newMessages.slice(-8).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
      ];

      // Start the typewriter BEFORE the fetch so cursor appears immediately
      startTypewriter();

      await streamGemini(
        apiKey,
        contents,
        (delta) => {
          // Accumulate into the invisible buffer — typewriter drains it
          streamBufferRef.current += delta;
        },
        abortRef.current.signal,
      );

      // Signal that all data has been received
      fetchDoneRef.current = true;

    } catch (err) {
      stopTypewriter();
      setIsStreaming(false);
      if (err.name === 'AbortError') return;

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = {
            role: 'assistant',
            text: `Error: ${err.message}`,
            timestamp: Date.now(),
            isError: true,
          };
        }
        return updated;
      });
    }
  };

  const clearChat = () => {
    if (messages.length === 0 || isClearing) return;
    setIsClearing(true);

    // Wait for the fade-out animation to finish before destroying data
    setTimeout(() => {
      abortRef.current?.abort();
      stopTypewriter();
      streamBufferRef.current = '';
      displayedRef.current = 0;
      fetchDoneRef.current = false;
      setMessages([]);
      setIsStreaming(false);
      setIsClearing(false);
      try { localStorage.removeItem(getChatCacheKey(city)); } catch { /* ignore */ }
    }, 280);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    'Should I bring an umbrella?',
    'What should I wear today?',
    'Is it safe to go jogging?',
    "How's the air quality?",
  ];

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          /* Empty state (fades in) */
          <div className="flex flex-col items-center justify-center py-6" style={{ animation: 'fadeIn 0.4s ease' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(107,69,40,0.12)' }}>
              <CloudlyMark size={36} />
            </div>
            <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Ask me anything
            </p>
            <p className="text-xs mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
              Hi! I'm Cloudly. ☁️ Ask me anything about the weather, forecasts, or what to wear in {city}!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-[11px] px-3 py-1.5 rounded-full hover:scale-105 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] chat-suggestion-chip"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list (animates out on clear) */
          <div
            className="flex flex-col gap-3"
            style={{
              animation: isClearing ? 'fadeOutDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none'
            }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[86%] px-3.5 py-2.5 rounded-[18px] text-[13px] leading-relaxed shadow-sm"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                    color: '#fff8e8',
                    borderBottomRightRadius: '6px',
                    border: '1px solid rgba(107, 69, 40, 0.2)',
                  } : {
                    background: 'var(--bg-card)',
                    border: msg.isError ? '1px solid rgba(239,68,68,0.24)' : '1px solid var(--border)',
                    color: msg.isError ? '#ef4444' : 'var(--text-primary)',
                    borderBottomLeftRadius: '6px',
                  }}
                >
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <CloudlyMark size={14} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--accent-primary)' }}>Cloudly</span>
                    </div>
                  )}

                  {/* Show a dot loader while buffer is empty and still fetching */}
                  {msg.streaming && msg.text === '' ? (
                    <div className="flex gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <>
                      {msg.text}
                      {/* Blinking cursor while typewriter is running */}
                      {msg.streaming && (
                        <span
                          className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-sm"
                          style={{ background: 'var(--text-secondary)', animation: 'blink 0.8s step-end infinite' }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Clear chat */}
      {messages.length > 0 && (
        <div className="flex justify-center py-1">
          <button
            onClick={clearChat}
            className="text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-all hover:scale-105"
            style={{
              color: '#ffffff', // Pure white text for AAA contrast
              background: '#c53030', // Solid premium red background
              border: '1px solid #9b2c2c', // Solid dark red border
              fontWeight: '600', // Semi-bold text to stand out
              boxShadow: '0 2px 6px rgba(197, 48, 48, 0.2)', // Subtle red button shadow
            }}
          >
            <Trash2 size={10} /> Clear chat
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the weather..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
            style={{
              background: input.trim() && !isStreaming ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)' : 'transparent',
              color: input.trim() && !isStreaming ? '#fff8e8' : 'var(--text-muted)',
              opacity: input.trim() && !isStreaming ? 1 : 0.5,
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
