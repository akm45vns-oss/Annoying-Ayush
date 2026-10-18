/**
 * Cloned Voice Engine
 * 
 * Handles:
 * - Requesting speech generation from server-side TTS (/api/tts)
 * - Decoding received binary MP3 audio into Web Audio AudioBuffers
 * - Coordinated timeout (17s) and in-flight request cancellation
 * - Safe late-response rejection: late audio never plays after user pressed Stop/Reset
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
    this.isGenerating = false;
    this.cachedAudioBuffer = null;
    this.lastGeneratedText = '';
    this.activeRequestId = 0;
    this.currentAbortController = null;
    this.activeUtterance = null;
    this.watchdogTimer = null;
  }

  /**
   * Unlock AudioContext and SpeechSynthesis on user gesture
   */
  unlockAudio() {
    if (typeof window !== 'undefined') {
      try {
        const ctx = this.getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch {}
      if ('speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          const dummy = new SpeechSynthesisUtterance(' ');
          dummy.volume = 0.01;
          window.speechSynthesis.speak(dummy);
        } catch {}
      }
    }
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
   * Cancels any in-flight TTS generation request
   */
  cancelGeneration() {
    this.activeRequestId++;
    if (this.currentAbortController) {
      try {
        this.currentAbortController.abort();
      } catch {}
      this.currentAbortController = null;
    }
    this.isGenerating = false;
  }

  /**
   * Request TTS generation from server (/api/tts)
   * Client request timeout is 17 seconds (slightly longer than server's 14s overall deadline)
   * 
   * @param {string} text - text to speak
   * @returns {Promise<{ ok: boolean, isCloned: boolean, cancelled?: boolean, error?: string, duration?: number, fallbackReason?: string, message?: string }>}
   */
  async generateSpeech(text) {
    if (!text || !text.trim()) {
      throw new Error('Text prompt cannot be empty.');
    }

    // Stop existing playback and cancel any in-flight generation
    this.stopPlayback();
    this.cancelGeneration();

    const currentReqId = ++this.activeRequestId;
    this.isGenerating = true;

    const controller = new AbortController();
    this.currentAbortController = controller;

    // Client deadline: 17s (allows server's 14s deadline + network delivery margin)
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new Error('TTS request timed out on client (17s).'));
      } catch {}
    }, 17000);

    const cleanText = text.trim();

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
        signal: controller.signal
      });

      // Verify request is still active
      if (currentReqId !== this.activeRequestId) {
        return { ok: false, isCloned: false, cancelled: true };
      }

      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('audio/')) {
        const arrayBuffer = await res.arrayBuffer();

        if (currentReqId !== this.activeRequestId) {
          return { ok: false, isCloned: false, cancelled: true };
        }

        const ctx = this.getAudioContext();
        if (!ctx) throw new Error('Web Audio not supported in this browser.');

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        if (currentReqId !== this.activeRequestId) {
          return { ok: false, isCloned: false, cancelled: true };
        }

        this.cachedAudioBuffer = audioBuffer;
        this.lastGeneratedText = cleanText;

        return {
          ok: true,
          isCloned: true,
          duration: audioBuffer.duration
        };
      }

      // JSON response (e.g. unconfigured, fallback, or error)
      const data = await res.json().catch(() => null);

      if (currentReqId !== this.activeRequestId) {
        return { ok: false, isCloned: false, cancelled: true };
      }

      this.lastGeneratedText = cleanText;

      if (data && data.configured === false) {
        return {
          ok: true,
          isCloned: false,
          fallbackReason: 'unconfigured',
          message: data.message || 'ElevenLabs API key not configured on server.'
        };
      }

      if (data && data.providerError) {
        return {
          ok: false,
          isCloned: false,
          fallbackReason: 'provider_error',
          error: data.error || 'Voice service provider error.'
        };
      }

      return {
        ok: false,
        isCloned: false,
        fallbackReason: 'service_error',
        error: data?.error || 'Could not generate speech.'
      };
    } catch (err) {
      if (currentReqId !== this.activeRequestId || err.name === 'AbortError') {
        return {
          ok: false,
          isCloned: false,
          cancelled: true,
          error: 'TTS generation was cancelled or timed out.'
        };
      }
      console.warn('TTS request error:', err.message);
      return {
        ok: false,
        isCloned: false,
        error: err.message
      };
    } finally {
      clearTimeout(timeoutId);
      if (this.currentAbortController === controller) {
        this.currentAbortController = null;
      }
      if (currentReqId === this.activeRequestId) {
        this.isGenerating = false;
      }
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
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(24, ctx.currentTime);
      compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.15, ctx.currentTime);

      const masterGain = ctx.createGain();
      // Enhanced master gain to ensure speech is comfortably audible on mobile phone speakers
      masterGain.gain.setValueAtTime(1.35, ctx.currentTime);

      if (mode === 'funny') {
        // Funny Chipmunk Effect applied to the cloned voice
        source.playbackRate.setValueAtTime(1.35, ctx.currentTime);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        // Lowered from 260Hz to 120Hz to preserve fundamental vocal power and body
        highpass.frequency.setValueAtTime(120, ctx.currentTime);

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

        if (typeof requestAnimationFrame === 'function') {
          this.animFrameId = requestAnimationFrame(updateAmplitude);
        }
      };

      updateAmplitude();

      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        if (this.animFrameId) {
          if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.animFrameId);
          }
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

      // Support Devanagari Hindi / Bhojpuri and Indian English locales
      const hasDevanagari = /[\u0900-\u097F]/.test(this.lastGeneratedText);
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';

      if (window.speechSynthesis.getVoices) {
        try {
          const voices = window.speechSynthesis.getVoices();
          if (hasDevanagari) {
            const hiVoice = voices.find((v) => v.lang && (v.lang.startsWith('hi') || v.lang.toLowerCase().includes('hi-in')));
            if (hiVoice) utterance.voice = hiVoice;
          } else {
            const inVoice = voices.find((v) => v.lang && (v.lang === 'en-IN' || v.lang.toLowerCase().includes('en-in')));
            if (inVoice) utterance.voice = inVoice;
          }
        } catch {}
      }

      utterance.volume = 1.0;

      if (mode === 'funny') {
        // Tuned for clear, loud chipmunk playback without clipping vocal formants
        utterance.pitch = 1.45;
        utterance.rate = 1.20;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      this.isPlaying = true;

      if (this.mouthInterval) {
        clearInterval(this.mouthInterval);
      }

      // Simulated volume pulse for mouth animation
      const startTime = Date.now();
      this.mouthInterval = setInterval(() => {
        if (!this.isPlaying) {
          if (this.mouthInterval) {
            clearInterval(this.mouthInterval);
            this.mouthInterval = null;
          }
          onAmplitude(0);
          return;
        }
        const t = (Date.now() - startTime) / 1000;
        const simulatedVol = Math.abs(Math.sin(t * 14)) * 0.7;
        onAmplitude(simulatedVol);
      }, 50);

      utterance.onend = () => {
        this.isPlaying = false;
        if (this.mouthInterval) {
          clearInterval(this.mouthInterval);
          this.mouthInterval = null;
        }
        onAmplitude(0);
        onEnded();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        if (this.mouthInterval) {
          clearInterval(this.mouthInterval);
          this.mouthInterval = null;
        }
        onAmplitude(0);
        onEnded();
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Selects the highest quality Indian Male voice available in the browser.
   * Prioritizes male Indian Hindi/Bhojpuri (Madhur, Google hi-IN male, hie, hic)
   * or male Indian English (Prabhat, Ravi, Google en-IN male, ene, end).
   * 
   * @param {string} text - Text to synthesize
   * @returns {SpeechSynthesisVoice|null}
   */
  getBestIndianMaleVoice(text) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    try {
      const voices = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];
      if (!voices || voices.length === 0) return null;

      const hasDevanagari = /[\u0900-\u097F]/.test(text || '');

      const isMale = (v) => {
        const name = (v.name || '').toLowerCase();
        const uri = (v.voiceURI || '').toLowerCase();
        return (
          name.includes('male') ||
          name.includes('madhur') ||
          name.includes('prabhat') ||
          name.includes('hemant') ||
          name.includes('ravi') ||
          name.includes('hie') ||
          name.includes('hic') ||
          name.includes('ene') ||
          name.includes('end') ||
          uri.includes('male') ||
          uri.includes('madhur') ||
          uri.includes('prabhat')
        );
      };

      const isHindi = (v) => {
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        return lang.startsWith('hi') || lang.includes('hi-in');
      };

      const isIndianEnglish = (v) => {
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        return lang === 'en-in' || lang.includes('en-in');
      };

      if (hasDevanagari) {
        // Devanagari Script (Hindi / Bhojpuri)
        // 1. Male Hindi
        const maleHi = voices.find((v) => isHindi(v) && isMale(v));
        if (maleHi) return maleHi;
        // 2. Any Hindi voice
        const anyHi = voices.find((v) => isHindi(v));
        if (anyHi) return anyHi;
        // 3. Male Indian English
        const maleEnIn = voices.find((v) => isIndianEnglish(v) && isMale(v));
        if (maleEnIn) return maleEnIn;
      } else {
        // Latin Script (Indian English or Hinglish)
        // 1. Male Indian English
        const maleEnIn = voices.find((v) => isIndianEnglish(v) && isMale(v));
        if (maleEnIn) return maleEnIn;
        // 2. Male Hindi (natural pronunciation for Hinglish)
        const maleHi = voices.find((v) => isHindi(v) && isMale(v));
        if (maleHi) return maleHi;
        // 3. Any Indian English
        const anyEnIn = voices.find((v) => isIndianEnglish(v));
        if (anyEnIn) return anyEnIn;
        // 4. Any Hindi
        const anyHi = voices.find((v) => isHindi(v));
        if (anyHi) return anyHi;
      }

      // Broad fallback: Any Indian locale or first male voice
      return (
        voices.find((v) => isIndianEnglish(v) || isHindi(v)) ||
        voices.find((v) => isMale(v)) ||
        null
      );
    } catch {
      return null;
    }
  }

  /**
   * Directly speak text via browser SpeechSynthesis with realistic mouth animation
   */
  speakDirectText(text, mode = 'funny', onAmplitude = () => {}, onEnded = () => {}) {
    this.stopPlayback();
    this.lastGeneratedText = text;
    this.cachedAudioBuffer = null;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnded();
      return;
    }

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.activeUtterance = utterance; // Strong reference prevents V8 GC mid-speech on Android Chrome

      // Support Devanagari Hindi / Bhojpuri and Indian English locales
      const hasDevanagari = /[\u0900-\u097F]/.test(text);
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';

      // Select natural Indian Male Voice
      const bestVoice = this.getBestIndianMaleVoice(text);
      if (bestVoice) {
        utterance.voice = bestVoice;
        if (bestVoice.lang) {
          utterance.lang = bestVoice.lang;
        }
      }

      utterance.volume = 1.0;

      if (mode === 'funny') {
        // Tuned for clear, loud chipmunk playback without clipping vocal formants
        utterance.pitch = 1.45;
        utterance.rate = 1.20;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      this.isPlaying = true;

      const finishPlayback = () => {
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }
        if (this.mouthInterval) {
          clearInterval(this.mouthInterval);
          this.mouthInterval = null;
        }
        this.activeUtterance = null;
        this.isPlaying = false;
        onAmplitude(0);
        onEnded();
      };

      // Watchdog timeout prevents infinite freeze if mobile browser drops onend
      const maxDurationMs = Math.max(3000, Math.min(16000, text.length * 180));
      this.watchdogTimer = setTimeout(() => {
        if (this.isPlaying) {
          console.warn('[ClonedVoiceEngine] Watchdog timer expired: auto-releasing speech lock.');
          finishPlayback();
        }
      }, maxDurationMs);

      const startTime = Date.now();
      this.mouthInterval = setInterval(() => {
        if (!this.isPlaying) {
          if (this.mouthInterval) {
            clearInterval(this.mouthInterval);
            this.mouthInterval = null;
          }
          onAmplitude(0);
          return;
        }
        const t = (Date.now() - startTime) / 1000;
        const simulatedVol = Math.abs(Math.sin(t * 14)) * 0.7;
        onAmplitude(simulatedVol);
      }, 50);

      utterance.onend = () => {
        finishPlayback();
      };

      utterance.onerror = (err) => {
        console.warn('[ClonedVoiceEngine] SpeechSynthesis error:', err);
        finishPlayback();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[ClonedVoiceEngine] speakDirectText failed:', err);
      this.isPlaying = false;
      this.activeUtterance = null;
      onEnded();
    }
  }

  /**
   * High-level routing for all voice modes:
   * - 'funny': Instant cartoon chipmunk repeat (Zero network latency)
   * - 'device': Instant device speech synthesis (Zero network latency)
   * - 'cloned': Authorized server-side cloned voice (with graceful fallback to device)
   */
  async speakPhraseWithMode(text, mode = 'funny', {
    onStart = () => {},
    onAmplitude = () => {},
    onEnded = () => {},
    onFallback = () => {}
  } = {}) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      onEnded();
      return;
    }

    if (mode === 'funny' || mode === 'device') {
      onStart();
      this.speakDirectText(cleanText, mode, onAmplitude, onEnded);
      return;
    }

    if (mode === 'cloned') {
      try {
        const res = await this.generateSpeech(cleanText);
        if (res.cancelled) {
          onEnded();
          return;
        }

        onStart();

        if (res.isCloned && this.hasAudio()) {
          this.playSpeech('ayush', onAmplitude, onEnded);
        } else {
          // Unconfigured or error: inform caller and use device voice fallback
          onFallback(res.fallbackReason || 'unconfigured');
          this.speakDirectText(cleanText, 'device', onAmplitude, onEnded);
        }
      } catch {
        onStart();
        onFallback('error');
        this.speakDirectText(cleanText, 'device', onAmplitude, onEnded);
      }
    }
  }

  stopPlayback() {
    this.cancelGeneration();

    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    this.activeUtterance = null;

    if (this.mouthInterval) {
      clearInterval(this.mouthInterval);
      this.mouthInterval = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }

    if (this.animFrameId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animFrameId);
      }
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
    this.audioCtx = null;
  }
}

export const clonedVoiceEngine = new ClonedVoiceEngine();

