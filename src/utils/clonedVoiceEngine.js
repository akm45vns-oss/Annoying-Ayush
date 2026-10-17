/**
 * Cloned Voice Engine
 * 
 * Handles:
 * - Requesting speech generation from server-side TTS (/api/tts)
 * - Decoding received binary MP3 audio into Web Audio AudioBuffers
 * - Dual playback modes:
 *   1. "ayush": Pristine playback using the authorized cloned voice model.
 *   2. "funny": Real-time pitch-shifted cartoon chipmunk effect applied to the cloned voice!
 * - Real-time amplitude extraction via Web Audio AnalyserNode to drive 3D lip-sync
 * - Browser speech synthesis fallback when no server voice API key is configured
 */

class ClonedVoiceEngine {
  constructor() {
    this.audioCtx = null;
    this.currentSource = null;
    this.analyser = null;
    this.animFrameId = null;
    this.isPlaying = false;
    this.cachedAudioBuffer = null;
    this.lastGeneratedText = '';
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
   * Request TTS generation from server (/api/tts)
   * @param {string} text - text to speak
   * @returns {Promise<{ ok: boolean, isCloned: boolean, error?: string }>}
   */
  async generateSpeech(text) {
    if (!text || !text.trim()) {
      throw new Error('Text prompt cannot be empty.');
    }

    this.stopPlayback();
    const cleanText = text.trim();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
        signal: AbortSignal.timeout(15000) // Bound TTS generation to 15 seconds max
      });

      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('audio/')) {
        // Cloned Voice Audio Buffer received
        const arrayBuffer = await res.arrayBuffer();
        const ctx = this.getAudioContext();
        if (!ctx) throw new Error('Web Audio not supported in this browser.');

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.cachedAudioBuffer = audioBuffer;
        this.lastGeneratedText = cleanText;

        return {
          ok: true,
          isCloned: true,
          duration: audioBuffer.duration
        };
      }

      // JSON response (e.g. unconfigured or fallback)
      const data = await res.json().catch(() => null);
      this.lastGeneratedText = cleanText;

      if (data && data.configured === false) {
        // Voice clone credentials not set on server: indicate fallback available
        return {
          ok: true,
          isCloned: false,
          fallbackReason: 'unconfigured',
          message: data.message || 'ElevenLabs API key not configured on server.'
        };
      }

      return {
        ok: false,
        isCloned: false,
        error: data?.error || 'Could not generate speech.'
      };
    } catch (err) {
      console.warn('TTS request error:', err.message);
      return {
        ok: false,
        isCloned: false,
        error: err.message
      };
    }
  }

  /**
   * Play the generated speech buffer
   * @param {'ayush' | 'funny'} mode - 'ayush' (cloned) vs 'funny' (chipmunk cloned)
   * @param {Function} onAmplitude - (normalized 0.0 to 1.0)
   * @param {Function} onEnded - callback when done
   */
  playSpeech(mode = 'ayush', onAmplitude = () => {}, onEnded = () => {}) {
    this.stopPlayback();

    // If an audio buffer exists (from ElevenLabs or TTS API)
    if (this.cachedAudioBuffer) {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const source = ctx.createBufferSource();
      source.buffer = this.cachedAudioBuffer;
      this.currentSource = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.5;
      this.analyser = analyser;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, ctx.currentTime);
      compressor.knee.setValueAtTime(24, ctx.currentTime);
      compressor.ratio.setValueAtTime(5, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.15, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.95, ctx.currentTime);

      if (mode === 'funny') {
        // Funny Chipmunk Effect applied to the cloned voice
        source.playbackRate.setValueAtTime(1.44, ctx.currentTime);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(260, ctx.currentTime);

        const formantBoost = ctx.createBiquadFilter();
        formantBoost.type = 'peaking';
        formantBoost.frequency.setValueAtTime(2200, ctx.currentTime);
        formantBoost.Q.setValueAtTime(1.4, ctx.currentTime);
        formantBoost.gain.setValueAtTime(4.0, ctx.currentTime);

        source.connect(highpass);
        highpass.connect(formantBoost);
        formantBoost.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(masterGain);
        masterGain.connect(ctx.destination);
      } else {
        // Authentic Cloned Voice (natural 1.0x pitch)
        source.playbackRate.setValueAtTime(1.0, ctx.currentTime);

        source.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(masterGain);
        masterGain.connect(ctx.destination);
      }

      this.isPlaying = true;

      // Amplitude sampling loop for lip sync
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAmplitude = () => {
        if (!this.isPlaying || !this.analyser) {
          onAmplitude(0);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const count = Math.min(24, dataArray.length);
        for (let i = 2; i < count; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (count - 2);
        const normalized = avg > 10 ? Math.min(1.0, (avg - 10) / 115) : 0;
        onAmplitude(normalized);

        this.animFrameId = requestAnimationFrame(updateAmplitude);
      };

      updateAmplitude();

      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        onAmplitude(0);
        onEnded();
      };

      source.start(0);
      return;
    }

    // Fallback: Browser SpeechSynthesis if no audio buffer exists
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.lastGeneratedText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(this.lastGeneratedText);

      if (mode === 'funny') {
        utterance.pitch = 1.6;
        utterance.rate = 1.35;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      this.isPlaying = true;

      // Simulated volume pulse for mouth animation
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(interval);
          onAmplitude(0);
          return;
        }
        const t = (Date.now() - startTime) / 1000;
        const simulatedVol = Math.abs(Math.sin(t * 14)) * 0.7;
        onAmplitude(simulatedVol);
      }, 50);

      utterance.onend = () => {
        this.isPlaying = false;
        clearInterval(interval);
        onAmplitude(0);
        onEnded();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        clearInterval(interval);
        onAmplitude(0);
        onEnded();
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  stopPlayback() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.isPlaying = false;
  }

  hasAudio() {
    return !!this.cachedAudioBuffer;
  }

  cleanup() {
    this.stopPlayback();
    this.cachedAudioBuffer = null;
    this.lastGeneratedText = '';
  }
}

export const clonedVoiceEngine = new ClonedVoiceEngine();
