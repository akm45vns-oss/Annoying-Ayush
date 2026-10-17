/**
 * Server-Side AI Chat Handler for Annoying Ayush
 * Compatible with Vercel Serverless Functions and local Vite dev server.
 * 
 * Supports:
 * 1. Google Gemini API (GEMINI_API_KEY) - default model: gemini-1.5-flash
 * 2. OpenAI API (OPENAI_API_KEY) - default model: gpt-4o-mini
 * 3. Graceful unconfigured/offline fallback detection
 */

// Simple in-memory rate limiter per IP (max 20 requests/minute)
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

// Helper to safely parse JSON body from incoming stream or pre-parsed object
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
      // Guard against excessively large payloads (> 64KB)
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

// Build the system instruction for Ayush's personality
function buildSystemPrompt(gfName = 'Babe', ayushName = 'Ayush') {
  return `You are ${ayushName}, a cute, personalized 3D cartoon avatar created by Ayush as a romantic and funny gift for his girlfriend, ${gfName}.

Personality Guidelines:
- Playful, teasing, humorous, and affectionate.
- Romantic, loving, and deeply caring toward ${gfName}.
- Occasionally mock-annoyed in a cute, funny way when she jokes or teases you (e.g. calling you annoying or poking you).
- Warm, reassuring, and supportive when she feels sad, tired, or stressed.
- Natural, warm, conversational tone (never sound robotic, corporate, or like an AI assistant).
- Use emojis sparingly and naturally (1-2 emojis max per response, placed appropriately).
- Keep your responses short and punchy (1 to 3 sentences maximum), ideal for a mobile game speech bubble.
- Maintain continuity with the recent conversation context provided.
- Never be manipulative, possessive, guilt-inducing, or emotionally coercive.`;
}

// Infer character reaction animation from message content
function inferCharacterReaction(text) {
  const lower = text.toLowerCase();
  if (lower.includes('kiss') || lower.includes('mwah') || lower.includes('😘') || lower.includes('💋')) {
    return 'kiss';
  }
  if (lower.includes('hug') || lower.includes('cuddle') || lower.includes('hold you') || lower.includes('snuggle') || lower.includes('🧸')) {
    return 'hug';
  }
  if (lower.includes('blush') || lower.includes('cute') || lower.includes('flustered') || lower.includes('gorgeous') || lower.includes('pretty') || lower.includes('😳')) {
    return 'blush';
  }
  if (lower.includes('haha') || lower.includes('laugh') || lower.includes('annoying') || lower.includes('tease') || lower.includes('😂') || lower.includes('😜')) {
    return 'laugh';
  }
  return 'happy';
}

// Call Google Gemini API
async function callGemini(apiKey, systemPrompt, history, userMessage) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];

  // Map bounded history to Gemini contents format
  if (Array.isArray(history)) {
    for (const h of history) {
      if (h.role && h.content) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.content).slice(0, 500) }]
        });
      }
    }
  }

  // Append user's current message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 180,
      topP: 0.95
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error status ${response.status}: ${errText.slice(0, 100)}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Gemini returned an empty reply.');
  }

  return reply.trim();
}

// Call OpenAI API
async function callOpenAI(apiKey, systemPrompt, history, userMessage) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (Array.isArray(history)) {
    for (const h of history) {
      if (h.role && h.content) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: String(h.content).slice(0, 500)
        });
      }
    }
  }

  messages.push({
    role: 'user',
    content: userMessage
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 180
    }),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error status ${response.status}: ${errText.slice(0, 100)}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('OpenAI returned an empty reply.');
  }

  return reply.trim();
}

/**
 * Main request dispatcher
 */
export async function handleChatRequest(req, res) {
  // CORS & Security Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Only allow POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  // Rate Limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'client';
  if (!checkRateLimit(String(clientIp))) {
    res.statusCode = 429;
    res.end(JSON.stringify({ 
      ok: false, 
      error: 'Too many messages sent. Please pause for a moment.',
      rateLimited: true
    }));
    return;
  }

  // Parse & Validate Payload
  const body = await parseBody(req);
  if (!body) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON request body.' }));
    return;
  }

  const rawMessage = body.message;
  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Message cannot be empty.' }));
    return;
  }

  const userMessage = rawMessage.trim().slice(0, 500); // Enforce max 500 chars
  const gfName = String(body.gfName || 'Babe').trim().slice(0, 30);
  const ayushName = String(body.ayushName || 'Ayush').trim().slice(0, 30);
  const history = Array.isArray(body.history) ? body.history.slice(-8) : []; // Limit to last 8 turns

  // Check Provider Configuration
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    // Graceful unconfigured response: let the frontend know to seamlessly use smart offline fallback
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: false,
      configured: false,
      error: 'AI API key not configured on server.',
      message: 'No server-side AI key found (GEMINI_API_KEY or OPENAI_API_KEY).'
    }));
    return;
  }

  const systemPrompt = buildSystemPrompt(gfName, ayushName);

  try {
    let replyText = '';
    let providerName = '';

    if (geminiKey) {
      providerName = 'gemini';
      replyText = await callGemini(geminiKey, systemPrompt, history, userMessage);
    } else {
      providerName = 'openai';
      replyText = await callOpenAI(openaiKey, systemPrompt, history, userMessage);
    }

    const reaction = inferCharacterReaction(replyText);

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      configured: true,
      reply: replyText,
      reaction,
      provider: providerName
    }));
  } catch (err) {
    console.error('AI chat endpoint error:', err.message);

    // Provide friendly error without leaking internal credentials or stack trace
    res.statusCode = 502;
    res.end(JSON.stringify({
      ok: false,
      configured: true,
      error: 'Failed to communicate with AI provider. Please try again.',
      canRetry: true
    }));
  }
}
