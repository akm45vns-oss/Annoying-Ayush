import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_PROGRESSION,
  getXpRequiredForLevel,
  loadProgression,
  saveProgression,
  addXpToProgression,
  spendCoinsFromProgression,
  addAffectionToProgression,
  canClaimDailyReward,
  claimDailyReward,
  recordInteraction,
  recordMiniGameCompleted,
  resetProgression
} from '../src/utils/progressionStorage.js';

// Mock localStorage for node environment
const mockStorage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  }
};

describe('Progression Storage & Free Companion System', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('provides the expected default progression on empty storage', () => {
    const data = loadProgression();
    assert.equal(data.level, 1);
    assert.equal(data.xp, 0);
    assert.equal(data.affection, 20);
    assert.equal(data.streak, 1);
    assert.equal(data.lastDailyClaim, null);
    assert.ok(Array.isArray(data.unlockedEmotes));
    assert.ok(data.wardrobe.equipped.hat);
  });

  it('calculates XP required per level predictably', () => {
    assert.equal(getXpRequiredForLevel(1), 100);
    assert.equal(getXpRequiredForLevel(2), 200);
    assert.equal(getXpRequiredForLevel(5), 500);
  });

  it('adds XP and calculates level-ups without currency locks', () => {
    const initial = loadProgression();
    // Add 150 XP (needed for lvl 1 is 100) -> should level up to level 2 with 50 XP remainder
    const { updated, leveledUp, levelsGained } = addXpToProgression(initial, 150);
    assert.equal(leveledUp, true);
    assert.equal(levelsGained, 1);
    assert.equal(updated.level, 2);
    assert.equal(updated.xp, 50);
  });

  it('guarantees legacy spend coins returns success because all features are free', () => {
    const initial = loadProgression();
    const spendSuccess = spendCoinsFromProgression(initial, 100);
    assert.equal(spendSuccess.success, true);
  });

  it('saves and loads progression to and from storage', () => {
    const custom = { ...INITIAL_PROGRESSION, level: 3 };
    saveProgression(custom);
    const loaded = loadProgression();
    assert.equal(loaded.level, 3);
  });

  it('caps affection at 100% and unlocks high_affection achievement', () => {
    const initial = loadProgression();
    const updated = addAffectionToProgression(initial, 90); // 20 + 90 = 110 -> 100
    assert.equal(updated.affection, 100);
    assert.equal(updated.achievements.high_affection.unlocked, true);
  });

  it('evaluates daily reward eligibility correctly', () => {
    assert.equal(canClaimDailyReward(null), true);

    const recentDate = new Date().toISOString();
    assert.equal(canClaimDailyReward(recentDate), false);

    const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    assert.equal(canClaimDailyReward(yesterday), true);
  });

  it('claims daily reward and increments streak', () => {
    const initial = loadProgression();
    const result = claimDailyReward(initial);
    assert.equal(result.success, true);
    assert.equal(result.affection, 10);
    assert.ok(result.message.includes('Claimed!'));
    assert.ok(result.updated.lastDailyClaim !== null);

    // Attempting to claim again immediately fails
    const secondResult = claimDailyReward(result.updated);
    assert.equal(secondResult.success, false);
  });

  it('records interactions and tracks touch achievements', () => {
    let state = loadProgression();
    for (let i = 0; i < 10; i++) {
      state = recordInteraction(state);
    }
    assert.equal(state.totalInteractions, 10);
    assert.equal(state.achievements.touch_10.unlocked, true);
  });

  it('records mini game completion with rewards and achievement progress', () => {
    const initial = loadProgression();
    const { updated, xpEarned } = recordMiniGameCompleted(initial, 100);
    assert.equal(updated.totalMiniGamesPlayed, 1);
    assert.equal(updated.achievements.first_game.unlocked, true);
    assert.ok(xpEarned >= 35);
  });

  it('resets progression cleanly', () => {
    const reset = resetProgression();
    assert.equal(reset.level, 1);
    assert.equal(reset.xp, 0);
  });
});
