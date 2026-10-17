/**
 * Talking Tom-Style Continuous Listening Controller
 * 
 * Provides:
 * - Hands-free continuous speech recognition
 * - Automatic phrase finalization via final transcripts and silence detection
 * - Absolute feedback-loop prevention (exclusive audio ownership during Ayush's speech)
 * - Result deduplication & suppression of echo loops
 * - Bounded auto-restart with backoff for mobile browsers
 * - Tab visibility lifecycle management (pauses when backgrounded)
 * - Clean resource disposal
 */

export const LISTENING_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  PAUSED: 'paused',
  ERROR: 'error'
};

export class TalkingTomController {
  constructor(options = {}) {
    this.options = {
      lang: 'en-US',
      silenceThresholdMs: 1100,
      postSpeechCooldownMs: 500,
      dedupWindowMs: 3000,
      maxRapidRestarts: 5,
      rapidRestartWindowMs: 4000,
      ...options
    };

    this.state = LISTENING_STATES.IDLE;
    this.recognition = null;
    this.isExplicitlyEnabled = false;
    this.wasListeningBeforeHidden = false;
    this.wasListeningBeforeInterruption = false;

    // Phrase tracking & deduplication
    this.lastProcessedPhrase = '';
    this.lastProcessedTime = 0;
    this.currentInterimText = '';

    // Timers
    this.silenceTimer = null;
    this.cooldownTimer = null;
    this.restartTimer = null;

    // Bounded restart rate tracker
    this.recentRestartTimes = [];

    // Callbacks & Event Listeners
    this.onStateChange = null;
    this.onPhraseFinalized = null;
    this.onError = null;
    this.onInterimResult = null;
    this.stateListeners = new Set();

    // Bind event handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  addStateListener(fn) {
    if (typeof fn === 'function') {
      this.stateListeners.add(fn);
    }
  }

  removeStateListener(fn) {
    this.stateListeners.delete(fn);
  }

  isSupported() {
    return typeof window !== 'undefined' && !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  /**
   * Initialize or reuse the underlying SpeechRecognition instance
   */
  initRecognition() {
    if (!this.isSupported()) return false;
    if (this.recognition) return true;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.lang;

      this.recognition.onresult = (event) => this.handleResult(event);
      this.recognition.onerror = (event) => this.handleError(event);
      this.recognition.onend = () => this.handleEnd();

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      }
      return true;
    } catch (err) {
      console.warn('TalkingTomController init error:', err);
      return false;
    }
  }

  setState(newState, detail = {}) {
    if (this.state === newState && !detail.force) return;
    this.state = newState;
    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(newState, detail);
      } catch (err) {
        console.error('onStateChange callback error:', err);
      }
    }
    for (const listener of this.stateListeners) {
      try {
        listener(newState, detail);
      } catch (err) {
        console.error('stateListener error:', err);
      }
    }
  }

  /**
   * User explicitly enables continuous listening
   */
  startListening() {
    if (!this.isSupported()) {
      this.setState(LISTENING_STATES.ERROR, {
        error: 'unsupported',
        message: 'Speech recognition is not supported in this browser. Try Chrome or Edge.'
      });
      return false;
    }

    this.isExplicitlyEnabled = true;
    this.clearAllTimers();

    if (!this.initRecognition()) {
      this.setState(LISTENING_STATES.ERROR, {
        error: 'init_failed',
        message: 'Could not initialize speech recognition.'
      });
      return false;
    }

    this.attemptRecognitionStart();
    return true;
  }

  /**
   * User explicitly stops listening
   */
  stopListening() {
    this.isExplicitlyEnabled = false;
    this.wasListeningBeforeHidden = false;
    this.wasListeningBeforeInterruption = false;
    this.clearAllTimers();

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    this.currentInterimText = '';
    this.setState(LISTENING_STATES.IDLE);
  }

  /**
   * Temporarily pause listening (e.g. during manual action or mode switch)
   */
  pauseListening() {
    if (!this.isExplicitlyEnabled) return;
    this.wasListeningBeforeInterruption = true;
    this.clearAllTimers();

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.setState(LISTENING_STATES.PAUSED);
  }

  /**
   * Resume listening after an interruption if it was previously enabled
   */
  resumeListening() {
    if (!this.isExplicitlyEnabled || !this.wasListeningBeforeInterruption) return;
    this.wasListeningBeforeInterruption = false;
    this.attemptRecognitionStart();
  }

  /**
   * Coordinates exclusive audio ownership:
   * When Ayush begins speaking, recognition is suspended.
   * When playback ends, a cooldown prevents recognizing speaker echoes.
   */
  setSpeaking(isSpeaking, cooldownMs = this.options.postSpeechCooldownMs) {
    this.clearAllTimers();

    if (isSpeaking) {
      // Transition to SPEAKING state and suspend recognition immediately
      this.setState(LISTENING_STATES.SPEAKING);
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
      }
      this.currentInterimText = '';
    } else {
      // Audio finished playing
      if (!this.isExplicitlyEnabled) {
        this.setState(LISTENING_STATES.IDLE);
        return;
      }

      // Safe cooldown buffer so room/speaker reflections are not re-recognized
      this.setState(LISTENING_STATES.PROCESSING, { message: 'Readying microphone...' });
      this.cooldownTimer = setTimeout(() => {
        if (!this.isExplicitlyEnabled || this.state === LISTENING_STATES.SPEAKING) {
          return;
        }
        this.attemptRecognitionStart();
      }, cooldownMs);
    }
  }

  /**
   * Low-level helper to trigger recognition.start() with bounded rate protection
   */
  attemptRecognitionStart() {
    if (!this.recognition || !this.isExplicitlyEnabled) return;

    // Enforce rate limit to avoid tight restart loops
    const now = Date.now();
    this.recentRestartTimes = this.recentRestartTimes.filter(
      (t) => now - t < this.options.rapidRestartWindowMs
    );

    if (this.recentRestartTimes.length >= this.options.maxRapidRestarts) {
      console.warn('TalkingTomController: Backing off recognition restart to prevent CPU loop.');
      this.restartTimer = setTimeout(() => {
        this.attemptRecognitionStart();
      }, 1400);
      return;
    }

    this.recentRestartTimes.push(now);

    try {
      this.recognition.start();
      this.setState(LISTENING_STATES.LISTENING);
    } catch (err) {
      // If already started (InvalidStateError on some browsers), abort and retry once
      if (err.name === 'InvalidStateError') {
        try {
          this.recognition.abort();
          this.restartTimer = setTimeout(() => {
            if (this.isExplicitlyEnabled && this.state !== LISTENING_STATES.SPEAKING) {
              try {
                this.recognition.start();
                this.setState(LISTENING_STATES.LISTENING);
              } catch {}
            }
          }, 150);
        } catch {}
      } else {
        console.warn('Recognition start error:', err);
      }
    }
  }

  /**
   * Process recognition events
   */
  handleResult(event) {
    // If not in LISTENING state (e.g. Ayush is speaking), discard all incoming speech!
    if (this.state !== LISTENING_STATES.LISTENING) {
      return;
    }

    let interimStr = '';
    let finalizedStr = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript || '';
      if (result.isFinal) {
        finalizedStr += ' ' + text;
      } else {
        interimStr += ' ' + text;
      }
    }

    finalizedStr = finalizedStr.trim();
    interimStr = interimStr.trim();

    if (finalizedStr) {
      this.processFinalPhrase(finalizedStr);
      return;
    }

    if (interimStr) {
      this.currentInterimText = interimStr;
      if (typeof this.onInterimResult === 'function') {
        this.onInterimResult(interimStr);
      }

      // Reset silence timer for interim speech
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.currentInterimText && this.state === LISTENING_STATES.LISTENING) {
          const phraseToFinalize = this.currentInterimText;
          this.currentInterimText = '';
          this.processFinalPhrase(phraseToFinalize);
        }
      }, this.options.silenceThresholdMs);
    }
  }

  /**
   * Deduplicate, validate, and emit finalized phrase for Ayush to repeat
   */
  processFinalPhrase(phrase) {
    if (!phrase) return;
    const clean = phrase.trim();

    // Ignore tiny utterances or punctuation-only
    if (clean.length < 2) return;

    // Deduplication: prevent repeating the exact same phrase within dedupWindowMs
    const now = Date.now();
    const isSamePhrase = clean.toLowerCase() === this.lastProcessedPhrase.toLowerCase();
    const isWithinDedupWindow = (now - this.lastProcessedTime) < this.options.dedupWindowMs;

    if (isSamePhrase && isWithinDedupWindow) {
      return;
    }

    this.lastProcessedPhrase = clean;
    this.lastProcessedTime = now;
    this.currentInterimText = '';

    // Clear any silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Suspend recognition while processing to guarantee no feedback
    this.setState(LISTENING_STATES.PROCESSING, { phrase: clean });
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    if (typeof this.onPhraseFinalized === 'function') {
      try {
        this.onPhraseFinalized(clean);
      } catch (err) {
        console.error('onPhraseFinalized callback error:', err);
      }
    }
  }

  handleError(event) {
    const errorType = event?.error || 'unknown';

    // Normal non-fatal conditions
    if (errorType === 'no-speech') {
      // Room was quiet; recognition will automatically end or restart cleanly
      return;
    }
    if (errorType === 'aborted') {
      // We aborted it intentionally for state management (speaking/stopping)
      return;
    }

    if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
      this.isExplicitlyEnabled = false;
      this.clearAllTimers();
      this.setState(LISTENING_STATES.ERROR, {
        error: errorType,
        message: 'Microphone permission denied. Tap the 🔒 lock icon in your browser to allow microphone access.'
      });
      if (typeof this.onError === 'function') {
        this.onError('not-allowed');
      }
      return;
    }

    // Network or other transient error: report and allow bounded restart
    if (typeof this.onError === 'function') {
      this.onError(errorType);
    }
  }

  handleEnd() {
    // If the controller is in LISTENING state and user wants continuous listening,
    // gracefully restart recognition after a brief debounce
    if (this.isExplicitlyEnabled && this.state === LISTENING_STATES.LISTENING) {
      if (this.restartTimer) clearTimeout(this.restartTimer);
      this.restartTimer = setTimeout(() => {
        if (this.isExplicitlyEnabled && this.state === LISTENING_STATES.LISTENING) {
          this.attemptRecognitionStart();
        }
      }, 180);
    }
  }

  handleVisibilityChange() {
    if (typeof document === 'undefined') return;

    if (document.hidden) {
      if (this.isExplicitlyEnabled && (this.state === LISTENING_STATES.LISTENING || this.state === LISTENING_STATES.PROCESSING)) {
        this.wasListeningBeforeHidden = true;
        this.clearAllTimers();
        if (this.recognition) {
          try {
            this.recognition.abort();
          } catch {}
        }
        this.setState(LISTENING_STATES.PAUSED, { reason: 'hidden' });
      }
    } else {
      if (this.isExplicitlyEnabled && this.wasListeningBeforeHidden) {
        this.wasListeningBeforeHidden = false;
        this.attemptRecognitionStart();
      }
    }
  }

  clearAllTimers() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  destroy() {
    this.stopListening();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.recognition = null;
    this.onStateChange = null;
    this.onPhraseFinalized = null;
    this.onError = null;
    this.onInterimResult = null;
  }
}

export const talkingTomController = new TalkingTomController();
