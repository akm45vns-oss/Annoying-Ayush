/**
 * Server-Side Speech-to-Text (STT) Handler for Annoying Ayush
 * 
 * Supports:
 * - Primary: Groq Cloud Whisper (whisper-large-v3-turbo / whisper-large-v3, ultra-fast transcription)
 * - Secondary Failover: OpenAI Whisper (whisper-1)
 * - Multilingual support: Hindi (hi), English (en), Hinglish, and regional speech
 * - Graceful unconfigured response informing client to use browser speech recognition or client fallback
 * 
 * Security & Reliability:
 * - Application authentication & origin verification via authMiddleware.
 * - In-memory bounded rate limiter per IP with global aggregate quota cap.
 * - Coordinated server deadline (12s) bounded within Vercel execution limits.
 */

import { createRateLimiter, getClientIp } from './rateLimiter.js';
import { verifyApiAccess } from './authMiddleware.js';

// Process-local bounded rate limiter for speech recognition (25 requests/min per IP, global cap 400)
export const sttRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  maxEntries: 1000,
  globalMaxRequests: 400,
  name: 'stt'
});

export const SERVER_STT_DEADLINE_MS = 12000;
const GROQ_MAX_TIMEOUT_MS = 6000;
const OPENAI_MAX_TIMEOUT_MS = 6000;
const MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max upload bound

async function readAudioBuffer(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let totalLength = 0;

    req.on('data', (chunk) => {
      totalLength += chunk.length;
      if (totalLength > MAX_AUDIO_SIZE_BYTES) {
        req.destroy();
        resolve(null);
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', () => resolve(null));
  });
}

export async function handleSttRequest(req, res) {
  const requestStartTime = Date.now();

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      const hasGroq = !!(process.env.GROQ_API_KEY || '').trim();
      const hasOpenAI = !!(process.env.OPENAI_API_KEY || '').trim();
      const configured = hasGroq || hasOpenAI;
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        status: 'ready',
        configured,
        hasGroq,
        hasOpenAI,
        sttProvider: hasGroq ? 'groq-whisper' : (hasOpenAI ? 'openai-whisper' : 'none')
      }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  // Authentication & Origin Check
  const auth = verifyApiAccess(req);
  if (!auth.authorized) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = auth.status;
    res.end(JSON.stringify({ ok: false, error: auth.error }));
    return;
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = sttRateLimiter.check(clientIp);
  if (!rateLimitResult.allowed) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = rateLimitResult.status;
    res.end(JSON.stringify({
      ok: false,
      error: rateLimitResult.error,
      rateLimited: rateLimitResult.status === 429
    }));
    return;
  }

  const audioBuffer = await readAudioBuffer(req);
  if (!audioBuffer || audioBuffer.length < 500) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Invalid or empty audio payload.' }));
    return;
  }

  const rawContentType = req.headers['content-type'] || 'audio/webm';
  const mimeType = rawContentType.split(';')[0].trim() || 'audio/webm';
  const langHeader = req.headers['x-language'] || '';

  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

  // If no server speech-to-text API keys are configured, inform client honestly
  if (!groqKey && !openaiKey) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: false,
      configured: false,
      message: 'GROQ_API_KEY and OPENAI_API_KEY are not configured on server. Using client speech recognition fallback.'
    }));
    return;
  }

  // -------------------------------------------------------------------------
  // TIER 1: Groq Cloud Whisper (Ultra-fast, whisper-large-v3-turbo)
  // -------------------------------------------------------------------------
  if (groqKey) {
    const elapsed = Date.now() - requestStartTime;
    const remainingBudget = SERVER_STT_DEADLINE_MS - elapsed;

    if (remainingBudget >= 2000) {
      const groqTimeout = Math.min(GROQ_MAX_TIMEOUT_MS, remainingBudget);
      try {
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        formData.append('file', blob, `audio.${ext}`);
        formData.append('model', process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');

        if (langHeader && langHeader !== 'auto') {
          const shortLang = langHeader.split('-')[0];
          formData.append('language', shortLang);
        }

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`
          },
          body: formData,
          signal: AbortSignal.timeout(groqTimeout)
        });

        if (response.ok) {
          const data = await response.json();
          const transcriptText = (data.text || '').trim();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            ok: true,
            provider: 'groq',
            text: transcriptText,
            language: data.language || langHeader || 'auto'
          }));
          return;
        }
        console.warn('Groq STT failed with status:', response.status);
      } catch (err) {
        console.warn('Groq STT error, attempting failover:', err.message);
      }
    }
  }

  // -------------------------------------------------------------------------
  // TIER 2: OpenAI Whisper Failover
  // -------------------------------------------------------------------------
  if (openaiKey) {
    const elapsed = Date.now() - requestStartTime;
    const remainingBudget = SERVER_STT_DEADLINE_MS - elapsed;

    if (remainingBudget >= 2000) {
      const openaiTimeout = Math.min(OPENAI_MAX_TIMEOUT_MS, remainingBudget);
      try {
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        formData.append('file', blob, `audio.${ext}`);
        formData.append('model', 'whisper-1');

        if (langHeader && langHeader !== 'auto') {
          formData.append('language', langHeader.split('-')[0]);
        }

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`
          },
          body: formData,
          signal: AbortSignal.timeout(openaiTimeout)
        });

        if (response.ok) {
          const data = await response.json();
          const transcriptText = (data.text || '').trim();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            ok: true,
            provider: 'openai',
            text: transcriptText,
            language: data.language || langHeader || 'auto'
          }));
          return;
        }
        console.warn('OpenAI STT failed with status:', response.status);
      } catch (err) {
        console.warn('OpenAI STT error:', err.message);
      }
    }
  }

  // -------------------------------------------------------------------------
  // TIER 3: Fallback error response
  // -------------------------------------------------------------------------
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: false,
    configured: true,
    providerError: true,
    error: 'Speech recognition service temporarily unavailable.'
  }));
}

