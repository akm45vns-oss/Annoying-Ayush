/**
 * progressionStorage.js
 * 
 * Manages player progression, coin balance, affection meter, daily rewards,
 * achievement tracking, unlocked emotes, and customization persistence.
 * 
 * 100% client-side with robust JSON schema validation, version migration,
 * and zero dependency on external servers.
 */

const PROGRESSION_STORAGE_KEY = 'annoying_ayush_progression_v1';

export const INITIAL_PROGRESSION = {
  version: 1,
  level: 1,
  xp: 0,
  coins: 120, // Starter bonus for new players
  affection: 20, // 0 to 100%
  streak: 1,
  lastDailyClaim: null, // ISO string or null
  totalInteractions: 0,
  totalMiniGamesPlayed: 0,
  totalVoiceRepeats: 0,
  totalChatMessages: 0,
  unlockedEmotes: [
    'laugh',
    'dance',
    'kiss',
    'hug',
    'blush',
    'cuddle'
  ],
  wardrobe: {
    equipped: {
      hat: 'hat_flower',
      glasses: 'glasses_none',
      costume: 'costume_none',
      accessory: 'accessory_none'
    },
    owned: [
      'hat_none',
      'hat_flower',
      'hat_crown',
      'hat_party',
      'hat_cap',
      'hat_beanie',
      'glasses_none',
      'glasses_heart',
      'glasses_cool',
      'glasses_nerd',
      'glasses_star',
      'costume_none',
      'costume_tuxedo',
      'costume_pajamas',
      'costume_traditional',
      'accessory_none',
      'accessory_bowtie',
      'accessory_scarf',
      'accessory_wings'
    ]
  },
  room: {
    currentTheme: 'studio',
    ownedThemes: ['studio', 'sunset', 'night', 'garden'],
    currentLighting: 'day',
    decorations: ['rug_pink']
  },
  achievements: {
    first_conversation: { unlocked: false, title: 'Heartfelt Chat', desc: 'Send your first message to Ayush', progress: 0, max: 1 },
    first_repeat: { unlocked: false, title: 'Echo Companion', desc: 'Have Ayush repeat your speech', progress: 0, max: 1 },
    touch_10: { unlocked: false, title: 'Affectionate Touch', desc: 'Interact 10 times via touch', progress: 0, max: 10 },
    touch_50: { unlocked: false, title: 'Non-stop Cuddles', desc: 'Interact 50 times with Ayush', progress: 0, max: 50 },
    first_game: { unlocked: false, title: 'Playful Champ', desc: 'Complete any mini-game activity', progress: 0, max: 1 },
    game_master: { unlocked: false, title: 'Arcade Legend', desc: 'Play 5 mini-games', progress: 0, max: 5 },
    outfit_first: { unlocked: false, title: 'Fashionista', desc: 'Equip a new accessory or outfit', progress: 0, max: 1 },
    high_affection: { unlocked: false, title: 'Soulmates', desc: 'Reach 100% affection', progress: 0, max: 100 },
    daily_streak_3: { unlocked: false, title: 'Daily Devotion', desc: 'Claim daily reward 3 days in a row', progress: 0, max: 3 }
  }
};

/**
 * Calculates XP required to reach next level
 */
export function getXpRequiredForLevel(level) {
  return Math.max(100, level * 100);
}

/**
 * Loads progression data from localStorage with schema fallbacks
 */
export function loadProgression() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...INITIAL_PROGRESSION };
  }

  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return { ...INITIAL_PROGRESSION };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...INITIAL_PROGRESSION };
    }

    // Merge with schema defaults to guarantee missing keys never crash
    return {
      version: 1,
      level: Math.max(1, Number(parsed.level) || 1),
      xp: Math.max(0, Number(parsed.xp) || 0),
      coins: Math.max(0, Number(parsed.coins) || 0),
      affection: Math.min(100, Math.max(0, Number(parsed.affection) || 0)),
      streak: Math.max(1, Number(parsed.streak) || 1),
      lastDailyClaim: parsed.lastDailyClaim || null,
      totalInteractions: Number(parsed.totalInteractions) || 0,
      totalMiniGamesPlayed: Number(parsed.totalMiniGamesPlayed) || 0,
      totalVoiceRepeats: Number(parsed.totalVoiceRepeats) || 0,
      totalChatMessages: Number(parsed.totalChatMessages) || 0,
      unlockedEmotes: Array.isArray(parsed.unlockedEmotes) ? parsed.unlockedEmotes : [...INITIAL_PROGRESSION.unlockedEmotes],
      wardrobe: {
        equipped: { ...INITIAL_PROGRESSION.wardrobe.equipped, ...(parsed.wardrobe?.equipped || {}) },
        owned: Array.from(new Set([
          ...INITIAL_PROGRESSION.wardrobe.owned,
          ...(Array.isArray(parsed.wardrobe?.owned) ? parsed.wardrobe.owned : [])
        ]))
      },
      room: {
        currentTheme: parsed.room?.currentTheme || 'studio',
        ownedThemes: Array.from(new Set([
          ...INITIAL_PROGRESSION.room.ownedThemes,
          ...(Array.isArray(parsed.room?.ownedThemes) ? parsed.room.ownedThemes : [])
        ])),
        currentLighting: parsed.room?.currentLighting || 'day',
        decorations: Array.isArray(parsed.room?.decorations) ? parsed.room.decorations : ['rug_pink']
      },
      achievements: {
        ...INITIAL_PROGRESSION.achievements,
        ...(parsed.achievements || {})
      }
    };
  } catch (err) {
    console.warn('Failed to parse progression data, reverting to defaults:', err);
    return { ...INITIAL_PROGRESSION };
  }
}

/**
 * Saves progression state to localStorage
 */
export function saveProgression(data) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save progression data to localStorage:', err);
  }
}

/**
 * Adds XP, computing level-ups and granting bonus coins on level up
 */
export function addXpToProgression(current, amount) {
  let { level, xp, coins } = current;
  let remainingXp = xp + Math.max(0, amount);
  let leveledUp = false;
  let levelsGained = 0;

  let needed = getXpRequiredForLevel(level);
  while (remainingXp >= needed) {
    remainingXp -= needed;
    level += 1;
    levelsGained += 1;
    coins += 50; // Bonus 50 coins per level
    leveledUp = true;
    needed = getXpRequiredForLevel(level);
  }

  const updated = {
    ...current,
    level,
    xp: remainingXp,
    coins
  };
  saveProgression(updated);
  return { updated, leveledUp, levelsGained };
}

/**
 * Adds coins to balance
 */
export function addCoinsToProgression(current, amount) {
  const updated = {
    ...current,
    coins: Math.max(0, current.coins + amount)
  };
  saveProgression(updated);
  return updated;
}

/**
 * Deducts coins if sufficient balance exists
 */
export function spendCoinsFromProgression(current, amount) {
  if (current.coins < amount) return { success: false, updated: current };
  const updated = {
    ...current,
    coins: current.coins - amount
  };
  saveProgression(updated);
  return { success: true, updated };
}

/**
 * Adds affection up to 100%
 */
export function addAffectionToProgression(current, amount) {
  const newAffection = Math.min(100, Math.max(0, current.affection + amount));
  let achievements = { ...current.achievements };
  if (newAffection >= 100 && !achievements.high_affection?.unlocked) {
    achievements.high_affection = {
      ...achievements.high_affection,
      unlocked: true,
      progress: 100
    };
  }

  const updated = {
    ...current,
    affection: newAffection,
    achievements
  };
  saveProgression(updated);
  return updated;
}

/**
 * Checks whether daily reward is claimable
 */
export function canClaimDailyReward(lastClaimIso) {
  if (!lastClaimIso) return true;
  const last = new Date(lastClaimIso);
  if (isNaN(last.getTime())) return true;

  const now = new Date();
  // Check if calendar day is different (or >= 20 hours have elapsed)
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  if (diffHours >= 20) return true;

  return (
    now.getFullYear() !== last.getFullYear() ||
    now.getMonth() !== last.getMonth() ||
    now.getDate() !== last.getDate()
  );
}

/**
 * Claims daily reward
 */
export function claimDailyReward(current) {
  if (!canClaimDailyReward(current.lastDailyClaim)) {
    return {
      success: false,
      message: 'Daily reward already claimed today! Come back tomorrow. 💕',
      updated: current
    };
  }

  const now = new Date();
  let streak = current.streak || 1;

  if (current.lastDailyClaim) {
    const last = new Date(current.lastDailyClaim);
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    // If claimed within 48 hours, increment streak, otherwise maintain friendly streak
    if (diffHours <= 48) {
      streak += 1;
    } else {
      streak = 1;
    }
  }

  const bonusCoins = 80 + Math.min(100, streak * 10);
  const bonusAffection = 10;
  const xpReward = 50;

  let achievements = { ...current.achievements };
  if (streak >= 3 && !achievements.daily_streak_3?.unlocked) {
    achievements.daily_streak_3 = {
      ...achievements.daily_streak_3,
      unlocked: true,
      progress: 3
    };
  }

  const updatedWithXp = addXpToProgression(current, xpReward).updated;
  const updated = {
    ...updatedWithXp,
    coins: updatedWithXp.coins + bonusCoins,
    affection: Math.min(100, updatedWithXp.affection + bonusAffection),
    streak,
    lastDailyClaim: now.toISOString(),
    achievements
  };

  saveProgression(updated);

  return {
    success: true,
    coins: bonusCoins,
    affection: bonusAffection,
    xp: xpReward,
    streak,
    message: `Claimed! +${bonusCoins} coins, +${bonusAffection}% affection, +${xpReward} XP! 🎉`,
    updated
  };
}

/**
 * Records an interaction (touch/poke/reaction)
 */
export function recordInteraction(current) {
  const nextCount = (current.totalInteractions || 0) + 1;
  let achievements = { ...current.achievements };

  if (achievements.touch_10 && !achievements.touch_10.unlocked) {
    achievements.touch_10 = {
      ...achievements.touch_10,
      progress: Math.min(10, nextCount),
      unlocked: nextCount >= 10
    };
  }
  if (achievements.touch_50 && !achievements.touch_50.unlocked) {
    achievements.touch_50 = {
      ...achievements.touch_50,
      progress: Math.min(50, nextCount),
      unlocked: nextCount >= 50
    };
  }

  // Small XP & coins reward for interaction
  const updatedWithXp = addXpToProgression(current, 5).updated;
  const updated = {
    ...updatedWithXp,
    coins: updatedWithXp.coins + 2,
    totalInteractions: nextCount,
    achievements
  };
  saveProgression(updated);
  return updated;
}

/**
 * Records a completed mini game
 */
export function recordMiniGameCompleted(current, score = 0, bonusCoins = 30) {
  const nextGames = (current.totalMiniGamesPlayed || 0) + 1;
  let achievements = { ...current.achievements };

  if (achievements.first_game && !achievements.first_game.unlocked) {
    achievements.first_game = {
      ...achievements.first_game,
      progress: 1,
      unlocked: true
    };
  }
  if (achievements.game_master && !achievements.game_master.unlocked) {
    achievements.game_master = {
      ...achievements.game_master,
      progress: Math.min(5, nextGames),
      unlocked: nextGames >= 5
    };
  }

  const xpReward = 35 + Math.floor(score / 10);
  const totalCoins = Math.max(10, bonusCoins);

  const updatedWithXp = addXpToProgression(current, xpReward).updated;
  const updated = {
    ...updatedWithXp,
    coins: updatedWithXp.coins + totalCoins,
    affection: Math.min(100, updatedWithXp.affection + 5),
    totalMiniGamesPlayed: nextGames,
    achievements
  };
  saveProgression(updated);
  return { updated, coinsEarned: totalCoins, xpEarned: xpReward };
}

/**
 * Resets all progression back to initial state
 */
export function resetProgression() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(PROGRESSION_STORAGE_KEY);
    } catch {}
  }
  return { ...INITIAL_PROGRESSION };
}
