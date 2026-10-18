import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  DEFAULT_UNLOCKS,
  validateAndNormalizeModelUrl,
  loadRomanticSettings,
  saveRomanticSettings,
  calculateDaysTogether,
  resetAllSettingsAndUnlocks
} from '../src/utils/romanticSettings.js';

// Minimal localStorage mock for Node test environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('Romantic Settings & Model URL Sanitization', () => {
  beforeEach(() => {
    globalThis.window = {};
    globalThis.localStorage = new LocalStorageMock();
  });

  it('provides the expected defaults: Shristy and 2025-07-21', () => {
    assert.equal(DEFAULT_SETTINGS.gfName, 'Shristy');
    assert.equal(DEFAULT_SETTINGS.ayushName, 'Ayush');
    assert.equal(DEFAULT_SETTINGS.anniversaryDate, '2025-07-21');
    assert.equal(DEFAULT_SETTINGS.soundEnabled, true);
    assert.equal(DEFAULT_SETTINGS.customModelUrl, '');
    assert.equal(DEFAULT_SETTINGS.voiceMode, 'device');

    // Validate default unlock state
    assert.equal(DEFAULT_UNLOCKS.secretHeartUnlocked, false);
    assert.equal(DEFAULT_UNLOCKS.comboUnlocked, false);
    assert.equal(DEFAULT_UNLOCKS.heartTapCount, 0);
  });

  describe('validateAndNormalizeModelUrl', () => {
    it('normalizes empty or non-string inputs to empty string', () => {
      assert.equal(validateAndNormalizeModelUrl(''), '');
      assert.equal(validateAndNormalizeModelUrl('   '), '');
      assert.equal(validateAndNormalizeModelUrl(null), '');
      assert.equal(validateAndNormalizeModelUrl(undefined), '');
      assert.equal(validateAndNormalizeModelUrl(123), '');
    });

    it('rejects temporary blob: URLs as non-durable', () => {
      assert.equal(validateAndNormalizeModelUrl('blob:http://localhost:5173/abc-123'), '');
      assert.equal(validateAndNormalizeModelUrl('blob:https://annoying-ayush.vercel.app/def-456'), '');
      assert.equal(validateAndNormalizeModelUrl('BLOB:null/789'), '');
    });

    it('rejects dangerous script schemes', () => {
      assert.equal(validateAndNormalizeModelUrl('javascript:alert(1)'), '');
      assert.equal(validateAndNormalizeModelUrl('data:text/html,evil'), '');
      assert.equal(validateAndNormalizeModelUrl('vbscript:msgbox'), '');
    });

    it('preserves valid relative paths and stable HTTP/HTTPS URLs', () => {
      assert.equal(validateAndNormalizeModelUrl('/models/ayush.glb'), '/models/ayush.glb');
      assert.equal(validateAndNormalizeModelUrl('./models/custom.glb'), './models/custom.glb');
      assert.equal(validateAndNormalizeModelUrl('https://example.com/assets/model.glb'), 'https://example.com/assets/model.glb');
      assert.equal(validateAndNormalizeModelUrl('http://cdn.partner.org/rig.gltf'), 'http://cdn.partner.org/rig.gltf');
    });
  });

  describe('loadRomanticSettings & saveRomanticSettings', () => {
    it('returns default settings on first run with empty localStorage', () => {
      const settings = loadRomanticSettings();
      assert.equal(settings.gfName, 'Shristy');
      assert.equal(settings.anniversaryDate, '2025-07-21');
      assert.equal(settings.customModelUrl, '');
    });

    it('cleans up and sanitizes stale blob: URL stored in localStorage', () => {
      // Simulate an older session that persisted a blob URL
      const staleSettings = {
        gfName: 'Shristy',
        ayushName: 'Ayush',
        anniversaryDate: '2025-07-21',
        soundEnabled: true,
        customModelUrl: 'blob:http://localhost:5173/stale-uuid-1234'
      };
      localStorage.setItem('annoying_ayush_romantic_settings_v1', JSON.stringify(staleSettings));

      const loaded = loadRomanticSettings();
      assert.equal(loaded.customModelUrl, '', 'Loaded customModelUrl must be normalized to empty');
      assert.equal(loaded.gfName, 'Shristy');

      // Verify localStorage was rewritten without the stale blob
      const updatedRaw = JSON.parse(localStorage.getItem('annoying_ayush_romantic_settings_v1'));
      assert.equal(updatedRaw.customModelUrl, '');
    });

    it('preserves legitimate stable model URLs in storage', () => {
      saveRomanticSettings({
        ...DEFAULT_SETTINGS,
        customModelUrl: 'https://cdn.example.com/avatar.glb'
      });

      const loaded = loadRomanticSettings();
      assert.equal(loaded.customModelUrl, 'https://cdn.example.com/avatar.glb');
    });

    it('never saves blob: URLs into localStorage', () => {
      saveRomanticSettings({
        ...DEFAULT_SETTINGS,
        gfName: 'MyLove',
        customModelUrl: 'blob:https://domain/active-preview'
      });

      const loaded = loadRomanticSettings();
      assert.equal(loaded.customModelUrl, '');
      assert.equal(loaded.gfName, 'MyLove');
    });

    it('preserves user customizations and does not overwrite with defaults', () => {
      saveRomanticSettings({
        ...DEFAULT_SETTINGS,
        gfName: 'Sweetheart',
        ayushName: 'Babe',
        anniversaryDate: '2024-02-14',
        soundEnabled: false
      });

      const loaded = loadRomanticSettings();
      assert.equal(loaded.gfName, 'Sweetheart');
      assert.equal(loaded.ayushName, 'Babe');
      assert.equal(loaded.anniversaryDate, '2024-02-14');
      assert.equal(loaded.soundEnabled, false);
    });

    it('persists and validates voiceMode setting cleanly', () => {
      saveRomanticSettings({ ...DEFAULT_SETTINGS, voiceMode: 'cloned' });
      let loaded = loadRomanticSettings();
      assert.equal(loaded.voiceMode, 'cloned');

      // Normalizes invalid voiceMode to default 'device'
      saveRomanticSettings({ ...DEFAULT_SETTINGS, voiceMode: 'invalid_mode_unknown' });
      loaded = loadRomanticSettings();
      assert.equal(loaded.voiceMode, 'device');
    });

    it('handles malformed JSON in localStorage gracefully without throwing', () => {
      localStorage.setItem('annoying_ayush_romantic_settings_v1', 'NOT_VALID_JSON{:::');
      const loaded = loadRomanticSettings();
      assert.equal(loaded.gfName, 'Shristy');
      assert.equal(loaded.anniversaryDate, '2025-07-21');
    });

    it('resetAllSettingsAndUnlocks restores clean slate', () => {
      saveRomanticSettings({ ...DEFAULT_SETTINGS, gfName: 'Custom' });
      resetAllSettingsAndUnlocks();
      assert.equal(localStorage.getItem('annoying_ayush_romantic_settings_v1'), null);
      const reloaded = loadRomanticSettings();
      assert.equal(reloaded.gfName, 'Shristy');
    });
  });

  describe('calculateDaysTogether', () => {
    it('calculates days correctly for valid anniversary dates', () => {
      const days = calculateDaysTogether('2025-07-21');
      assert.ok(typeof days === 'number');
      assert.ok(days >= 0);
    });

    it('returns null for future dates, invalid strings, or missing inputs', () => {
      assert.equal(calculateDaysTogether(null), null);
      assert.equal(calculateDaysTogether(''), null);
      assert.equal(calculateDaysTogether('invalid-date'), null);
      // Future date
      assert.equal(calculateDaysTogether('2099-01-01'), null);
    });
  });
});
