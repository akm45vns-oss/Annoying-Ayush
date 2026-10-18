import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ayushVoicePack, VOICE_ACTIONS } from '../src/utils/ayushVoicePack.js';

describe('Ayush Real Voice Pack — 100% Free Voice Integration', () => {
  let originalWindow;
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    originalWindow = globalThis.window;

    globalThis.window = {
      localStorage: {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; },
        clear: () => { mockStorage = {}; }
      }
    };
    globalThis.localStorage = globalThis.window.localStorage;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    delete globalThis.localStorage;
    ayushVoicePack.stopPlayback();
  });

  it('defines the 6 key romantic interaction voice actions', () => {
    const actionIds = VOICE_ACTIONS.map(a => a.id);
    assert.ok(actionIds.includes('kiss'));
    assert.ok(actionIds.includes('hug'));
    assert.ok(actionIds.includes('blush'));
    assert.ok(actionIds.includes('cuddle'));
    assert.ok(actionIds.includes('laugh'));
    assert.ok(actionIds.includes('loveNote'));
  });

  it('hasCustomVoice returns false when no recording has been saved', () => {
    assert.equal(ayushVoicePack.hasCustomVoice('kiss'), false);
    assert.equal(ayushVoicePack.getCustomVoiceDataUrl('kiss'), null);
  });

  it('saveActionVoiceBlob persists base64 audio data URL and hasCustomVoice returns true', async () => {
    // Mock Blob and FileReader in Node
    const fakeBlob = {};
    globalThis.FileReader = class MockFileReader {
      readAsDataURL() {
        setTimeout(() => {
          this.result = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwE=';
          if (this.onloadend) this.onloadend();
        }, 10);
      }
    };

    try {
      const savedDataUrl = await ayushVoicePack.saveActionVoiceBlob('kiss', fakeBlob);
      assert.ok(savedDataUrl.startsWith('data:audio/webm;base64'));
      assert.equal(ayushVoicePack.hasCustomVoice('kiss'), true);
      assert.equal(ayushVoicePack.getCustomVoiceDataUrl('kiss'), savedDataUrl);

      // Deleting removes it cleanly
      ayushVoicePack.deleteActionVoice('kiss');
      assert.equal(ayushVoicePack.hasCustomVoice('kiss'), false);
      assert.equal(ayushVoicePack.getCustomVoiceDataUrl('kiss'), null);
    } finally {
      delete globalThis.FileReader;
    }
  });

  it('playActionVoice invokes onEnded gracefully and returns false when static audio is not present', async () => {
    let endedCalled = false;

    // In Node environment without HTML5 Audio canplaythrough, it times out gracefully and calls onEnded
    globalThis.Audio = class MockAudio {
      constructor() {
        this.src = '';
        this.onerror = null;
        this.onended = null;
      }
      play() {
        return Promise.reject(new Error('Audio playback failed in test'));
      }
      pause() {}
    };

    try {
      const played = await ayushVoicePack.playActionVoice('cuddle', {
        onEnded: () => { endedCalled = true; }
      });

      assert.equal(played, false, 'Must report false when audio file cannot be loaded');
      assert.equal(endedCalled, true, 'onEnded must be triggered so the game continues smoothly');
    } finally {
      delete globalThis.Audio;
    }
  });

  it('stopPlayback cleanly clears active state', () => {
    ayushVoicePack.isPlaying = true;
    ayushVoicePack.stopPlayback();
    assert.equal(ayushVoicePack.isPlaying, false);
  });
});
