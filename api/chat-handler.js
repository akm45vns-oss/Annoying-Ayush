/**
 * Server-Side Multi-Provider AI Chat Handler for Annoying Ayush
 * 
 * Multi-Tier Failover Architecture:
 * - Tier 1: Groq Cloud (Ultra-fast, Llama/Qwen, 100% Free)
 * - Tier 2 Failover: Google Gemini (Gemini Flash, 100% Free)
 * - Tier 3 Failover: OpenAI (if configured)
 * - Tier 4 Fail-Safe: Intelligent Contextual Offline Fallback (never leaves user with an error)
 */

import { createRateLimiter, getClientIp } from './rateLimiter.js';

// Process-local bounded rate limiter for chat (25 requests/minute per client IP)
export const chatRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  maxEntries: 1000,
  name: 'chat'
});

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
function inferCharacterReaction(text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('kiss') || lower.includes('mwah') || lower.includes('😘') || lower.includes('💋')) {
    return 'kiss';
  }
  if (lower.includes('hug') || lower.includes('cuddle') || lower.includes('hold you') || lower.includes('snuggle') || lower.includes('blanket') || lower.includes('🧸')) {
    return 'hug';
  }
  if (lower.includes('blush') || lower.includes('cute') || lower.includes('pretty') || lower.includes('gorgeous') || lower.includes('dork') || lower.includes('flustered') || lower.includes('😳')) {
    return 'blush';
  }
  if (lower.includes('haha') || lower.includes('annoying') || lower.includes('tease') || lower.includes('joke') || lower.includes('😂') || lower.includes('😜') || lower.includes('mission accomplished')) {
    return 'laugh';
  }
  return 'happy';
}

// Built-in intelligent offline fallback generator (guarantees zero-failure resilience)
function generateServerFallback(userText = '', gfName = 'Babe', ayushName = 'Ayush') {
  const lower = userText.toLowerCase().trim();

  const pools = {
    missYou: [
      `Aww, come here 🥺 Sending you the biggest virtual hug until I can annoy you properly in real life!`,
      `I miss you more, ${gfName}! Every single second without you is completely boring. ❤️`,
      `Look at your screen... that's me sending 1,000 warm cuddles right to your heart! 🧸💕`,
    ],
    annoying: [
      `Mission accomplished 😌 But admit it, your day would be so boring without me!`,
      `Hey! That's '${ayushName}, your favorite human nuisance' to you! 😜`,
      `Complain all you want, ${gfName}, you're officially stuck with me forever! 🥰`,
      `I'm not annoying, I'm just passionately dedicated to keeping you entertained! 😂✨`,
    ],
    loveYou: [
      `I love you 10,000x more than code, pixels, or words could ever express! 💖`,
      `One sweet message from you and I'm grinning at my screen like a dork. 😳❤️`,
      `Catch! That's infinite love beamed directly into your hands! 💌✨`,
      `You're my today, my tomorrow, and my absolute favorite person in the universe. 🥰`,
    ],
    whatDoing: [
      `Waiting for my favourite person to give me some attention. I've been standing here looking cute all day 😂`,
      `Thinking about you... and planning my next 50 jokes to make you smile! 😜`,
      `Practicing my best cartoon poses so I look handsome when you open this app! 🕺✨`,
    ],
    sadOrStressed: [
      `Hey, come here for a virtual hug. ❤️ You don't have to pretend to be okay with me. Want to tell me what's bothering you?`,
      `Take a deep breath, my love. Whatever happened today, you're capable of anything and I'm right beside you. 🌸`,
      `Sending you infinite blankets, hot tea, and cozy vibes. I'm always on your team, ${gfName}! 🧸💖`,
    ],
    greetings: [
      `Hey ${gfName}! My virtual heart skipped a beat when you opened our chat! 🥰`,
      `Look who decided to grace my screen with their beauty! What's on your mind? ✨`,
      `Finally! I was getting lonely standing here in 3D! 😜💕`,
    ],
    kissesAndHugs: [
      `MWAHHH! 💋 100 kisses delivered straight to your cheeks!`,
      `Virtual hug locked in! Squeeeeze! Don't let go! 🧸❤️`,
      `Cuddling right next to you now. Warm and safe. 🥰🌸`,
    ],
    general: [
      `You always know how to make me smile through a screen, ${gfName}. 🥰`,
      `Tell me everything! I'm all ears (and a cute cartoon hoodie). 👂✨`,
      `Whatever you do today, remember that you're adored by your favorite boy! 💖`,
      `Haha you're too cute! Keep chatting with me, I love hearing from you. 🌸`,
    ],
  };

  let pool = pools.general;
  if (lower.includes('miss') || lower.includes('where are you') || lower.includes('wish you were here')) {
    pool = pools.missYou;
  } else if (lower.includes('annoy') || lower.includes('stop') || lower.includes('dork') || lower.includes('idiot') || lower.includes('shut up')) {
    pool = pools.annoying;
  } else if (lower.includes('love') || lower.includes('adore') || lower.includes('cute') || lower.includes('sweet')) {
    pool = pools.loveYou;
  } else if (lower.includes('what are you doing') || lower.includes('wyd') || lower.includes('what r u doing') || lower.includes('doing')) {
    pool = pools.whatDoing;
  } else if (lower.includes('sad') || lower.includes('stress') || lower.includes('tired') || lower.includes('cry') || lower.includes('bad day') || lower.includes('hurt') || lower.includes('exhausted')) {
    pool = pools.sadOrStressed;
  } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good night') || lower.includes('yo')) {
    pool = pools.greetings;
  } else if (lower.includes('kiss') || lower.includes('hug') || lower.includes('cuddle') || lower.includes('snuggle')) {
    pool = pools.kissesAndHugs;
  }

  const reply = pool[Math.floor(Math.random() * pool.length)];
  return {
    reply,
    reaction: inferCharacterReaction(reply),
    isOfflineFallback: true
  };
}

// Call Google Gemini API
async function callGemini(apiKey, systemPrompt, history, userMessage, model = 'gemini-flash-latest') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];

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
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 80)}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Gemini returned an empty reply.');
  }

  return reply.trim();
}

// Call OpenAI-compatible APIs (Groq, OpenAI, OpenRouter)
async function callOpenAICompatible(apiKey, baseURL, model, systemPrompt, history, userMessage, providerLabel = 'ai') {
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
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`${providerLabel} error ${response.status}: ${errText.slice(0, 80)}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error(`${providerLabel} returned an empty reply.`);
  }

  return reply.trim();
}

/**
 * Main request dispatcher with Automatic Multi-Tier Failover Protection
 */
export async function handleChatRequest(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = chatRateLimiter.check(clientIp);
  if (!rateLimitResult.allowed) {
    res.statusCode = rateLimitResult.status;
    res.end(JSON.stringify({ 
      ok: false, 
      error: rateLimitResult.error,
      rateLimited: rateLimitResult.status === 429
    }));
    return;
  }

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

  const userMessage = rawMessage.trim().slice(0, 500);
  const gfName = String(body.gfName || 'Babe').trim().slice(0, 30);
  const ayushName = String(body.ayushName || 'Ayush').trim().slice(0, 30);
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // If no keys configured at all, gracefully use intelligent offline fallback
  if (!groqKey && !geminiKey && !openaiKey) {
    const fallback = generateServerFallback(userMessage, gfName, ayushName);
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      configured: false,
      reply: fallback.reply,
      reaction: fallback.reaction,
      provider: 'offline-fallback',
      isOfflineFallback: true
    }));
    return;
  }

  const systemPrompt = buildSystemPrompt(gfName, ayushName);
  let replyText = '';
  let providerName = '';

  // =========================================================================
  // TIER 1: Try Groq Cloud (Ultra-fast)
  // =========================================================================
  if (groqKey) {
    try {
      const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
      replyText = await callOpenAICompatible(groqKey, 'https://api.groq.com/openai/v1', model, systemPrompt, history, userMessage, 'Groq');
      providerName = 'groq';
    } catch (err) {
      console.warn('Groq failed, attempting failover to Gemini:', err.message);
    }
  }

  // =========================================================================
  // TIER 2 FAILOVER: Try Google Gemini (Gemini Flash)
  // =========================================================================
  if (!replyText && geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
      replyText = await callGemini(geminiKey, systemPrompt, history, userMessage, model);
      providerName = 'gemini';
    } catch (err) {
      console.warn('Gemini failed, attempting failover to OpenAI:', err.message);
    }
  }

  // =========================================================================
  // TIER 3 FAILOVER: Try OpenAI (if configured)
  // =========================================================================
  if (!replyText && openaiKey) {
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      replyText = await callOpenAICompatible(openaiKey, baseURL, model, systemPrompt, history, userMessage, 'OpenAI');
      providerName = 'openai';
    } catch (err) {
      console.warn('OpenAI failed:', err.message);
    }
  }

  // =========================================================================
  // TIER 4 FAIL-SAFE: Smart Offline Fallback (Guarantees 100% Resilience)
  // =========================================================================
  if (!replyText) {
    console.warn('All AI providers exhausted. Using intelligent offline fallback response.');
    const fallback = generateServerFallback(userMessage, gfName, ayushName);
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      configured: true,
      reply: fallback.reply,
      reaction: fallback.reaction,
      provider: 'offline-fallback',
      isOfflineFallback: true
    }));
    return;
  }

  const reaction = inferCharacterReaction(replyText);

  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    configured: true,
    reply: replyText,
    reaction,
    provider: providerName,
    isOfflineFallback: false
  }));
}
