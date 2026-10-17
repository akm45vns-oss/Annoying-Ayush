/**
 * Server-Side Cloned Voice TTS Handler for Annoying Ayush
 * 
 * Supports:
 * - Primary: ElevenLabs Voice Cloning (Instant Voice Clone with custom authorized VOICE_ID)
 * - Secondary Failover: OpenAI TTS (tts-1)
 * - Graceful unconfigured / timeout response informing client to use browser speech synthesis
 * 
 * Security & Reliability:
 * - API keys are strictly read from process.env on the server.
 * - In-memory bounded rate limiter per IP to prevent quota abuse.
 * - Coordinated overall server-side deadline (14s) ensuring provider attempts
 *   and failovers fit within serverless execution limits without hanging.
 */

import { createRateLimiter, getClientIp } from './rateLimiter.js';

// Process-local bounded rate limiter for voice generation (20 requests/minute per client IP)
export const ttsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  maxEntries: 1000,
  name: 'tts'
});

// Coordinated Server Deadlines (Vercel max execution is bounded to 15s)
export const SERVER_TOTAL_DEADLINE_MS = 14000;
const ELEVENLABS_MAX_TIMEOUT_MS = 8000;
const OPENAI_MIN_RESERVE_MS = 3500;
const OPENAI_MAX_TIMEOUT_MS = 5000;
const MIN_TIME_TO_ATTEMPT_MS = 2500;

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 65536) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

export async function handleTtsRequest(req, res) {
  const requestStartTime = Date.now();

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      const configured = !!((process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) || process.env.OPENAI_API_KEY);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, status: 'ready', configured }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = ttsRateLimiter.check(clientIp);
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

  const body = await parseBody(req);
  if (!body || !body.text || typeof body.text !== 'string' || !body.text.trim()) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Text prompt cannot be empty.' }));
    return;
  }

  const text = body.text.trim().slice(0, 400); // Sensible limit per spoken utterance

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const elevenVoiceId = process.env.ELEVENLABS_VOICE_ID;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Unconfigured state: Gracefully let client know to use browser synthesis fallback
  if ((!elevenKey || !elevenVoiceId) && !openaiKey) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: false,
      configured: false,
      message: 'ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are not set on server. Using browser voice fallback.',
      text
    }));
    return;
  }

  // -------------------------------------------------------------------------
  // TIER 1: ElevenLabs Authorized Voice Clone
  // -------------------------------------------------------------------------
  if (elevenKey && elevenVoiceId) {
    const elapsed = Date.now() - requestStartTime;
    const remainingBudget = SERVER_TOTAL_DEADLINE_MS - elapsed;
    const reserveForFallback = openaiKey ? OPENAI_MIN_RESERVE_MS : 0;
    const availableForEleven = remainingBudget - reserveForFallback;

    if (availableForEleven >= MIN_TIME_TO_ATTEMPT_MS) {
      const elevenTimeout = Math.min(ELEVENLABS_MAX_TIMEOUT_MS, availableForEleven);
      try {
        const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
        const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenVoiceId)}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.25,
              use_speaker_boost: true
            }
          }),
          signal: AbortSignal.timeout(elevenTimeout)
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs error: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.statusCode = 200;
        res.end(Buffer.from(audioBuffer));
        return;
      } catch (err) {
        console.warn('ElevenLabs generation failed or timed out, attempting failover:', err.message);
      }
    } else {
      console.warn('Insufficient remaining deadline for ElevenLabs, skipping to failover provider.');
    }
  }

  // -------------------------------------------------------------------------
  // TIER 2 FAILOVER: OpenAI TTS (if configured)
  // -------------------------------------------------------------------------
  if (openaiKey) {
    const elapsed = Date.now() - requestStartTime;
    const remainingForOpenai = SERVER_TOTAL_DEADLINE_MS - elapsed;

    if (remainingForOpenai >= MIN_TIME_TO_ATTEMPT_MS) {
      const openaiTimeout = Math.min(OPENAI_MAX_TIMEOUT_MS, remainingForOpenai - 400);
      try {
        const model = process.env.OPENAI_TTS_MODEL || 'tts-1';
        const voice = process.env.OPENAI_TTS_VOICE || 'echo'; // male/friendly tone

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            input: text,
            voice
          }),
          signal: AbortSignal.timeout(openaiTimeout)
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS error: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.statusCode = 200;
        res.end(Buffer.from(audioBuffer));
        return;
      } catch (err) {
        console.warn('OpenAI TTS failed or timed out:', err.message);
      }
    } else {
      console.warn('Insufficient remaining deadline for OpenAI TTS failover.');
    }
  }

  // If external generation failed or overall budget expired, return fallback payload
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: false,
    configured: true,
    error: 'Voice service unavailable. Using browser fallback voice.',
    text
  }));
}
