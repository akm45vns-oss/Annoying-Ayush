import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clonedVoiceEngine } from '../src/utils/clonedVoiceEngine.js';

describe('Voice Modes & Interaction Preservation', () => {
  let originalWindow;
  let synthUtterances = [];

  beforeEach(() => {
    synthUtterances = [];
    originalWindow = globalThis.window;

    // Mock browser speech synthesis
    globalThis.window = {
      speechSynthesis: {
        cancel() {},
        speak(utterance) {
          synthUtterances.push(utterance);
          // Simulate async end
          setTimeout(() => {
            if (utterance.onend) utterance.onend();
          }, 10);
        }
      }
    };

    globalThis.SpeechSynthesisUtterance = class MockUtterance {
      constructor(text) {
        this.text = text;
        this.pitch = 1.0;
        this.rate = 1.0;
        this.onend = null;
        this.onerror = null;
      }
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    delete globalThis.SpeechSynthesisUtterance;
    clonedVoiceEngine.cleanup();
  });

  describe('Voice Mode Dispatching', () => {
    it('routes "funny" mode to chipmunk pitch-shifted speech synthesis (pitch 1.6, rate 1.35)', async () => {
      let started = false;
      let ended = false;

      await new Promise((resolve) => {
        clonedVoiceEngine.speakPhraseWithMode('Hello darling!', 'funny', {
          onStart: () => { started = true; },
          onEnded: () => {
            ended = true;
            resolve();
          }
        });
      });

      assert.equal(started, true);
      assert.equal(ended, true);
      assert.equal(synthUtterances.length, 1);
      assert.equal(synthUtterances[0].text, 'Hello darling!');
      assert.equal(synthUtterances[0].pitch, 1.6, 'Funny voice must use cartoon pitch 1.6');
      assert.equal(synthUtterances[0].rate, 1.35, 'Funny voice must use rate 1.35');
    });

    it('routes "device" mode to standard browser speech synthesis (pitch 1.0, rate 1.0)', async () => {
      let started = false;

      await clonedVoiceEngine.speakPhraseWithMode('Good morning sweetheart', 'device', {
        onStart: () => { started = true; }
      });

      assert.equal(started, true);
      assert.equal(synthUtterances.length, 1);
      assert.equal(synthUtterances[0].text, 'Good morning sweetheart');
      assert.equal(synthUtterances[0].pitch, 1.0, 'Device voice must use natural pitch 1.0');
      assert.equal(synthUtterances[0].rate, 1.0, 'Device voice must use natural rate 1.0');
    });

    it('gracefully falls back to device voice when "cloned" mode is requested but server is unconfigured', async () => {
      const originalFetch = globalThis.fetch;
      let fallbackReported = null;

      // Mock server /api/tts returning unconfigured status
      globalThis.fetch = async () => ({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          ok: false,
          configured: false,
          fallbackReason: 'unconfigured',
          message: 'ElevenLabs key not set.'
        })
      });

      try {
        await clonedVoiceEngine.speakPhraseWithMode('Special romantic message', 'cloned', {
          onFallback: (reason) => { fallbackReported = reason; }
        });

        assert.equal(fallbackReported, 'unconfigured');
        assert.equal(synthUtterances.length, 1);
        assert.equal(synthUtterances[0].text, 'Special romantic message');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles empty or whitespace phrases safely without calling speech synthesis', async () => {
      let ended = false;
      await clonedVoiceEngine.speakPhraseWithMode('   ', 'funny', {
        onEnded: () => { ended = true; }
      });

      assert.equal(ended, true);
      assert.equal(synthUtterances.length, 0);
    });
  });
});
