import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TalkingTomController, LISTENING_STATES } from '../src/utils/talkingTomController.js';

/**
 * Mock SpeechRecognition implementation for testing state machine,
 * continuous recognition, silence detection, deduplication, and feedback prevention.
 */
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = 'en-US';
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.isStarted = false;
    this.startCalls = 0;
    this.abortCalls = 0;
  }

  start() {
    this.startCalls++;
    this.isStarted = true;
  }

  abort() {
    this.abortCalls++;
    this.isStarted = false;
    if (this.onend) this.onend();
  }

  stop() {
    this.isStarted = false;
    if (this.onend) this.onend();
  }

  // Test helper to simulate incoming speech
  simulateResult(transcript, isFinal = true) {
    if (this.onresult) {
      this.onresult({
        resultIndex: 0,
        results: [
          [
            { transcript }
          ]
        ]
      });
      // Set isFinal on the result object
      this.onresult.lastArgs = { transcript, isFinal };
    }
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

describe('Talking Tom Continuous Listening & Audio Loop Prevention', () => {
  let originalWindow;
  let originalDocument;
  let mockRecognition;

  beforeEach(() => {
    mockRecognition = new MockSpeechRecognition();

    originalWindow = globalThis.window;
    originalDocument = globalThis.document;

    // Setup mock window & document
    globalThis.window = {
      SpeechRecognition: function () {
        return mockRecognition;
      }
    };

    globalThis.document = {
      hidden: false,
      listeners: {},
      addEventListener(event, fn) {
        this.listeners[event] = fn;
      },
      removeEventListener(event, fn) {
        if (this.listeners[event] === fn) {
          delete this.listeners[event];
        }
      }
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });

  it('detects unsupported speech recognition environments gracefully', () => {
    globalThis.window = {};
    const controller = new TalkingTomController();
    assert.equal(controller.isSupported(), false);

    const started = controller.startListening();
    assert.equal(started, false);
    assert.equal(controller.state, LISTENING_STATES.ERROR);
  });

  it('starts continuous listening on explicit user command', () => {
    const controller = new TalkingTomController();
    const started = controller.startListening();

    assert.equal(started, true);
    assert.equal(controller.isExplicitlyEnabled, true);
    assert.equal(controller.state, LISTENING_STATES.LISTENING);
    assert.equal(mockRecognition.startCalls, 1);
    assert.equal(mockRecognition.continuous, true);
    assert.equal(mockRecognition.interimResults, true);

    controller.destroy();
  });

  it('stops listening and aborts recognition on explicit stop command', () => {
    const controller = new TalkingTomController();
    controller.startListening();
    assert.equal(controller.state, LISTENING_STATES.LISTENING);

    controller.stopListening();
    assert.equal(controller.isExplicitlyEnabled, false);
    assert.equal(controller.state, LISTENING_STATES.IDLE);
    assert.ok(mockRecognition.abortCalls >= 1);

    controller.destroy();
  });

  it('processes finalized phrases and emits them for Ayush to repeat', (t, done) => {
    const controller = new TalkingTomController({ dedupWindowMs: 2000 });

    controller.onPhraseFinalized = (phrase) => {
      assert.equal(phrase, 'You look so cute today');
      assert.equal(controller.state, LISTENING_STATES.PROCESSING);
      controller.destroy();
      done();
    };

    controller.startListening();

    // Simulate final result event
    controller.handleResult({
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'You look so cute today' }], { isFinal: true })
      ]
    });
  });

  it('suppresses duplicate results within deduplication window', () => {
    const controller = new TalkingTomController({ dedupWindowMs: 3000 });
    let emittedCount = 0;

    controller.onPhraseFinalized = () => {
      emittedCount++;
    };

    controller.startListening();

    const event = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'I love you' }], { isFinal: true })
      ]
    };

    // First emission
    controller.handleResult(event);
    assert.equal(emittedCount, 1);

    // Immediate duplicate emission within dedup window
    controller.handleResult(event);
    assert.equal(emittedCount, 1, 'Duplicate phrase must be suppressed');

    controller.destroy();
  });

  it('prevents audio feedback loops: suspends recognition while Ayush is speaking', () => {
    const controller = new TalkingTomController({ postSpeechCooldownMs: 50 });
    let emittedWhileSpeaking = 0;

    controller.onPhraseFinalized = () => {
      emittedWhileSpeaking++;
    };

    controller.startListening();
    assert.equal(controller.state, LISTENING_STATES.LISTENING);

    // Ayush starts speaking -> recognition suspended
    controller.setSpeaking(true);
    assert.equal(controller.state, LISTENING_STATES.SPEAKING);

    // If microphone picks up Ayush's own voice coming out of the speakers:
    controller.handleResult({
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'Echo from speaker output' }], { isFinal: true })
      ]
    });

    assert.equal(emittedWhileSpeaking, 0, 'No phrases may be recognized while Ayush is speaking');

    controller.destroy();
  });

  it('resumes continuous listening only after post-speech cooldown finishes', (t, done) => {
    const controller = new TalkingTomController({ postSpeechCooldownMs: 40 });
    controller.startListening();

    controller.setSpeaking(true);
    assert.equal(controller.state, LISTENING_STATES.SPEAKING);

    // Ayush finishes speaking
    controller.setSpeaking(false, 30);
    assert.equal(controller.state, LISTENING_STATES.PROCESSING, 'State must be in cooldown processing');

    // Wait for cooldown to expire
    setTimeout(() => {
      assert.equal(controller.state, LISTENING_STATES.LISTENING, 'Must return to listening after cooldown');
      controller.destroy();
      done();
    }, 60);
  });

  it('handles permission denied by stopping and transitioning to ERROR without restart loop', () => {
    const controller = new TalkingTomController();
    let errorReported = null;

    controller.onError = (err) => {
      errorReported = err;
    };

    controller.startListening();
    assert.equal(controller.state, LISTENING_STATES.LISTENING);

    // Simulate browser permission denial error
    controller.handleError({ error: 'not-allowed' });

    assert.equal(controller.state, LISTENING_STATES.ERROR);
    assert.equal(controller.isExplicitlyEnabled, false);
    assert.equal(errorReported, 'not-allowed');

    // Ensure handleEnd does not restart when permission was denied
    controller.handleEnd();
    assert.equal(controller.state, LISTENING_STATES.ERROR);

    controller.destroy();
  });

  it('pauses listening when page visibility is hidden and resumes when visible', () => {
    const controller = new TalkingTomController();
    controller.startListening();
    assert.equal(controller.state, LISTENING_STATES.LISTENING);

    // Page hidden (user switches browser tab)
    globalThis.document.hidden = true;
    controller.handleVisibilityChange();
    assert.equal(controller.state, LISTENING_STATES.PAUSED);
    assert.equal(controller.wasListeningBeforeHidden, true);

    // Page visible again (user returns to game)
    globalThis.document.hidden = false;
    controller.handleVisibilityChange();
    assert.equal(controller.state, LISTENING_STATES.LISTENING);

    controller.destroy();
  });

  it('supports multiple state listeners simultaneously', () => {
    const controller = new TalkingTomController();
    let listener1Called = 0;
    let listener2Called = 0;

    const fn1 = () => listener1Called++;
    const fn2 = () => listener2Called++;

    controller.addStateListener(fn1);
    controller.addStateListener(fn2);

    controller.startListening();
    assert.ok(listener1Called >= 1);
    assert.ok(listener2Called >= 1);

    controller.removeStateListener(fn1);
    controller.stopListening();

    assert.equal(listener1Called, 1, 'Removed listener should not be called');
    assert.ok(listener2Called >= 2, 'Active listener should receive stop update');

    controller.destroy();
  });

  it('handles audio-capture failure by stopping and transitioning to ERROR without retry loop', () => {
    const controller = new TalkingTomController();
    let errorReported = null;

    controller.onError = (err) => {
      errorReported = err;
    };

    controller.startListening();
    assert.equal(controller.state, LISTENING_STATES.LISTENING);

    controller.handleError({ error: 'audio-capture' });

    assert.equal(controller.state, LISTENING_STATES.ERROR);
    assert.equal(controller.isExplicitlyEnabled, false);
    assert.equal(errorReported, 'audio-capture');

    // Confirm that handleEnd does not restart when hardware capture failed
    controller.handleEnd();
    assert.equal(controller.state, LISTENING_STATES.ERROR);

    controller.destroy();
  });

  it('transitions to ERROR and halts if recognition.start() throws an unrecoverable exception', () => {
    mockRecognition.start = () => {
      const err = new Error('Microphone busy');
      err.name = 'NotReadableError';
      throw err;
    };

    const controller = new TalkingTomController();
    let errorReported = null;
    controller.onError = (err) => {
      errorReported = err;
    };

    controller.startListening();

    assert.equal(controller.state, LISTENING_STATES.ERROR);
    assert.equal(controller.isExplicitlyEnabled, false);
    assert.equal(errorReported, 'NotReadableError');

    controller.destroy();
  });
});

