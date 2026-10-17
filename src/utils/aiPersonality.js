/**
 * Ayush AI Personality & Intelligent Offline Fallback Engine
 * Provides context-aware romantic responses and character reactions
 * when offline or when no AI API key is configured.
 */

import { formatDialogue } from './dialoguePools.js';

// Categorized fallback dialogue patterns
const FALLBACK_CATEGORIES = {
  missYou: [
    "Aww, come here 🥺 Sending you the biggest virtual hug until I can annoy you properly in real life!",
    "I miss you more! Every single second without you is completely boring. ❤️",
    "Look at your screen... that's me sending 1,000 warm cuddles right to your heart! 🧸💕",
  ],
  annoying: [
    "Mission accomplished 😌 But admit it, your day would be so boring without me!",
    "Hey! That's 'Ayush, your favorite human nuisance' to you! 😜",
    "Complain all you want, {gfName}, you're officially stuck with me forever! 🥰",
    "I'm not annoying, I'm just passionately dedicated to keeping you entertained! 😂✨",
  ],
  loveYou: [
    "I love you 10,000x more than code, pixels, or words could ever express! 💖",
    "One sweet message from you and I'm grinning at my screen like a dork. 😳❤️",
    "Catch! That's infinite love beamed directly into your hands! 💌✨",
    "You're my today, my tomorrow, and my absolute favorite person in the universe. 🥰",
  ],
  whatDoing: [
    "Waiting for my favourite person to give me some attention. I've been standing here looking cute all day 😂",
    "Thinking about you... and planning my next 50 jokes to make you smile! 😜",
    "Practicing my best cartoon poses so I look handsome when you open this app! 🕺✨",
  ],
  sadOrStressed: [
    "Hey, come here for a virtual hug. ❤️ You don't have to pretend to be okay with me. Want to tell me what's bothering you?",
    "Take a deep breath, my love. Whatever happened today, you're capable of anything and I'm right beside you. 🌸",
    "Sending you infinite blankets, hot tea, and cozy vibes. I'm always on your team, {gfName}! 🧸💖",
  ],
  greetings: [
    "Hey {gfName}! My virtual heart skipped a beat when you opened our chat! 🥰",
    "Look who decided to grace my screen with their beauty! What's on your mind? ✨",
    "Finally! I was getting lonely standing here in 3D! 😜💕",
  ],
  kissesAndHugs: [
    "MWAHHH! 💋 100 kisses delivered straight to your cheeks!",
    "Virtual hug locked in! Squeeeeze! Don't let go! 🧸❤️",
    "Cuddling right next to you now. Warm and safe. 🥰🌸",
  ],
  general: [
    "You always know how to make me smile through a screen, {gfName}. 🥰",
    "Tell me everything! I'm all ears (and a cute cartoon hoodie). 👂✨",
    "Whatever you do today, remember that you're adored by your favorite boy! 💖",
    "Haha you're too cute! Keep chatting with me, I love hearing from you. 🌸",
  ],
};

/**
 * Detect the appropriate character animation reaction based on message content
 */
export function detectCharacterReaction(text = '') {
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

/**
 * Generate an offline fallback response based on user input keywords
 */
export function generateOfflineFallback(userText = '', gfName = 'Babe', ayushName = 'Ayush') {
  const lower = userText.toLowerCase().trim();
  let pool = FALLBACK_CATEGORIES.general;

  if (lower.includes('miss') || lower.includes('where are you') || lower.includes('wish you were here')) {
    pool = FALLBACK_CATEGORIES.missYou;
  } else if (lower.includes('annoy') || lower.includes('stop') || lower.includes('dork') || lower.includes('idiot') || lower.includes('shut up')) {
    pool = FALLBACK_CATEGORIES.annoying;
  } else if (lower.includes('love') || lower.includes('adore') || lower.includes('cute') || lower.includes('sweet')) {
    pool = FALLBACK_CATEGORIES.loveYou;
  } else if (lower.includes('what are you doing') || lower.includes('wyd') || lower.includes('what r u doing') || lower.includes('doing')) {
    pool = FALLBACK_CATEGORIES.whatDoing;
  } else if (lower.includes('sad') || lower.includes('stress') || lower.includes('tired') || lower.includes('cry') || lower.includes('bad day') || lower.includes('hurt') || lower.includes('exhausted')) {
    pool = FALLBACK_CATEGORIES.sadOrStressed;
  } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good night') || lower.includes('yo')) {
    pool = FALLBACK_CATEGORIES.greetings;
  } else if (lower.includes('kiss') || lower.includes('hug') || lower.includes('cuddle') || lower.includes('snuggle')) {
    pool = FALLBACK_CATEGORIES.kissesAndHugs;
  }

  const raw = pool[Math.floor(Math.random() * pool.length)];
  const reply = formatDialogue(raw, gfName, ayushName);
  const reaction = detectCharacterReaction(reply);

  return {
    reply,
    reaction,
    isOfflineFallback: true
  };
}
