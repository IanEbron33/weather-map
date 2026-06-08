import { NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const GEMINI_STREAM_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;

// Simple in-memory rate limiting map
// Tracks request timestamps per IP address
const rateLimitMap = new Map();
const RATE_LIMIT_COUNT = 15; // Max 15 requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip);
  // Clean up expired timestamps older than the sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= RATE_LIMIT_COUNT) {
    return false; // Rate limit exceeded
  }

  activeTimestamps.push(now);
  rateLimitMap.set(ip, activeTimestamps);
  return true; // Request allowed
}

// Clean up stale IP records periodically to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const active = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (active.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, active);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

export async function POST(request) {
  try {
    // 1. Same-Origin CORS Verification
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin) {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return new Response(JSON.stringify({ error: 'CORS policy: Unauthorized origin' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. IP Rate Limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute before trying again.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse request payload
    const { contents } = await request.json();
    if (!contents || !Array.isArray(contents)) {
      return new Response(JSON.stringify({ error: 'Invalid contents structure' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Retrieve API key (kept secure server-side)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Query Google Generative AI streaming endpoint
    const geminiResponse = await fetch(GEMINI_STREAM_URL(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(errText, {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Proxy the stream back to the client using ReadableStream
    const reader = geminiResponse.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
