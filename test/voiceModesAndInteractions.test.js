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
        this.volume = 0.5; // Starts at default fractional volume
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
    it('routes "funny" mode to chipmunk speech synthesis with max volume (volume 1.0, pitch 1.45, rate 1.2)', async () => {
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
      assert.equal(synthUtterances[0].volume, 1.0, 'Funny voice must explicitly set max volume 1.0');
      assert.equal(synthUtterances[0].pitch, 1.45, 'Funny voice must use intelligible cartoon pitch 1.45');
      assert.equal(synthUtterances[0].rate, 1.2, 'Funny voice must use rate 1.2');
    });

    it('routes "device" mode to standard browser speech synthesis with max volume (volume 1.0, pitch 1.0, rate 1.0)', async () => {
      let started = false;

      await clonedVoiceEngine.speakPhraseWithMode('Good morning sweetheart', 'device', {
        onStart: () => { started = true; }
      });

      assert.equal(started, true);
      assert.equal(synthUtterances.length, 1);
      assert.equal(synthUtterances[0].text, 'Good morning sweetheart');
      assert.equal(synthUtterances[0].volume, 1.0, 'Device voice must set maximum volume 1.0');
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

    it('primes audio with unlockAudio() on user touch to comply with mobile autoplay restrictions', () => {
      let dummyUtterances = [];
      let resumed = false;

      globalThis.window.AudioContext = class MockAudioContext {
        constructor() {
          this.state = 'suspended';
        }
        async resume() {
          resumed = true;
          this.state = 'running';
        }
      };

      globalThis.window.speechSynthesis = {
        paused: true,
        resume() {
          this.paused = false;
        },
        speak(u) {
          dummyUtterances.push(u);
        }
      };

      clonedVoiceEngine.unlockAudio();

      assert.equal(resumed, true, 'AudioContext must be resumed on user gesture');
      assert.equal(dummyUtterances.length, 1, 'Dummy utterance must be spoken to prime mobile speech engine');
      delete globalThis.window.AudioContext;
    });

    it('maintains strong utterance reference and active watchdog timer during playback, clearing them on completion', async () => {
      let completed = false;

      // Delayed utterance to inspect in-flight state
      globalThis.window.speechSynthesis = {
        cancel() {},
        speak(utterance) {
          synthUtterances.push(utterance);
          // Keep active for 40ms
          setTimeout(() => {
            if (utterance.onend) utterance.onend();
          }, 40);
        }
      };

      await new Promise((resolve) => {
        clonedVoiceEngine.speakPhraseWithMode('Testing mobile speech guard', 'funny', {
          onEnded: () => {
            completed = true;
            resolve();
          }
        });

        // Verify activeUtterance is held strongly while playing (prevents Android Chrome V8 GC)
        assert.ok(clonedVoiceEngine.activeUtterance, 'Active utterance must be held strongly during playback');
        assert.ok(clonedVoiceEngine.watchdogTimer, 'Watchdog timer must be armed during playback');
      });

      assert.equal(completed, true);
      assert.equal(clonedVoiceEngine.activeUtterance, null, 'Active utterance reference must be released after completion');
      assert.equal(clonedVoiceEngine.watchdogTimer, null, 'Watchdog timer must be cleared after completion');
    });

    it('plays cloned voice audio via Web Audio and triggers callbacks when server returns binary MP3', async () => {
      const originalFetch = globalThis.fetch;
      let onStartCalled = false;
      let onEndedCalled = false;
      let amplitudeSamples = [];

      // Mock Web Audio Context
      let sourceStarted = false;
      const mockBuffer = { duration: 1.5 };
      class MockBufferSource {
        constructor() {
          this.playbackRate = { setValueAtTime() {} };
          this.buffer = null;
          this.onended = null;
        }
        connect() {}
        start() {
          sourceStarted = true;
          // Trigger onended shortly after
          setTimeout(() => {
            if (this.onended) this.onended();
          }, 20);
        }
        stop() {}
        disconnect() {}
      }

      globalThis.window.AudioContext = class MockAudioContext {
        constructor() {
          this.state = 'running';
          this.currentTime = 0;
          this.destination = {};
        }
        async resume() {}
        createBufferSource() { return new MockBufferSource(); }
        createAnalyser() {
          return {
            fftSize: 128,
            smoothingTimeConstant: 0.5,
            frequencyBinCount: 64,
            getByteFrequencyData(arr) { arr.fill(80); },
            connect() {}
          };
        }
        createDynamicsCompressor() {
          return {
            threshold: { setValueAtTime() {} },
            knee: { setValueAtTime() {} },
            ratio: { setValueAtTime() {} },
            attack: { setValueAtTime() {} },
            release: { setValueAtTime() {} },
            connect() {}
          };
        }
        createGain() {
          return {
            gain: { setValueAtTime() {} },
            connect() {}
          };
        }
        createBiquadFilter() {
          return {
            type: '',
            frequency: { setValueAtTime() {} },
            Q: { setValueAtTime() {} },
            gain: { setValueAtTime() {} },
            connect() {}
          };
        }
        async decodeAudioData() {
          return mockBuffer;
        }
      };

      globalThis.fetch = async () => ({
        ok: true,
        headers: { get: () => 'audio/mpeg' },
        arrayBuffer: async () => new ArrayBuffer(256)
      });

      clonedVoiceEngine.cleanup();
      clonedVoiceEngine.audioCtx = new globalThis.window.AudioContext();

      try {
        await new Promise((resolve) => {
          clonedVoiceEngine.speakPhraseWithMode('Hello darling in cloned voice', 'cloned', {
            onStart: () => { onStartCalled = true; },
            onAmplitude: (vol) => { amplitudeSamples.push(vol); },
            onEnded: () => {
              onEndedCalled = true;
              resolve();
            }
          });
        });

        assert.equal(onStartCalled, true);
        assert.equal(sourceStarted, true, 'AudioBufferSourceNode must be started for cloned playback');
        assert.equal(onEndedCalled, true, 'onEnded must be invoked when cloned speech finishes');
      } finally {
        globalThis.fetch = originalFetch;
        delete globalThis.window.AudioContext;
      }
    });

    it('falls back to device speech with "provider_error" reason when server reports providerError', async () => {
      const originalFetch = globalThis.fetch;
      let reportedReason = null;
      let ended = false;

      globalThis.fetch = async () => ({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          ok: false,
          configured: true,
          providerError: true,
          error: 'Voice service unavailable. Using browser fallback voice.'
        })
      });

      try {
        await new Promise((resolve) => {
          clonedVoiceEngine.speakPhraseWithMode('Romantic whisper', 'cloned', {
            onFallback: (reason) => { reportedReason = reason; },
            onEnded: () => {
              ended = true;
              resolve();
            }
          });
        });

        assert.equal(reportedReason, 'provider_error');
        assert.equal(ended, true);
        assert.equal(synthUtterances.length, 1);
        assert.equal(synthUtterances[0].text, 'Romantic whisper');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});


