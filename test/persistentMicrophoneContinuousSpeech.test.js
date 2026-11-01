import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MicrophoneSession } from '../src/features/voice/controllers/MicrophoneSession.js';
import { SpeechSegmenter } from '../src/features/voice/controllers/SpeechSegmenter.js';
import { TranscriptionService } from '../src/features/voice/controllers/TranscriptionService.js';
import { PlaybackManager } from '../src/features/voice/controllers/PlaybackManager.js';
import { RepeatController, REPEAT_STATES } from '../src/features/voice/controllers/RepeatController.js';

/**
 * Mock MediaStreamTrack
 */
class MockMediaStreamTrack {
  constructor(kind = 'audio') {
    this.kind = kind;
    this.readyState = 'live';
    this.stopped = false;
    this.listeners = {};
  }

  addEventListener(event, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
  }

  stop() {
    this.stopped = true;
    this.readyState = 'ended';
    if (this.listeners['ended']) {
      this.listeners['ended'].forEach((fn) => fn());
    }
  }
}

/**
 * Mock MediaStream
 */
class MockMediaStream {
  constructor() {
    this.tracks = [new MockMediaStreamTrack('audio')];
    this.active = true;
  }

  getAudioTracks() {
    return this.tracks;
  }

  getTracks() {
    return this.tracks;
  }
}

/**
 * Mock Web Audio Context & Nodes
 */
class MockAudioNode {
  connect() {}
  disconnect() {}
}

class MockAnalyserNode extends MockAudioNode {
  constructor() {
    super();
    this.fftSize = 2048;
    this.frequencyBinCount = 1024;
    this.smoothingTimeConstant = 0.4;
    this.mockData = new Uint8Array(1024).fill(128);
  }

  getByteTimeDomainData(array) {
    array.set(this.mockData);
  }

  setMockVolume(normalizedLevel) {
    // 128 is zero amplitude; vary between 128 and 128 + delta
    const delta = Math.floor(normalizedLevel * 127);
    this.mockData.fill(128 + delta);
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
  }

  createMediaStreamSource() {
    return new MockAudioNode();
  }

  createAnalyser() {
    return new MockAnalyserNode();
  }

  async resume() {
    this.state = 'running';
  }

  async close() {
    this.state = 'closed';
  }
}

describe('Continuous Talking Tom Speech Engine — Technical Specification Verification', () => {
  let originalNavigator;
  let originalWindow;
  let originalDocument;
  let originalFetch;
  let getUserMediaCallCount = 0;
  let activeMockStream = null;

  beforeEach(() => {
    getUserMediaCallCount = 0;
    activeMockStream = new MockMediaStream();

    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalFetch = globalThis.fetch;

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: async () => {
            getUserMediaCallCount++;
            activeMockStream = new MockMediaStream();
            return activeMockStream;
          }
        }
      },
      configurable: true,
      writable: true
    });

    globalThis.window = {
      AudioContext: MockAudioContext,
      webkitAudioContext: MockAudioContext,
      MediaRecorder: class MockMediaRecorder {
        static isTypeSupported() {
          return true;
        }
        constructor(stream, options) {
          this.stream = stream;
          this.options = options;
          this.state = 'inactive';
          this.ondataavailable = null;
          this.onstop = null;
        }
        start() {
          this.state = 'recording';
        }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({ data: { size: 2048 } });
          }
          if (this.onstop) {
            this.onstop();
          }
        }
      }
    };

    globalThis.document = {
      hidden: false,
      listeners: {},
      addEventListener(event, fn) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(fn);
      },
      removeEventListener(event, fn) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
      }
    };

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ ok: true, text: 'Hello Ayush', language: 'en' })
    });
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  });

  // 1. Microphone is acquired once per active session
  it('1. Microphone is acquired once per active session', async () => {
    const mic = new MicrophoneSession();
    assert.equal(getUserMediaCallCount, 0);

    await mic.start();
    assert.equal(getUserMediaCallCount, 1);
    assert.equal(mic.status, 'listening');

    // Calling start again while stream is active must NOT re-call getUserMedia
    await mic.start();
    assert.equal(getUserMediaCallCount, 1, 'getUserMedia must not be re-called when stream is already active');

    await mic.stop();
    assert.equal(mic.status, 'off');
  });

  // 2. Multiple phrases work without reacquiring the microphone
  it('2. Multiple phrases work without reacquiring the microphone', async () => {
    const mic = new MicrophoneSession();
    const segmenter = new SpeechSegmenter({ calibrationDurationMs: 10, speechStartConfirmMs: 10, endOfPhraseSilenceMs: 20 });
    const transcriber = new TranscriptionService();
    const speaker = new PlaybackManager();

    // Mock speaker.speakText to return immediately
    speaker.speakText = async (text, mode, callbacks) => {
      if (callbacks.onStart) callbacks.onStart();
      if (callbacks.onEnded) callbacks.onEnded();
    };

    const controller = new RepeatController({
      micSession: mic,
      speechSegmenter: segmenter,
      transcriptionService: transcriber,
      playbackManager: speaker,
      settlingDelayMs: 10
    });

    await controller.start();
    assert.equal(getUserMediaCallCount, 1);

    // Simulate Phrase 1
    const dummyBlob1 = { size: 3000, type: 'audio/webm' };
    await controller.handlePhraseCaptured(dummyBlob1, 1000);
    assert.equal(getUserMediaCallCount, 1, 'Microphone must not be reacquired after phrase 1');

    // Simulate Phrase 2
    const dummyBlob2 = { size: 3500, type: 'audio/webm' };
    await controller.handlePhraseCaptured(dummyBlob2, 1200);
    assert.equal(getUserMediaCallCount, 1, 'Microphone must not be reacquired after phrase 2');

    await controller.stop();
  });

  // 3. Completing a phrase does not stop microphone tracks
  it('3. Completing a phrase does not stop microphone tracks', async () => {
    const mic = new MicrophoneSession();
    await mic.start();

    const track = mic.stream.getAudioTracks()[0];
    assert.equal(track.stopped, false);

    const segmenter = new SpeechSegmenter();
    segmenter.attachStream(mic.stream, mic.analyser);
    segmenter.startPhraseRecording();

    // Finalize/stop phrase recorder
    segmenter.abortCurrentRecording();

    assert.equal(track.stopped, false, 'Underlying microphone track must NOT be stopped when phrase recording stops');
    assert.equal(mic.isStreamActive(), true);

    await mic.stop();
    assert.equal(track.stopped, true, 'Microphone track must only be stopped when session is explicitly stopped');
  });

  // 4. Natural pauses do not split sentences incorrectly
  it('4. Natural pauses do not split sentences incorrectly', () => {
    const segmenter = new SpeechSegmenter({
      speechStartConfirmMs: 50,
      endOfPhraseSilenceMs: 600, // 600ms pause allowed
      minStartThreshold: 0.05
    });

    let finalizedCount = 0;
    segmenter.onSpeechEnd = () => {
      finalizedCount++;
    };

    const now = Date.now();
    segmenter.isActive = true;
    segmenter.isSpeechActive = true;
    segmenter.speechConfirmedStartTime = now - 500;

    // Simulate a brief conversational pause of 200ms (less than 600ms)
    segmenter.processAudioFrame(0.01, now); // silence starts
    segmenter.processAudioFrame(0.01, now + 200); // 200ms elapsed
    // Player continues speaking
    segmenter.processAudioFrame(0.12, now + 250);

    assert.equal(finalizedCount, 0, 'Brief natural pause must NOT split the phrase');
    assert.equal(segmenter.silenceStartTime, null, 'Speech resumption must reset silence timer');
  });

  // 5. Background noise does not trigger unnecessary repetitions
  it('5. Background noise does not trigger unnecessary repetitions', () => {
    const segmenter = new SpeechSegmenter({
      speechStartConfirmMs: 150,
      minStartThreshold: 0.10
    });

    let speechStarted = false;
    segmenter.onSpeechStart = () => {
      speechStarted = true;
    };

    const now = Date.now();
    segmenter.isActive = true;

    // Simulate a transient click/noise spike that lasts only 30ms (less than 150ms confirm window)
    segmenter.processAudioFrame(0.15, now);
    segmenter.processAudioFrame(0.02, now + 30);

    assert.equal(speechStarted, false, 'Brief click/noise must be rejected by speech-start confirmation window');
    assert.equal(segmenter.isSpeechActive, false);
  });

  // 6. Ayush cannot trigger an endless self-repeat loop
  it('6. Ayush cannot trigger an endless self-repeat loop (deduplication & gating)', async () => {
    const mic = new MicrophoneSession();
    const segmenter = new SpeechSegmenter();
    const speaker = new PlaybackManager();
    let speakCalls = 0;

    speaker.speakText = async (text, mode, callbacks) => {
      speakCalls++;
      if (callbacks.onStart) callbacks.onStart();
      if (callbacks.onEnded) callbacks.onEnded();
    };

    const controller = new RepeatController({
      micSession: mic,
      speechSegmenter: segmenter,
      playbackManager: speaker,
      dedupWindowMs: 2000,
      settlingDelayMs: 10
    });

    await controller.start();

    // First repetition of "Hello"
    await controller.handlePhraseCaptured({ size: 2000, type: 'audio/webm' }, 800);
    assert.equal(speakCalls, 1);

    // Microphone hears Ayush speaking "Hello" right after: duplicate within dedup window must be dropped!
    await controller.handlePhraseCaptured({ size: 2000, type: 'audio/webm' }, 800);
    assert.equal(speakCalls, 1, 'Self-echo duplicate phrase within dedup window must be rejected');

    await controller.stop();
  });

  // 7. Playback gating works correctly
  it('7. Playback gating works correctly: VAD paused during speaking', async () => {
    const mic = new MicrophoneSession();
    const segmenter = new SpeechSegmenter();
    const speaker = new PlaybackManager();

    const controller = new RepeatController({
      micSession: mic,
      speechSegmenter: segmenter,
      playbackManager: speaker
    });

    await controller.start();
    assert.equal(segmenter.isPaused, false);

    controller.setState(REPEAT_STATES.SPEAKING);
    assert.equal(controller.state, REPEAT_STATES.SPEAKING);

    // In SPEAKING state, phrases captured by mic must be ignored
    let phraseProcessed = false;
    controller.transcriptionService.transcribe = async () => {
      phraseProcessed = true;
      return { ok: true, text: 'Test' };
    };

    await controller.handlePhraseCaptured({ size: 1000 }, 500);
    assert.equal(phraseProcessed, false, 'Captured frames must be gated and ignored while speaking');

    await controller.stop();
  });

  // 8. Recognition resumes after TTS playback
  it('8. Recognition resumes after TTS playback', async () => {
    const mic = new MicrophoneSession();
    const segmenter = new SpeechSegmenter();
    const speaker = new PlaybackManager();

    let finishedCallback = null;
    speaker.speakText = async (text, mode, callbacks) => {
      finishedCallback = callbacks.onEnded;
    };

    const controller = new RepeatController({
      micSession: mic,
      speechSegmenter: segmenter,
      playbackManager: speaker,
      settlingDelayMs: 20
    });

    await controller.start();
    await controller.handlePhraseCaptured({ size: 2000, type: 'audio/webm' }, 600);
    assert.equal(controller.state, REPEAT_STATES.SPEAKING);

    // Trigger playback end
    finishedCallback();

    // Wait for settling delay
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(controller.state, REPEAT_STATES.LISTENING, 'Controller must return to LISTENING state after playback');
    assert.equal(segmenter.isPaused, false, 'Segmenter must resume VAD');

    await controller.stop();
  });

  // 9. Pause and resume do not create duplicate streams
  it('9. Pause and resume do not create duplicate streams', async () => {
    const mic = new MicrophoneSession();
    const segmenter = new SpeechSegmenter({ calibrationDurationMs: 0 });
    const controller = new RepeatController({ micSession: mic, speechSegmenter: segmenter });

    await controller.start();
    assert.equal(getUserMediaCallCount, 1);
    assert.equal(controller.state, REPEAT_STATES.LISTENING);

    controller.pause();
    assert.equal(controller.state, REPEAT_STATES.PAUSED);
    assert.equal(mic.status, 'paused');
    assert.equal(getUserMediaCallCount, 1, 'Pause must not re-call getUserMedia');

    controller.resume();
    assert.equal(controller.state, REPEAT_STATES.LISTENING);
    assert.equal(mic.status, 'listening');
    assert.equal(getUserMediaCallCount, 1, 'Resume must not re-call getUserMedia');

    await controller.stop();
  });

  // 10. Stop releases all microphone tracks
  it('10. Stop releases all microphone tracks', async () => {
    const mic = new MicrophoneSession();
    const controller = new RepeatController({ micSession: mic });

    await controller.start();
    const track = mic.stream.getAudioTracks()[0];
    assert.equal(track.stopped, false);

    await controller.stop();
    assert.equal(controller.state, REPEAT_STATES.OFF);
    assert.equal(track.stopped, true, 'Stop must release all audio tracks');
    assert.equal(mic.stream, null);
    assert.equal(mic.status, 'off');
  });

  // 11. Stop during transcription prevents late audio playback
  it('11. Stop during transcription prevents late audio playback', async () => {
    const mic = new MicrophoneSession();
    const transcriber = new TranscriptionService();
    const speaker = new PlaybackManager();
    let speakCalls = 0;

    speaker.speakText = async () => {
      speakCalls++;
    };

    let resolveTranscription;
    transcriber.transcribe = () =>
      new Promise((resolve) => {
        resolveTranscription = resolve;
      });

    const controller = new RepeatController({
      micSession: mic,
      transcriptionService: transcriber,
      playbackManager: speaker
    });

    await controller.start();
    const handlePromise = controller.handlePhraseCaptured({ size: 2000 }, 600);
    assert.equal(controller.state, REPEAT_STATES.TRANSCRIBING);

    // User stops voice mode while transcription is in flight
    await controller.stop();
    assert.equal(controller.state, REPEAT_STATES.OFF);

    // Transcription completes late
    resolveTranscription({ ok: true, text: 'Late phrase' });
    await handlePromise;

    assert.equal(speakCalls, 0, 'Late transcription response after stop must NOT trigger speech playback');
  });

  // 12. Stop during TTS cancels playback
  it('12. Stop during TTS cancels playback', async () => {
    const speaker = new PlaybackManager();
    let stopped = false;
    speaker.stop = () => {
      stopped = true;
    };

    const controller = new RepeatController({ playbackManager: speaker });
    controller.state = REPEAT_STATES.SPEAKING;

    await controller.stop();
    assert.equal(stopped, true, 'Stop must immediately cancel active TTS playback');
    assert.equal(controller.state, REPEAT_STATES.OFF);
  });

  // 13. Network and provider errors are handled
  it('13. Network and provider errors are handled gracefully without crash', async () => {
    const transcriber = new TranscriptionService();
    globalThis.fetch = async () => {
      throw new Error('Network offline');
    };

    const res = await transcriber.transcribe({ size: 1000, type: 'audio/webm' });
    assert.equal(res.ok, false);
    assert.match(res.error, /Network offline/);
  });

  // 14. Microphone disconnection produces a recovery state
  it('14. Microphone disconnection produces a recovery state', async () => {
    const mic = new MicrophoneSession();
    const segmenter = new SpeechSegmenter({ calibrationDurationMs: 0 });
    const controller = new RepeatController({ micSession: mic, speechSegmenter: segmenter });

    await controller.start();
    assert.equal(controller.state, REPEAT_STATES.LISTENING);

    // Simulate OS or hardware track ending
    const track = mic.stream.getAudioTracks()[0];
    track.stop(); // triggers 'ended' event

    assert.equal(controller.state, REPEAT_STATES.RECOVERING, 'Hardware track disconnection must transition to RECOVERING state');
  });

  // 15. No duplicate TTS requests are generated
  it('15. No duplicate TTS requests are generated for single phrase', async () => {
    const speaker = new PlaybackManager();
    let speakRequestCount = 0;
    speaker.speakText = async (text, mode, callbacks) => {
      speakRequestCount++;
      if (callbacks.onStart) callbacks.onStart();
      if (callbacks.onEnded) callbacks.onEnded();
    };

    const controller = new RepeatController({
      playbackManager: speaker,
      settlingDelayMs: 10
    });

    await controller.start();
    await controller.handlePhraseCaptured({ size: 2000, type: 'audio/webm' }, 800);

    assert.equal(speakRequestCount, 1, 'Exactly one TTS request must be generated per finalized phrase');

    await controller.stop();
  });
});
