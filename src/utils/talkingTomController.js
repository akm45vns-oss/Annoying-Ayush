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

import { MicrophoneSession } from '../features/voice/controllers/MicrophoneSession.js';
import { SpeechSegmenter } from '../features/voice/controllers/SpeechSegmenter.js';
import { TranscriptionService } from '../features/voice/controllers/TranscriptionService.js';
import { normalizeTranscript, isValidSpeechTranscript } from '../features/voice/utils/normalizeTranscript.js';

export const LISTENING_STATES = {
  OFF: 'off',
  IDLE: 'idle',
  REQUESTING: 'requesting',
  REQUESTING_PERMISSION: 'requesting_permission',
  STARTING: 'starting',
  CALIBRATING: 'calibrating',
  LISTENING: 'listening',
  CAPTURING: 'capturing',
  TRANSCRIBING: 'transcribing',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  PAUSED: 'paused',
  RECOVERING: 'recovering',
  ERROR: 'error'
};

const OPT_IN_STORAGE_KEY = 'ayush_continuous_listening_opted_in';

/**
 * Safe metadata diagnostic logging (Development mode only)
 * Never logs raw audio buffers, API keys, or sensitive speech text.
 */
export function logVoiceDiagnostic(event, metadata = {}) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    return;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    console.info(`[AyushVoice:${event}]`, {
      time: new Date().toISOString().substring(11, 23),
      ...metadata
    });
  }
}

let permissionQueryInFlight = false;
export async function checkMicrophonePermission() {
  if (permissionQueryInFlight) return 'prompt';
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    try {
      permissionQueryInFlight = true;
      const status = await navigator.permissions.query({ name: 'microphone' });
      return status.state; // 'granted' | 'prompt' | 'denied'
    } catch {
      return 'prompt';
    } finally {
      permissionQueryInFlight = false;
    }
  }
  return 'prompt';
}

export class TalkingTomController {
  constructor(options = {}) {
    this.options = {
      lang: 'hi-IN',
      recognitionLanguage: 'auto', // 'auto' | 'hi-IN' | 'hinglish' | 'en-IN' | 'bho-IN'
      silenceThresholdMs: 1100,
      postSpeechCooldownMs: 450,
      dedupWindowMs: 1800,
      maxRapidRestarts: 5,
      rapidRestartWindowMs: 4000,
      ...options
    };

    this.state = LISTENING_STATES.IDLE;
    this.recognition = null;
    this.isRecognitionActive = false;
    this.isExplicitlyEnabled = false;
    this.wasListeningBeforeHidden = false;
    this.wasListeningBeforeInterruption = false;
    this.sessionGeneration = 0;

    // Phrase tracking & deduplication
    this.lastProcessedPhrase = '';
    this.lastProcessedTime = 0;
    this.currentInterimText = '';

    // Timers
    this.silenceTimer = null;
    this.cooldownTimer = null;
    this.restartTimer = null;
    this.pendingRestartTimer = null;
    this.consecutiveSilenceCount = 0;

    // Bounded restart rate tracker
    this.recentRestartTimes = [];

    // Dedicated Persistent Microphone and VAD services (Spec §2 & §3)
    this.micSession = new MicrophoneSession();
    this.speechSegmenter = new SpeechSegmenter();
    this.transcriptionService = new TranscriptionService();

    // Callbacks & Event Listeners
    this.onStateChange = null;
    this.onPhraseFinalized = null;
    this.onAudioRecorded = null;
    this.onError = null;
    this.onInterimResult = null;
    this.onAudioLevel = null;
    this.stateListeners = new Set();

    // Setup persistent VAD event bindings
    this.setupPersistentVadListeners();

    // Bind event handlers
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  setupPersistentVadListeners() {
    this.micSession.onDisconnected = (_reason) => {
      if (this.isExplicitlyEnabled) {
        this.setState(LISTENING_STATES.RECOVERING, { message: 'Microphone disconnected. Tap to reconnect.' });
      }
    };

    this.speechSegmenter.onSpeechStart = () => {
      if (this.state === LISTENING_STATES.LISTENING) {
        this.setState(LISTENING_STATES.CAPTURING, { message: 'Hearing your voice...' });
      }
    };

    this.speechSegmenter.onAudioLevel = (rms, normalized) => {
      if (typeof this.onAudioLevel === 'function') {
        this.onAudioLevel(rms, normalized);
      }
    };

    this.speechSegmenter.onCalibrationComplete = () => {
      if (this.state === LISTENING_STATES.CALIBRATING && this.isExplicitlyEnabled) {
        this.setState(LISTENING_STATES.LISTENING, { message: 'Ayush is listening!' });
      }
    };

    this.speechSegmenter.onPhraseCaptured = (blob, durationMs) => {
      this.handleAudioPhraseCaptured(blob, durationMs);
    };
  }

  hasOptedIn() {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      return window.localStorage.getItem(OPT_IN_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  setOptedIn(enabled) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(OPT_IN_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {}
  }

  addStateListener(fn) {
    if (typeof fn === 'function') {
      this.stateListeners.add(fn);
    }
  }

  removeStateListener(fn) {
    this.stateListeners.delete(fn);
  }

  hasSpeechRecognition() {
    return typeof window !== 'undefined' && !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(
      this.hasSpeechRecognition() ||
      (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof window.MediaRecorder !== 'undefined')
    );
  }

  /**
   * Resolve an internal recognition language setting to an optimal SpeechRecognition locale
   */
  resolveRecognitionLocale(langSetting = this.options.recognitionLanguage) {
    switch (langSetting) {
      case 'hi-IN':
        return 'hi-IN';
      case 'en-IN':
        return 'en-IN';
      case 'hinglish':
        // Google Speech Recognition / Web Speech API uses hi-IN with bilingual English/Hindi model
        return 'hi-IN';
      case 'bho-IN':
        // Native Bhojpuri locale where browser supports it; falls back cleanly to hi-IN
        return 'bho-IN';
      case 'auto':
      default: {
        if (typeof navigator !== 'undefined' && navigator.language) {
          const navLang = navigator.language.toLowerCase();
          if (navLang.startsWith('hi')) return 'hi-IN';
          if (navLang.startsWith('bho')) return 'bho-IN';
          if (navLang === 'en-in') return 'en-IN';
        }
        // Default to Indian English / Hindi-ready Indian locale
        return 'hi-IN';
      }
    }
  }

  /**
   * Set user language preference cleanly without bouncing active microphone sessions
   */
  setLanguage(langSetting) {
    this.options.recognitionLanguage = langSetting;
    const resolvedLocale = this.resolveRecognitionLocale(langSetting);
    this.options.lang = resolvedLocale;
    if (this.recognition) {
      try {
        this.recognition.lang = resolvedLocale;
      } catch {}
    }
  }

  /**
   * Initialize or reuse the underlying SpeechRecognition instance
   */
  initRecognition() {
    if (!this.isSupported()) return false;
    if (this.recognition) {
      this.recognition.lang = this.resolveRecognitionLocale(this.options.recognitionLanguage);
      return true;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.resolveRecognitionLocale(this.options.recognitionLanguage);

      this.recognition.onstart = () => this.handleStart();
      this.recognition.onresult = (event) => this.handleResult(event);
      this.recognition.onerror = (event) => this.handleError(event);
      this.recognition.onend = () => this.handleEnd(this.sessionGeneration);

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
    const previousState = this.state;
    this.state = newState;
    logVoiceDiagnostic('state_transition', { from: previousState, to: newState, ...detail });
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
   * User explicitly enables continuous listening (Idempotent)
   */
  startListening() {
    if (!this.isSupported()) {
      this.setState(LISTENING_STATES.ERROR, {
        error: 'unsupported',
        message: 'Speech recognition or microphone recording is not supported in this browser.'
      });
      return false;
    }

    this.isExplicitlyEnabled = true;
    this.setOptedIn(true);
    this.consecutiveSilenceCount = 0;

    // If already actively running, do not duplicate start
    if (this.state === LISTENING_STATES.LISTENING || this.state === LISTENING_STATES.STARTING) {
      return true;
    }

    if (this.state === LISTENING_STATES.SPEAKING || this.state === LISTENING_STATES.PROCESSING) {
      return true;
    }

    this.sessionGeneration++;
    const currentGen = this.sessionGeneration;
    this.clearAllTimers();

    if (this.hasSpeechRecognition()) {
      if (!this.initRecognition()) {
        this.setState(LISTENING_STATES.ERROR, {
          error: 'init_failed',
          message: 'Could not initialize speech recognition.'
        });
        return false;
      }
      this.attemptRecognitionStart(currentGen);
      return true;
    }

    // Fallback: Audio VAD Listening on native Android WebView / Capacitor / mobile
    this.startAudioVadListening(currentGen);
    return true;
  }

  /**
   * User explicitly stops listening (Idempotent)
   */
  stopListening() {
    if (this.state === LISTENING_STATES.IDLE && !this.isExplicitlyEnabled) {
      return;
    }
    this.sessionGeneration++;
    this.isExplicitlyEnabled = false;
    this.setOptedIn(false);
    this.wasListeningBeforeHidden = false;
    this.wasListeningBeforeInterruption = false;
    this.clearAllTimers();

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.stopAudioVad();

    this.currentInterimText = '';
    this.setState(LISTENING_STATES.IDLE);
  }

  /**
   * Temporarily pause listening (e.g. during manual action, tab switch, or AI Chat) (Idempotent)
   */
  pauseListening() {
    if (!this.isExplicitlyEnabled || this.state === LISTENING_STATES.PAUSED || this.state === LISTENING_STATES.IDLE) {
      return;
    }
    this.sessionGeneration++;
    this.wasListeningBeforeInterruption = true;
    this.clearAllTimers();

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.stopAudioVad();

    this.currentInterimText = '';
    this.setState(LISTENING_STATES.PAUSED);
  }

  /**
   * Resume listening after an interruption if it was previously enabled (Idempotent)
   */
  resumeListening() {
    if (!this.isExplicitlyEnabled || !this.wasListeningBeforeInterruption) return;
    this.wasListeningBeforeInterruption = false;
    this.sessionGeneration++;
    const currentGen = this.sessionGeneration;
    this.clearAllTimers();
    if (this.hasSpeechRecognition()) {
      this.attemptRecognitionStart(currentGen);
    } else {
      this.startAudioVadListening(currentGen);
    }
  }

  /**
   * Centralized restart coordinator: Prevents competing timers and duplicate restart requests
   */
  scheduleRestart(delayMs = 0, reason = 'auto') {
    if (!this.isExplicitlyEnabled) return;
    if (this.state === LISTENING_STATES.SPEAKING) return;

    const currentGen = this.sessionGeneration;
    if (this.pendingRestartTimer) {
      clearTimeout(this.pendingRestartTimer);
      this.pendingRestartTimer = null;
    }

    logVoiceDiagnostic('restart_scheduled', { delayMs, reason, generation: currentGen });

    this.pendingRestartTimer = setTimeout(() => {
      this.pendingRestartTimer = null;
      if (currentGen !== this.sessionGeneration) return;
      if (!this.isExplicitlyEnabled || this.state === LISTENING_STATES.SPEAKING) return;

      if (this.speechSegmenter && this.speechSegmenter.stream && this.speechSegmenter.stream.active) {
        this.speechSegmenter.reset();
        this.speechSegmenter.resume();
        this.setState(LISTENING_STATES.LISTENING, { message: 'Ayush is listening!' });
      } else if (this.hasSpeechRecognition()) {
        if (this.isRecognitionActive) {
          this.setState(LISTENING_STATES.LISTENING);
        } else {
          this.attemptRecognitionStart(currentGen);
        }
      } else {
        this.startAudioVadListening(currentGen);
      }
    }, delayMs);
  }

  /**
   * Stop active audio VAD and release microphone tracks
   */
  stopAudioVad() {
    if (this.speechSegmenter) {
      this.speechSegmenter.stop();
    }
    if (this.transcriptionService) {
      this.transcriptionService.cancel();
    }
    if (this.micSession) {
      this.micSession.stop().catch(() => {});
    }
  }

  /**
   * Persistent Microphone & VAD Continuous Listening Engine (Spec §2, §3, §4):
   * Acquires the microphone ONCE, continuously segments speech phrases with adaptive noise calibration,
   * transcribes completed phrases, repeats via character TTS/audio with lip-sync,
   * gates VAD during playback, and resumes on the SAME microphone stream!
   */
  async startAudioVadListening(generation = this.sessionGeneration) {
    if (generation !== this.sessionGeneration) return;
    if (!this.isExplicitlyEnabled) return;
    if (this.state === LISTENING_STATES.SPEAKING) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setState(LISTENING_STATES.ERROR, {
        error: 'unsupported',
        message: 'Audio recording is not supported in this environment.'
      });
      return;
    }

    try {
      this.setState(LISTENING_STATES.STARTING, { message: 'Accessing microphone...' });
      const stream = await this.micSession.start();

      if (generation !== this.sessionGeneration || !this.isExplicitlyEnabled) {
        await this.micSession.stop();
        return;
      }

      this.speechSegmenter.attachStream(stream, this.micSession.analyser);
      this.setState(LISTENING_STATES.CALIBRATING, { message: 'Calibrating microphone...' });
      this.speechSegmenter.start();
    } catch (err) {
      if (generation !== this.sessionGeneration) return;
      console.warn('[TalkingTomController] Audio VAD start error:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      this.setState(LISTENING_STATES.ERROR, {
        error: isDenied ? 'not-allowed' : 'audio-capture',
        message: isDenied
          ? 'Microphone access denied. Please grant microphone permission so Ayush can hear you!'
          : 'Could not access microphone.'
      });
      if (typeof this.onError === 'function') {
        this.onError(isDenied ? 'not-allowed' : 'audio-capture');
      }
    }
  }

  async handleAudioPhraseCaptured(blob, _durationMs) {
    if (!this.isExplicitlyEnabled || this.state === LISTENING_STATES.SPEAKING || this.state === LISTENING_STATES.PAUSED) {
      return;
    }

    const currentGen = this.sessionGeneration;
    this.setState(LISTENING_STATES.PROCESSING, { message: 'Hearing your phrase...' });

    // Gate VAD during transcription and character playback (Spec §7)
    this.speechSegmenter.pause();

    try {
      // 1. Attempt speech-to-text via TranscriptionService (/api/stt)
      const sttResult = await this.transcriptionService.transcribe(blob, {
        language: this.options.recognitionLanguage
      });

      if (currentGen !== this.sessionGeneration || !this.isExplicitlyEnabled) {
        return;
      }

      if (sttResult.ok && sttResult.text) {
        const cleanText = normalizeTranscript(sttResult.text);
        if (isValidSpeechTranscript(cleanText)) {
          this.processFinalPhrase(cleanText);
          return;
        }
      }

      // 2. Fallback: If STT is unconfigured or unavailable, repeat the audio directly with pitch-shift!
      const arrayBuffer = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        ctx.close().catch(() => {});

        if (currentGen !== this.sessionGeneration || !this.isExplicitlyEnabled) return;

        if (typeof this.onAudioRecorded === 'function') {
          this.onAudioRecorded(decoded, blob);
        }
      }
    } catch (err) {
      console.warn('[TalkingTomController] handleAudioPhraseCaptured error:', err);
      if (this.isExplicitlyEnabled) {
        this.scheduleRestart(300, 'phrase_capture_error');
      }
    }
  }

  /**
   * Coordinates exclusive audio ownership:
   * When Ayush begins speaking, incoming speech results are software-gated without tearing down recognition.
   * When playback ends, a single unified restart schedules recognition after speaker cooldown.
   */
  setSpeaking(isSpeaking, cooldownMs = this.options.postSpeechCooldownMs) {
    this.clearAllTimers();

    if (isSpeaking) {
      // Transition to SPEAKING state (handleResult immediately ignores any input)
      logVoiceDiagnostic('speaking_started', { generation: this.sessionGeneration });
      if (this.speechSegmenter) {
        this.speechSegmenter.pause();
      }
      this.setState(LISTENING_STATES.SPEAKING);
      this.currentInterimText = '';
    } else {
      // Audio finished playing
      logVoiceDiagnostic('speaking_finished', { cooldownMs });
      if (!this.isExplicitlyEnabled) {
        this.setState(LISTENING_STATES.IDLE);
        return;
      }

      this.consecutiveSilenceCount = 0;
      // Safe cooldown buffer so room/speaker reflections are not re-recognized
      this.setState(LISTENING_STATES.PROCESSING, { message: 'Readying microphone...' });
      this.scheduleRestart(cooldownMs, 'playback_finished');
    }
  }

  handleStart() {
    this.isRecognitionActive = true;
    logVoiceDiagnostic('recognition_onstart', { generation: this.sessionGeneration, state: this.state });
    if (this.isExplicitlyEnabled && this.state !== LISTENING_STATES.SPEAKING && this.state !== LISTENING_STATES.PROCESSING) {
      this.setState(LISTENING_STATES.LISTENING);
    }
  }

  /**
   * Low-level helper to trigger recognition.start() with generation tracking & bounded rate protection
   */
  attemptRecognitionStart(generation = this.sessionGeneration) {
    if (generation !== this.sessionGeneration) return;
    if (!this.recognition || !this.isExplicitlyEnabled) return;
    if (this.state === LISTENING_STATES.SPEAKING) {
      return;
    }

    if (this.isRecognitionActive) {
      this.setState(LISTENING_STATES.LISTENING);
      return;
    }

    // Enforce rate limit to avoid tight restart loops
    const now = Date.now();
    this.recentRestartTimes = this.recentRestartTimes.filter(
      (t) => now - t < this.options.rapidRestartWindowMs
    );

    if (this.recentRestartTimes.length >= this.options.maxRapidRestarts) {
      console.warn('TalkingTomController: Backing off recognition restart to prevent CPU loop.');
      this.setState(LISTENING_STATES.STARTING);
      this.restartTimer = setTimeout(() => {
        if (generation === this.sessionGeneration) {
          this.attemptRecognitionStart(generation);
        }
      }, 1400);
      return;
    }

    this.recentRestartTimes.push(now);

    try {
      this.recognition.start();
      this.setState(LISTENING_STATES.LISTENING);
    } catch (err) {
      // If recognition is already started/active (InvalidStateError), simply transition to LISTENING
      if (err.name === 'InvalidStateError') {
        this.setState(LISTENING_STATES.LISTENING);
      } else {
        console.warn('Recognition start error:', err);
        this.isExplicitlyEnabled = false;
        this.setState(LISTENING_STATES.ERROR, {
          error: err.name || 'start_failed',
          message: err.message || 'Could not start microphone.'
        });
        if (typeof this.onError === 'function') {
          this.onError(err.name || 'start_failed');
        }
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
      logVoiceDiagnostic('recognition_result_final', { length: finalizedStr.length });
      this.processFinalPhrase(finalizedStr);
      return;
    }

    if (interimStr) {
      logVoiceDiagnostic('recognition_result_interim', { length: interimStr.length });
      this.currentInterimText = interimStr;
      if (typeof this.onInterimResult === 'function') {
        this.onInterimResult(interimStr);
      }

      // Reset silence timer for interim speech
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      const currentGen = this.sessionGeneration;
      this.silenceTimer = setTimeout(() => {
        if (currentGen !== this.sessionGeneration) return;
        if (this.currentInterimText && this.state === LISTENING_STATES.LISTENING) {
          const phraseToFinalize = this.currentInterimText;
          this.currentInterimText = '';
          this.processFinalPhrase(phraseToFinalize);
        }
      }, this.options.silenceThresholdMs);
    }
  }

  /**
   * Deduplicate, validate, and emit finalized phrase for Ayush to repeat.
   * Full Unicode support for Indian languages (Devanagari, Hindi, Hinglish, Bhojpuri, Indian English).
   */
  processFinalPhrase(phrase) {
    this.currentInterimText = '';
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (!phrase) return;
    const clean = phrase.trim();

    // Support ASCII alphanumeric, Devanagari script (\u0900-\u097F), and general Unicode letters/numbers (\p{L}\p{N})
    const hasValidSpeechChars = /[a-zA-Z0-9\u0900-\u097F]/.test(clean) || (/\p{L}|\p{N}/u).test(clean);
    if (clean.length < 2 || !hasValidSpeechChars) return;

    // Filter isolated ambient noise / filler utterances that browsers commonly emit for coughs/breaths
    const normalized = clean.toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '');
    const fillerWords = new Set([
      'uh', 'um', 'ah', 'eh', 'mm', 'hm', 'mhm', 'shh', 'tsk',
      'अह', 'उम', 'हम्म', 'हमम', 'आह'
    ]);
    if (fillerWords.has(normalized)) return;

    // Deduplication: prevent repeating the exact same phrase within dedupWindowMs
    const now = Date.now();
    const isSamePhrase = clean.toLowerCase() === this.lastProcessedPhrase.toLowerCase();
    const isWithinDedupWindow = (now - this.lastProcessedTime) < this.options.dedupWindowMs;

    if (isSamePhrase && isWithinDedupWindow) {
      return;
    }

    this.lastProcessedPhrase = clean;
    this.lastProcessedTime = now;
    this.consecutiveSilenceCount = 0;

    // Suspend recognition while processing to guarantee no feedback (software-gated)
    this.setState(LISTENING_STATES.PROCESSING, { phrase: clean });
    logVoiceDiagnostic('phrase_finalized', { length: clean.length, lang: this.options.lang });

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
    this.isRecognitionActive = false;
    logVoiceDiagnostic('recognition_onerror', { error: errorType, state: this.state });

    // Normal non-fatal conditions
    if (errorType === 'no-speech') {
      this.consecutiveSilenceCount++;
      logVoiceDiagnostic('no_speech_detected', { count: this.consecutiveSilenceCount });
      return;
    }
    if (errorType === 'aborted') {
      // Aborted intentionally for state management (speaking/stopping/pausing)
      return;
    }

    // Handle unsupported-language gracefully
    if (errorType === 'language-not-supported') {
      console.warn('SpeechRecognition: Requested language not supported by browser, falling back to hi-IN');
      if (this.recognition) {
        this.recognition.lang = 'hi-IN';
      }
      return;
    }

    if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
      this.sessionGeneration++;
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

    if (errorType === 'audio-capture') {
      this.sessionGeneration++;
      this.isExplicitlyEnabled = false;
      this.clearAllTimers();
      this.setState(LISTENING_STATES.ERROR, {
        error: errorType,
        message: 'Microphone hardware capture failed or device disconnected.'
      });
      if (typeof this.onError === 'function') {
        this.onError(errorType);
      }
      return;
    }

    // Network or other transient error: report and allow bounded restart
    if (typeof this.onError === 'function') {
      this.onError(errorType);
    }
  }

  handleEnd(generation = this.sessionGeneration) {
    this.isRecognitionActive = false;
    logVoiceDiagnostic('recognition_onend', { generation, state: this.state });

    // If generation is stale, ignore callback completely!
    if (generation !== this.sessionGeneration) return;

    // If speaking or processing, do not restart yet; setSpeaking(false) handles return to listening cleanly after cooldown
    if (this.state === LISTENING_STATES.SPEAKING || this.state === LISTENING_STATES.PROCESSING) {
      return;
    }

    // Android Google Speech recovery:
    // Android Chrome often terminates speech recognition upon speech pause without emitting an isFinal result.
    // If interim text was captured while listening, promote and finalize it immediately so the phrase is repeated!
    if (this.currentInterimText && (this.state === LISTENING_STATES.LISTENING || this.state === LISTENING_STATES.STARTING)) {
      const phraseToFinalize = this.currentInterimText;
      this.currentInterimText = '';
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      logVoiceDiagnostic('interim_promoted_on_end', { length: phraseToFinalize.length, lang: this.options.lang });
      this.processFinalPhrase(phraseToFinalize);
      return;
    }

    // Gracefully coordinate continuous listening restart through centralized scheduler
    if (this.isExplicitlyEnabled && (this.state === LISTENING_STATES.LISTENING || this.state === LISTENING_STATES.STARTING)) {
      if (this.consecutiveSilenceCount >= 2) {
        // Back off on prolonged empty room silence: prevents continuous Android Google Speech earcon sound loop!
        logVoiceDiagnostic('silence_backoff', { silenceCount: this.consecutiveSilenceCount });
        this.scheduleRestart(3500, 'silence_backoff');
      } else {
        this.scheduleRestart(400, 'recognition_ended');
      }
    }
  }

  handleVisibilityChange() {
    if (typeof document === 'undefined') return;

    if (document.hidden) {
      if (this.isExplicitlyEnabled && (this.state === LISTENING_STATES.LISTENING || this.state === LISTENING_STATES.PROCESSING || this.state === LISTENING_STATES.STARTING)) {
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
        this.sessionGeneration++;
        this.attemptRecognitionStart(this.sessionGeneration);
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
    if (this.pendingRestartTimer) {
      clearTimeout(this.pendingRestartTimer);
      this.pendingRestartTimer = null;
    }
  }

  destroy() {
    this.sessionGeneration++;
    this.stopListening();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.recognition = null;
    this.onStateChange = null;
    this.onPhraseFinalized = null;
    this.onAudioRecorded = null;
    this.onError = null;
    this.onInterimResult = null;
  }
}

export const talkingTomController = new TalkingTomController();
