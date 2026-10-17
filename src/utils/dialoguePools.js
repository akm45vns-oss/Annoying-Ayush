/**
 * Curated Romantic & Playful Dialogue Pools for Annoying Ayush
 * Personalized with dynamic tokens: {gfName} and {ayushName}
 */

export const DIALOGUE_POOLS = {
  // Time-aware affectionate greetings
  morning: [
    "Good morning, {gfName}! Did you dream of me or did I dream of you first? ☀️🥰",
    "Rise and shine, gorgeous! Starting my day by annoying you is my favorite routine. ☕❤️",
    "Good morning to the prettiest girl in the entire universe! ✨",
  ],
  afternoon: [
    "Hey {gfName}! Taking a break? I've been waiting here to distract you. 😜💕",
    "Hope your day is treating you as wonderfully as you treat my heart. 🌸",
    "Reminder: Drink water, eat lunch, and remember that I adore you! 🥪💖",
  ],
  night: [
    "Good night, my sweetest {gfName}. Sleep tight and dream of us! 🌙✨",
    "Don't stay up too late scrolling! Close your pretty eyes soon. 🧸❤️",
    "Sending you 1,000 virtual blankets and infinite cuddles for tonight. 💤🥰",
  ],
  generalGreetings: [
    "Oh, you're back! I was waiting for you. ❤️",
    "Caught you smiling at your phone again. 😏",
    "I was just thinking about you... and then you showed up! 🥰",
    "Warning: Extreme cuteness ahead! Approach with cuddles 🧸",
    "You looked extra gorgeous today, just had to let you know! ✨",
  ],

  // Cute teasing & touch reactions
  teasing: [
    "Stop poking me! ...Actually, don't stop. 😜",
    "Hey! My cheeks are not mochi! ...Okay maybe they are! 🥟🥰",
    "Tickle tickle! Can't keep your hands off me, huh? 🙈",
    "Poke me again and I will send you 50 voice notes! 🎙️",
    "You did that on purpose, didn't you? 😜",
  ],

  // Mock-annoyed responses (rapid taps)
  mockAnnoyed: [
    "Ayush.exe has stopped being serious! 😤😂",
    "Okay, okay, I surrender! Stoppp poking! 🏳️😆",
    "Why must you tease me so much?! (Secretly love it though) 🥺",
    "Fine, one more hug. But that's it! 🙈❤️",
    "Okay, fine. You win. You're my favorite person. 🥰",
  ],

  // Compliments
  compliments: [
    "You make even my virtual world better. 💖",
    "Did you know you have the prettiest smile ever? Because you do. 🌸",
    "Out of all the people on Earth, you're the only one I want to annoy forever! 🌍✨",
    "You're cute, you're sweet, and you're officially stuck with me! 🥰",
    "Every second making you smile is my absolute favorite second. 💫",
  ],

  // Kiss reactions
  kiss: [
    "One kiss? I think I deserve at least three! 😘✨",
    "MWAHHH! 💋 Sending that kiss directly to your cheek!",
    "Catch! That's 10,000 kisses compressed into one! 💖",
    "Flying kiss delivered safely! Check your heart! 💌",
    "Mwah! My cheeks are burning pink now! 😳💋",
  ],

  // Hug reactions
  hug: [
    "Aww, wrap your arms around me! Squeeeeze! 🧸❤️",
    "Big warm virtual hug locked in! Don't let go! 🥰✨",
    "I wish I could wrap you in this hug in real life right now! 💖",
    "Warm cuddles mode activated! You're so cozy, {gfName}! 🌸",
  ],

  // Blush reactions
  blush: [
    "Stop looking at me like that, you're making me blush for real! 😳🙈",
    "Look what you did! My cheeks are 100% strawberry pink now! 🍓🥰",
    "You always have this effect on me... even in 3D! 💖",
    "Eeep! Why are you so cute?! It's unfair! 🥺🌸",
  ],

  // Cuddle reactions
  cuddle: [
    "Virtual cuddles are good, but real cuddles with you are 1000x better! 🧸❤️",
    "Snuggling right next to you. Cozy, warm, and safe. 🥰✨",
    "Let's just stay like this forever, okay? 🌸",
    "You + Me + Blanket = Perfection. 💖",
  ],

  // Encouraging messages
  encouraging: [
    "Whatever you're working on today, you've got this! I'm your #1 fan! 🌟",
    "Take a deep breath. You are capable of amazing things, my love! 💪❤️",
    "Proud of you always, even on days when you feel tired. 🌸",
    "Don't stress, {gfName}! Everything will work out wonderfully! 🌈",
  ],

  // Special love notes
  loveNotes: [
    "This little world was made just for you, {gfName}. 💗",
    "I love you more than words, code, or pixels can ever express. 💌",
    "No matter where you are, a piece of my heart is always right beside you. ✨",
    "Thank you for being the sweetest, funniest, most loving partner ever. 🌸❤️",
    "You're my today, my tomorrow, and my forever favorite human. 🥰",
  ],

  // Secret unlockables
  secretHeartUnlocked: [
    "YOU FOUND MY SECRET! 💌 You tapped my heart 5 times! I love you endlessly! 💖",
  ],
  comboUnlocked: [
    "SECRET COMBO UNLOCKED! 🌟 Kiss + Hug + Blush = Pure Romance! You know the way to my heart! 🥰",
  ],
};

/**
 * Get a time-aware greeting
 */
export function getTimeAwareGreeting(gfName = 'Babe', ayushName = 'Ayush') {
  const hour = new Date().getHours();
  let pool = DIALOGUE_POOLS.generalGreetings;
  if (hour >= 5 && hour < 12) {
    pool = DIALOGUE_POOLS.morning;
  } else if (hour >= 12 && hour < 18) {
    pool = DIALOGUE_POOLS.afternoon;
  } else if (hour >= 21 || hour < 5) {
    pool = DIALOGUE_POOLS.night;
  }

  const raw = pool[Math.floor(Math.random() * pool.length)];
  return formatDialogue(raw, gfName, ayushName);
}

/**
 * Format string replacing {gfName} and {ayushName}
 */
export function formatDialogue(template, gfName = 'Babe', ayushName = 'Ayush') {
  if (!template) return '';
  return template
    .replace(/{gfName}/g, gfName || 'Babe')
    .replace(/{ayushName}/g, ayushName || 'Ayush');
}

/**
 * Get random dialogue from a category
 */
export function getRandomFromCategory(category, gfName = 'Babe', ayushName = 'Ayush') {
  const list = DIALOGUE_POOLS[category] || DIALOGUE_POOLS.compliments;
  const raw = list[Math.floor(Math.random() * list.length)];
  return formatDialogue(raw, gfName, ayushName);
}
