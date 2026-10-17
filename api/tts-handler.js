/**
 * Server-Side Cloned Voice TTS Handler for Annoying Ayush
 * 
 * Supports:
 * - Primary: ElevenLabs Voice Cloning (Instant Voice Clone with custom authorized VOICE_ID)
 * - Secondary Failover: OpenAI TTS (tts-1)
 * - Graceful unconfigured response informing client to use browser speech synthesis
 * 
 * Security:
 * - API keys are strictly read from process.env on the server.
 * - In-memory rate limiter per IP to prevent quota abuse.
 */

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.startTime = now;
    rateLimitMap.set(ip, record);
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  rateLimitMap.set(ip, record);
  return true;
}

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
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  const clientIp = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'client';
  if (!checkRateLimit(String(clientIp))) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 429;
    res.end(JSON.stringify({ 
      ok: false, 
      error: 'Too many voice generation requests. Please pause for a moment.',
      rateLimited: true 
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
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`ElevenLabs error ${response.status}:`, errorText);
        throw new Error(`ElevenLabs error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.statusCode = 200;
      res.end(Buffer.from(audioBuffer));
      return;
    } catch (err) {
      console.warn('ElevenLabs generation failed, attempting failover:', err.message);
    }
  }

  // -------------------------------------------------------------------------
  // TIER 2 FAILOVER: OpenAI TTS (if configured)
  // -------------------------------------------------------------------------
  if (openaiKey) {
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
        })
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
      console.warn('OpenAI TTS failed:', err.message);
    }
  }

  // If external generation failed, return fallback payload
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: false,
    configured: true,
    error: 'Voice service unavailable. Using browser fallback voice.',
    text
  }));
}
