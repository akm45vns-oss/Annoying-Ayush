/**
 * Voice Recording & Web Audio Playback Engine
 * Supports:
 * - Cross-browser MediaRecorder recording
 * - Clean microphone track releasing and privacy (100% local, no uploads)
 * - Decoded AudioBuffer management
 * - Original voice playback vs. Funny cartoon pitch voice
 * - Real-time amplitude extraction via AnalyserNode to drive 3D lip-sync
 */

class VoiceEngine {
  constructor() {
    this.audioCtx = null;
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.recordedChunks = [];
    this.recordedBlob = null;
    this.audioBuffer = null;
    this.currentSource = null;
    this.analyser = null;
    this.animFrameId = null;
    this.isPlaying = false;
    this.isRecording = false;
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

  isSupported() {
    return !!(
      typeof window !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  getSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      return '';
    }
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac'
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Request mic and start recording
   */
  async startRecording() {
    if (this.isRecording) return;
    this.stopPlayback();

    if (!this.isSupported()) {
      throw new Error(
        'Microphone recording is not supported in this browser. Please use Chrome, Safari, Edge, or Firefox over HTTPS or localhost.'
      );
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser settings.');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found on this device.');
      }
      throw new Error(`Microphone error: ${err.message || 'Could not start recording.'}`);
    }

    this.recordedChunks = [];
    const mimeType = this.getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
    } catch {
      // Fallback without mime options
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
  }

  /**
   * Stop recording, release microphone tracks immediately, and decode into AudioBuffer
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      return null;
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        // Stop all media tracks immediately for privacy
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }
        this.isRecording = false;

        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.recordedBlob = blob;

        if (blob.size < 500) {
          reject(new Error('Recording was too short. Speak a little longer!'));
          return;
        }

        try {
          const ctx = this.getAudioContext();
          const arrayBuffer = await blob.arrayBuffer();
          // decodeAudioData consumes arrayBuffer copy
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          this.audioBuffer = audioBuffer;
          resolve({ blob, audioBuffer, duration: audioBuffer.duration });
        } catch {
          reject(new Error('Could not process recorded audio in this format. Try again!'));
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.isRecording = false;
        reject(err);
      }
    });
  }

  /**
   * Cancel ongoing recording and release tracks
   */
  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isRecording = false;
    this.recordedChunks = [];
  }

  /**
   * Play back the recording
   * @param {string} mode - 'original' or 'funny'
   * @param {Function} onAmplitude - callback(normalizedVolume 0.0 to 1.0) for mouth animation
   * @param {Function} onEnded - callback when playback completes
   */
  playRecording(mode = 'funny', onAmplitude = () => {}, onEnded = () => {}) {
    this.stopPlayback();

    if (!this.audioBuffer) {
      throw new Error('No recording available to play.');
    }

    const ctx = this.getAudioContext();

    // Source Node
    const source = ctx.createBufferSource();
    source.buffer = this.audioBuffer;
    this.currentSource = source;

    // Analyser Node for Real-time Lip Animation
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.5;
    this.analyser = analyser;

    // Soft Compressor to avoid clipping and unpleasant peaks
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, ctx.currentTime);
    compressor.knee.setValueAtTime(20, ctx.currentTime);
    compressor.ratio.setValueAtTime(6, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.15, ctx.currentTime);

    // Main Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, ctx.currentTime);

    if (mode === 'funny') {
      // Talking Tom cartoon chipmunk voice effect:
      // 1. Scaled playbackRate for higher pitch (1.46x)
      source.playbackRate.setValueAtTime(1.46, ctx.currentTime);

      // 2. Highpass filter to eliminate heavy chest boominess
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(240, ctx.currentTime);

      // 3. Peaking formant filter for bright cartoon vocal resonance
      const formantBoost = ctx.createBiquadFilter();
      formantBoost.type = 'peaking';
      formantBoost.frequency.setValueAtTime(2200, ctx.currentTime);
      formantBoost.Q.setValueAtTime(1.4, ctx.currentTime);
      formantBoost.gain.setValueAtTime(4.5, ctx.currentTime);

      // Chain: source -> highpass -> formantBoost -> compressor -> analyser -> masterGain -> destination
      source.connect(highpass);
      highpass.connect(formantBoost);
      formantBoost.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);
    } else {
      // Original voice playback
      source.playbackRate.setValueAtTime(1.0, ctx.currentTime);

      // Chain: source -> compressor -> analyser -> masterGain -> destination
      source.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);
    }

    this.isPlaying = true;

    // Amplitude sampling loop
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateAmplitude = () => {
      if (!this.isPlaying || !this.analyser) {
        onAmplitude(0);
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      // Focus on vocal speech frequencies (bin 2 to 24)
      const count = Math.min(24, dataArray.length);
      for (let i = 2; i < count; i++) {
        sum += dataArray[i];
      }
      const avg = sum / (count - 2);
      // Normalized amplitude 0.0 to 1.0 with noise gate threshold
      const normalized = avg > 12 ? Math.min(1.0, (avg - 12) / 110) : 0;
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
  }

  /**
   * Stop active playback cleanly
   */
  stopPlayback() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isPlaying = false;
  }

  hasRecording() {
    return !!this.audioBuffer;
  }

  cleanup() {
    this.cancelRecording();
    this.stopPlayback();
    this.audioBuffer = null;
    this.recordedBlob = null;
    this.recordedChunks = [];
  }
}

export const voiceEngine = new VoiceEngine();
