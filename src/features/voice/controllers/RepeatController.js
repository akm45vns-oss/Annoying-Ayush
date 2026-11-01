import { MicrophoneSession } from './MicrophoneSession.js';
import { SpeechSegmenter } from './SpeechSegmenter.js';
import { TranscriptionService } from './TranscriptionService.js';
import { PlaybackManager } from './PlaybackManager.js';
import { normalizeTranscript } from '../utils/normalizeTranscript.js';

export const REPEAT_STATES = {
  OFF: 'off',
  REQUESTING: 'requesting',
  CALIBRATING: 'calibrating',
  LISTENING: 'listening',
  CAPTURING: 'capturing',
  TRANSCRIBING: 'transcribing',
  SPEAKING: 'speaking',
  PAUSED: 'paused',
  RECOVERING: 'recovering',
  ERROR: 'error'
};

/**
 * RepeatController
 * 
 * Single authoritative state machine orchestrating continuous Talking Tom-style speech repetition.
 * Owns the lifecycle of MicrophoneSession, SpeechSegmenter, TranscriptionService, and PlaybackManager.
 */
export class RepeatController {
  constructor(options = {}) {
    this.options = {
      lang: 'hi-IN',
      recognitionLanguage: 'auto',
      voiceMode: 'funny',
      settlingDelayMs: 250,
      dedupWindowMs: 2000,
      ...options
    };

    // Sub-services
    this.micSession = options.micSession || new MicrophoneSession();
    this.speechSegmenter = options.speechSegmenter || new SpeechSegmenter();
    this.transcriptionService = options.transcriptionService || new TranscriptionService();
    this.playbackManager = options.playbackManager || new PlaybackManager({ defaultVoiceMode: this.options.voiceMode });

    // Session State
    this.state = REPEAT_STATES.OFF;
    this.sessionId = 0;
    this.isExplicitlyEnabled = false;
    this.wasListeningBeforeHidden = false;

    // Deduplication & Loop Protection
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;

    // Listeners & Callbacks
    this.stateListeners = new Set();
    this.onPhraseFinalized = null;
    this.onAudioLevel = null;
    this.onError = null;

    // Bind event handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.setupSubServiceListeners();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  setupSubServiceListeners() {
    // Microphone Session Track End / Disconnect
    this.micSession.onDisconnected = (reason) => {
      this.handleHardwareDisconnect(reason);
    };

    // Speech Segmenter VAD Events
    this.speechSegmenter.onSpeechStart = () => {
      if (this.state === REPEAT_STATES.LISTENING) {
        this.setState(REPEAT_STATES.CAPTURING);
      }
    };

    this.speechSegmenter.onAudioLevel = (rms, normalized) => {
      if (typeof this.onAudioLevel === 'function') {
        this.onAudioLevel(rms, normalized);
      }
    };

    this.speechSegmenter.onCalibrationComplete = () => {
      if (this.state === REPEAT_STATES.CALIBRATING && this.isExplicitlyEnabled) {
        this.setState(REPEAT_STATES.LISTENING);
      }
    };

    this.speechSegmenter.onPhraseCaptured = (audioBlob, durationMs) => {
      this.handlePhraseCaptured(audioBlob, durationMs);
    };
  }

  setState(newState, detail = {}) {
    if (this.state === newState && !detail.force) return;
    const oldState = this.state;
    this.state = newState;

    for (const listener of this.stateListeners) {
      try {
        listener(newState, { previousState: oldState, ...detail });
      } catch (err) {
        console.error('[RepeatController] State listener error:', err);
      }
    }
  }

  addStateListener(fn) {
    if (typeof fn === 'function') {
      this.stateListeners.add(fn);
    }
  }

  removeStateListener(fn) {
    this.stateListeners.delete(fn);
  }

  setVoiceMode(mode) {
    this.options.voiceMode = mode;
    this.playbackManager.setVoiceMode(mode);
  }

  setLanguage(lang) {
    this.options.recognitionLanguage = lang;
    this.options.lang = lang;
  }

  /**
   * User explicitly starts continuous listening (Acquires mic once, begins monitoring)
   */
  async start() {
    if (this.isExplicitlyEnabled && this.state !== REPEAT_STATES.OFF && this.state !== REPEAT_STATES.ERROR) {
      return true;
    }

    this.isExplicitlyEnabled = true;
    this.sessionId++;
    const currentSession = this.sessionId;

    this.setState(REPEAT_STATES.REQUESTING);

    try {
      const stream = await this.micSession.start();

      if (currentSession !== this.sessionId || !this.isExplicitlyEnabled) {
        await this.micSession.stop();
        return false;
      }

      this.speechSegmenter.attachStream(stream, this.micSession.analyser);
      this.setState(REPEAT_STATES.CALIBRATING);
      this.speechSegmenter.start();

      return true;
    } catch (err) {
      if (currentSession !== this.sessionId) return false;
      this.isExplicitlyEnabled = false;

      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      this.setState(REPEAT_STATES.ERROR, {
        error: isDenied ? 'not-allowed' : (err.name || 'microphone_error'),
        message: isDenied
          ? 'Microphone permission denied. Please allow microphone access to talk to Ayush.'
          : (err.message || 'Could not access microphone.')
      });

      if (typeof this.onError === 'function') {
        this.onError(isDenied ? 'not-allowed' : 'microphone_error');
      }
      return false;
    }
  }

  /**
   * Process a captured audio phrase
   */
  async handlePhraseCaptured(audioBlob, _durationMs) {
    if (!this.isExplicitlyEnabled || this.state === REPEAT_STATES.SPEAKING || this.state === REPEAT_STATES.PAUSED) {
      return;
    }

    const currentSession = this.sessionId;
    this.setState(REPEAT_STATES.TRANSCRIBING);

    // Gate speech segmenter during transcription and character playback
    this.speechSegmenter.pause();

    try {
      // 1. Send phrase to speech-to-text service
      const result = await this.transcriptionService.transcribe(audioBlob, {
        language: this.options.recognitionLanguage
      });

      // Discard stale result if session changed or stopped
      if (currentSession !== this.sessionId || !this.isExplicitlyEnabled) {
        return;
      }

      // If text transcription succeeded with valid speech:
      if (result.ok && result.text) {
        const cleanText = normalizeTranscript(result.text);

        // Deduplication & Self-Loop Protection
        const now = Date.now();
        const isDuplicate = cleanText.toLowerCase() === this.lastSpokenText.toLowerCase() &&
          (now - this.lastSpokenTime < this.options.dedupWindowMs);

        if (isDuplicate) {
          this.resumeListeningAfterSettling(currentSession);
          return;
        }

        this.lastSpokenText = cleanText;
        this.lastSpokenTime = now;

        if (typeof this.onPhraseFinalized === 'function') {
          this.onPhraseFinalized(cleanText);
        }

        // Enter SPEAKING state (microphones stay open, VAD remains gated)
        this.setState(REPEAT_STATES.SPEAKING, { text: cleanText });

        await this.playbackManager.speakText(cleanText, this.options.voiceMode, {
          onEnded: () => {
            this.resumeListeningAfterSettling(currentSession);
          }
        });
        return;
      }

      // 2. Fallback: If STT is unconfigured on server or provider error,
      // repeat the captured audio directly in Talking Tom cartoon pitch!
      if (result.unconfigured || !result.ok) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const ctx = new AudioCtx();
            const decoded = await ctx.decodeAudioData(arrayBuffer);
            ctx.close().catch(() => {});

            if (currentSession !== this.sessionId || !this.isExplicitlyEnabled) return;

            this.setState(REPEAT_STATES.SPEAKING, { audioBuffer: decoded });

            this.playbackManager.playAudioBuffer(decoded, this.options.voiceMode, {
              onEnded: () => {
                this.resumeListeningAfterSettling(currentSession);
              }
            });
            return;
          } catch (decodeErr) {
            console.warn('[RepeatController] Audio decode error:', decodeErr);
          }
        }
      }

      // If no valid audio or text could be repeated, return to listening
      this.resumeListeningAfterSettling(currentSession);
    } catch (err) {
      console.warn('[RepeatController] handlePhraseCaptured error:', err);
      this.resumeListeningAfterSettling(currentSession);
    }
  }

  /**
   * Resume VAD on the SAME persistent microphone stream after character playback finishes
   */
  resumeListeningAfterSettling(session) {
    if (session !== this.sessionId || !this.isExplicitlyEnabled) return;

    setTimeout(() => {
      if (session !== this.sessionId || !this.isExplicitlyEnabled) return;
      if (this.state === REPEAT_STATES.PAUSED || this.state === REPEAT_STATES.OFF) return;

      this.speechSegmenter.reset();
      this.speechSegmenter.resume();
      this.setState(REPEAT_STATES.LISTENING);
    }, this.options.settlingDelayMs);
  }

  /**
   * Temporarily pause speech processing (stream remains open)
   */
  pause() {
    if (!this.isExplicitlyEnabled || this.state === REPEAT_STATES.PAUSED || this.state === REPEAT_STATES.OFF) {
      return;
    }

    this.sessionId++;
    this.speechSegmenter.pause();
    this.playbackManager.stop();
    this.micSession.pauseProcessing();
    this.setState(REPEAT_STATES.PAUSED);
  }

  /**
   * Resume speech processing after pause
   */
  resume() {
    if (!this.isExplicitlyEnabled || this.state !== REPEAT_STATES.PAUSED) {
      return;
    }

    this.sessionId++;
    try {
      this.micSession.resumeProcessing();
      this.speechSegmenter.resume();
      this.setState(REPEAT_STATES.LISTENING);
    } catch (err) {
      console.warn('[RepeatController] Resume failed:', err);
      this.handleHardwareDisconnect('resume_failed');
    }
  }

  /**
   * Explicitly stop voice mode and release all microphone tracks
   */
  async stop() {
    this.sessionId++;
    this.isExplicitlyEnabled = false;
    this.wasListeningBeforeHidden = false;

    this.transcriptionService.cancel();
    this.playbackManager.stop();
    this.speechSegmenter.stop();
    await this.micSession.stop();

    this.setState(REPEAT_STATES.OFF);
  }

  /**
   * Set speaking lock externally (for compatibility with UI actions or manual testing)
   */
  setSpeaking(isSpeaking, _cooldownMs = this.options.settlingDelayMs) {
    if (isSpeaking) {
      this.speechSegmenter.pause();
      this.setState(REPEAT_STATES.SPEAKING);
    } else {
      this.resumeListeningAfterSettling(this.sessionId);
    }
  }

  /**
   * Handle unexpected hardware disconnection
   */
  handleHardwareDisconnect(_reason) {
    if (!this.isExplicitlyEnabled) return;

    this.sessionId++;
    this.speechSegmenter.stop();
    this.playbackManager.stop();

    this.setState(REPEAT_STATES.RECOVERING, {
      message: 'Microphone was interrupted. Tap to reconnect.'
    });
  }

  handleVisibilityChange() {
    if (typeof document === 'undefined') return;

    if (document.hidden) {
      if (this.isExplicitlyEnabled && (this.state === REPEAT_STATES.LISTENING || this.state === REPEAT_STATES.CAPTURING || this.state === REPEAT_STATES.CALIBRATING)) {
        this.wasListeningBeforeHidden = true;
        this.pause();
      }
    } else {
      if (this.isExplicitlyEnabled && this.wasListeningBeforeHidden) {
        this.wasListeningBeforeHidden = false;
        this.resume();
      }
    }
  }

  destroy() {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.stateListeners.clear();
    this.onPhraseFinalized = null;
    this.onAudioLevel = null;
    this.onError = null;
  }
}
