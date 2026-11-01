/**
 * MicrophoneSession Service
 * 
 * Owns the persistent microphone MediaStream and AudioContext for continuous voice sessions.
 * 
 * Key Principles:
 * - Acquire once when player starts voice mode; reuse the stream across phrases.
 * - Stopping a phrase recorder or pausing speech interpretation NEVER stops the microphone tracks.
 * - Releases tracks ONLY when the player explicitly stops voice mode or on unrecoverable hardware disconnect.
 * - Detects track.onended, AudioContext state changes, and hardware disconnection.
 */

export class MicrophoneSession {
  constructor(options = {}) {
    this.options = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      fftSize: 2048,
      ...options
    };

    this.stream = null;
    this.audioContext = null;
    this.source = null;
    this.analyser = null;
    this.status = 'off'; // 'off' | 'requesting' | 'listening' | 'paused' | 'error'

    // Callbacks
    this.onDisconnected = null;
    this.onStateChange = null;

    // Track listeners bound for removal
    this.boundTrackEndListeners = new Map();
  }

  setStatus(newStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(newStatus);
      } catch (err) {
        console.error('MicrophoneSession onStateChange error:', err);
      }
    }
  }

  /**
   * Check if the current microphone stream is live and usable
   */
  isStreamActive() {
    if (!this.stream) return false;
    // stream.active is standard; also verify at least one track is in 'live' readyState
    const tracks = this.stream.getAudioTracks();
    if (tracks.length === 0) return false;
    const hasLiveTrack = tracks.some((t) => t.readyState === 'live');
    const isStreamActive = typeof this.stream.active === 'boolean' ? this.stream.active : hasLiveTrack;
    return isStreamActive && hasLiveTrack;
  }

  /**
   * Acquire or reuse persistent microphone stream and Web Audio processing graph
   */
  async start() {
    // If stream is already active and healthy, reuse without re-requesting permission
    if (this.isStreamActive() && this.audioContext && this.audioContext.state !== 'closed') {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }
      this.setStatus('listening');
      return this.stream;
    }

    // Teardown any stale or broken previous stream before acquiring fresh
    await this.stop();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('error');
      const error = new Error('Microphone capture is not supported in this browser.');
      error.name = 'UnsupportedError';
      throw error;
    }

    this.setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.options.echoCancellation,
          noiseSuppression: this.options.noiseSuppression,
          autoGainControl: this.options.autoGainControl,
          channelCount: this.options.channelCount
        },
        video: false
      });

      this.stream = stream;

      // Attach track onended listeners to detect hardware disconnect or system revocation
      stream.getAudioTracks().forEach((track) => {
        const handleEnded = () => {
          this.handleTrackEnded(track);
        };
        this.boundTrackEndListeners.set(track, handleEnded);
        track.addEventListener('ended', handleEnded);
      });

      // Initialize Web Audio pipeline
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume().catch(() => {});
        }

        this.source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.options.fftSize;
        this.analyser.smoothingTimeConstant = 0.4;
        this.source.connect(this.analyser);
      }

      this.setStatus('listening');
      return this.stream;
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  /**
   * Pause speech processing while keeping the persistent microphone stream and tracks fully active
   */
  pauseProcessing() {
    if (this.status === 'off' || this.status === 'error') return;
    this.setStatus('paused');
  }

  /**
   * Resume speech processing using the same persistent microphone stream
   */
  resumeProcessing() {
    if (!this.isStreamActive()) {
      throw new Error('Cannot resume: Microphone stream is no longer active.');
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    this.setStatus('listening');
  }

  /**
   * Handle unexpected hardware or OS microphone track closure
   */
  handleTrackEnded(track) {
    console.warn('[MicrophoneSession] Audio track ended:', track.label);
    const wasListening = this.status === 'listening' || this.status === 'paused';
    this.setStatus('error');
    if (typeof this.onDisconnected === 'function' && wasListening) {
      try {
        this.onDisconnected('track_ended');
      } catch (err) {
        console.error('onDisconnected error:', err);
      }
    }
  }

  /**
   * Explicitly stop all microphone tracks and close AudioContext (Full teardown)
   */
  async stop() {
    // Remove track listeners and stop hardware tracks
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        const listener = this.boundTrackEndListeners.get(track);
        if (listener) {
          track.removeEventListener('ended', listener);
        }
        try {
          track.stop();
        } catch {}
      });
      this.boundTrackEndListeners.clear();
      this.stream = null;
    }

    // Disconnect audio nodes and close AudioContext
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }

    this.analyser = null;

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
    }
    this.audioContext = null;

    this.setStatus('off');
  }
}

