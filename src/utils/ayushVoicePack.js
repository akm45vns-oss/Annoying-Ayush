/**
 * Ayush Real Voice Pack Manager — 100% Free & Authentic
 * 
 * Enables Ayush to provide his real recorded voice for romantic actions
 * (Kiss, Hug, Blush, Cuddle, Tease, Love Note) with zero API keys or monthly costs.
 * 
 * Supports:
 * 1. User-recorded voice clips saved locally in localStorage (data URL).
 * 2. Static pre-recorded MP3 clips in /audio/ayush/<action>.mp3.
 * 3. Real-time amplitude extraction to animate 3D mouth / jaw during playback.
 * 4. Graceful fallback when no voice recording is present.
 */

const STORAGE_PREFIX = 'annoying_ayush_real_voice_';

export const VOICE_ACTIONS = [
  { id: 'kiss', label: 'Kiss Reaction', emoji: '💋', hint: 'Say: Mwah! One kiss is never enough, Jaanu!' },
  { id: 'hug', label: 'Hug Reaction', emoji: '🧸', hint: 'Say: Wrap your arms around me, don\'t let go!' },
  { id: 'blush', label: 'Blush Reaction', emoji: '😳', hint: 'Say: Look what you did, you\'re making me blush!' },
  { id: 'cuddle', label: 'Cuddle Reaction', emoji: '🌸', hint: 'Say: Cozy cuddles with you are my absolute favorite.' },
  { id: 'laugh', label: 'Tease Reaction', emoji: '😜', hint: 'Say: Stop poking me! Actually, don\'t stop!' },
  { id: 'loveNote', label: 'Love Note', emoji: '💌', hint: 'Say: You\'re my favorite person in the entire universe.' },
];

class AyushVoicePackManager {
  constructor() {
    this.audioCtx = null;
    this.currentSource = null;
    this.currentAudioEl = null;
    this.analyser = null;
    this.animFrameId = null;
    this.isPlaying = false;
    this.cachedUrls = new Map();
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Check if a custom recording exists for this action
   */
  hasCustomVoice(actionId) {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${actionId}`);
      return !!(stored && stored.startsWith('data:audio'));
    } catch {
      return false;
    }
  }

  /**
   * Get custom recording Data URL if stored
   */
  getCustomVoiceDataUrl(actionId) {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${actionId}`) || null;
    } catch {
      return null;
    }
  }

  /**
   * Save a recorded audio blob for an action
   * @param {string} actionId 
   * @param {Blob} blob 
   */
  async saveActionVoiceBlob(actionId, blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64data = reader.result;
          localStorage.setItem(`${STORAGE_PREFIX}${actionId}`, base64data);
          resolve(base64data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Delete custom recording for an action
   */
  deleteActionVoice(actionId) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${actionId}`);
    } catch {}
  }

  /**
   * Stop active playback cleanly
   */
  stopPlayback() {
    if (this.currentAudioEl) {
      try {
        this.currentAudioEl.pause();
        this.currentAudioEl.currentTime = 0;
      } catch {}
      this.currentAudioEl = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (this.animFrameId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animFrameId);
      }
      this.animFrameId = null;
    }

    this.isPlaying = false;
  }

  /**
   * Play real voice for an action
   * Priority:
   * 1. Locally recorded voice in localStorage
   * 2. Static file in /audio/ayush/<actionId>.mp3
   * Returns true if audio started playing, false if no voice file exists.
   */
  async playActionVoice(actionId, { onAmplitude = () => {}, onEnded = () => {} } = {}) {
    this.stopPlayback();

    const dataUrl = this.getCustomVoiceDataUrl(actionId);
    const audioUrl = dataUrl || `/audio/ayush/${actionId}.mp3`;

    if (typeof window === 'undefined') {
      onEnded();
      return false;
    }

    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = audioUrl;

      let hasStarted = false;

      audio.oncanplaythrough = () => {
        if (hasStarted) return;
        hasStarted = true;
        this.currentAudioEl = audio;
        this.isPlaying = true;

        // Try connecting to Web Audio for amplitude extraction
        try {
          const ctx = this.getAudioContext();
          if (ctx) {
            const source = ctx.createMediaElementSource(audio);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            analyser.connect(ctx.destination);
            this.analyser = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateAmp = () => {
              if (!this.isPlaying || !this.analyser) {
                onAmplitude(0);
                return;
              }
              this.analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              const count = Math.min(24, dataArray.length);
              for (let i = 2; i < count; i++) sum += dataArray[i];
              const avg = sum / (count - 2);
              const normalized = avg > 10 ? Math.min(1.0, (avg - 10) / 100) : 0;
              onAmplitude(normalized);
              if (typeof requestAnimationFrame === 'function') {
                this.animFrameId = requestAnimationFrame(updateAmp);
              }
            };
            updateAmp();
          }
        } catch {
          // If MediaElementSource fails (e.g. CORS or already connected), use simulated pulse
          const startTime = Date.now();
          const interval = setInterval(() => {
            if (!this.isPlaying) {
              clearInterval(interval);
              onAmplitude(0);
              return;
            }
            const t = (Date.now() - startTime) / 1000;
            onAmplitude(Math.abs(Math.sin(t * 12)) * 0.65);
          }, 50);
        }

        audio.play().then(() => {
          resolve(true);
        }).catch(() => {
          this.stopPlayback();
          onEnded();
          resolve(false);
        });
      };

      audio.onended = () => {
        this.stopPlayback();
        onAmplitude(0);
        onEnded();
      };

      audio.onerror = () => {
        this.stopPlayback();
        onEnded();
        resolve(false);
      };

      // Timeout guard: if audio doesn't load within 1.2s, treat as not found
      setTimeout(() => {
        if (!hasStarted) {
          audio.src = '';
          onEnded();
          resolve(false);
        }
      }, 1200);
    });
  }
}

export const ayushVoicePack = new AyushVoicePackManager();
