import { clonedVoiceEngine } from '../../../utils/clonedVoiceEngine.js';
import { voiceEngine } from '../../../utils/voiceRecorder.js';

/**
 * PlaybackManager
 * 
 * Single authoritative playback coordinator:
 * - Coordinates character speech output across all available voice modes
 * - Guarantees no two audio clips or speech engines play simultaneously
 * - Drives character mouth lip-sync amplitude (0.0 - 1.0)
 * - Cleans up audio resources and cancels pending playback immediately on stop
 */
export class PlaybackManager {
  constructor(options = {}) {
    this.options = {
      defaultVoiceMode: 'funny',
      ...options
    };

    this.isPlaying = false;
    this.activeVoiceMode = this.options.defaultVoiceMode;
    this.currentRequestId = 0;

    // Callbacks
    this.onStart = null;
    this.onAmplitude = null;
    this.onEnded = null;
  }

  setVoiceMode(mode) {
    this.activeVoiceMode = mode;
  }

  /**
   * Speak a text transcript using the configured voice mode
   */
  async speakText(text, mode = this.activeVoiceMode, callbacks = {}) {
    this.stop();
    const reqId = ++this.currentRequestId;
    this.isPlaying = true;

    const onStart = () => {
      if (reqId !== this.currentRequestId) return;
      if (typeof this.onStart === 'function') this.onStart();
      if (typeof callbacks.onStart === 'function') callbacks.onStart();
    };

    const onAmplitude = (vol) => {
      if (reqId !== this.currentRequestId) return;
      if (typeof this.onAmplitude === 'function') this.onAmplitude(vol);
      if (typeof callbacks.onAmplitude === 'function') callbacks.onAmplitude(vol);
    };

    const onEnded = () => {
      if (reqId !== this.currentRequestId) return;
      this.isPlaying = false;
      if (typeof this.onAmplitude === 'function') this.onAmplitude(0);
      if (typeof callbacks.onAmplitude === 'function') callbacks.onAmplitude(0);
      if (typeof this.onEnded === 'function') this.onEnded();
      if (typeof callbacks.onEnded === 'function') callbacks.onEnded();
    };

    try {
      await clonedVoiceEngine.speakPhraseWithMode(text, mode, {
        onStart,
        onAmplitude,
        onEnded,
        onFallback: callbacks.onFallback
      });
    } catch (err) {
      console.warn('[PlaybackManager] speakText error:', err);
      onEnded();
    }
  }

  /**
   * Play a captured raw AudioBuffer (native Talking Tom pitch-shifted audio)
   */
  playAudioBuffer(audioBuffer, mode = this.activeVoiceMode, callbacks = {}) {
    this.stop();
    const reqId = ++this.currentRequestId;
    this.isPlaying = true;

    if (typeof this.onStart === 'function') this.onStart();
    if (typeof callbacks.onStart === 'function') callbacks.onStart();

    const onAmplitude = (vol) => {
      if (reqId !== this.currentRequestId) return;
      if (typeof this.onAmplitude === 'function') this.onAmplitude(vol);
      if (typeof callbacks.onAmplitude === 'function') callbacks.onAmplitude(vol);
    };

    const onEnded = () => {
      if (reqId !== this.currentRequestId) return;
      this.isPlaying = false;
      if (typeof this.onAmplitude === 'function') this.onAmplitude(0);
      if (typeof callbacks.onAmplitude === 'function') callbacks.onAmplitude(0);
      if (typeof this.onEnded === 'function') this.onEnded();
      if (typeof callbacks.onEnded === 'function') callbacks.onEnded();
    };

    try {
      voiceEngine.audioBuffer = audioBuffer;
      const playMode = mode === 'device' ? 'original' : 'funny';
      voiceEngine.playRecording(playMode, onAmplitude, onEnded);
    } catch (err) {
      console.warn('[PlaybackManager] playAudioBuffer error:', err);
      onEnded();
    }
  }

  /**
   * Cancel and stop all active audio output immediately
   */
  stop() {
    this.currentRequestId++;
    this.isPlaying = false;

    try {
      clonedVoiceEngine.stopPlayback();
    } catch {}

    try {
      voiceEngine.stopPlayback();
    } catch {}

    if (typeof this.onAmplitude === 'function') {
      this.onAmplitude(0);
    }
  }
}

