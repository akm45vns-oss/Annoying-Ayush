import { chooseSupportedMimeType } from '../utils/chooseMimeType.js';

/**
 * SpeechSegmenter Service
 * 
 * Performs Voice Activity Detection (VAD) and phrase segmentation using a persistent microphone stream:
 * - Calibrates ambient noise floor
 * - Adapts noise floor slowly during genuine silence
 * - Implements hysteresis (start threshold > continuation threshold)
 * - Confirms speech start (100-200ms) to reject clicks and breath puffs
 * - Detects natural conversational pauses (600-900ms silence)
 * - Enforces minimum and maximum phrase bounds (250ms - 10s)
 * - Records phrase audio segments via MediaRecorder without stopping the microphone tracks
 */
export class SpeechSegmenter {
  constructor(options = {}) {
    this.options = {
      // Timing parameters (calibrated for mobile conversation)
      frameIntervalMs: 25,
      calibrationDurationMs: 350,
      speechStartConfirmMs: 140,
      endOfPhraseSilenceMs: 750,
      minPhraseDurationMs: 250,
      maxPhraseDurationMs: 10000,
      
      // Energy & Threshold parameters (normalized 0.0 - 1.0)
      initialNoiseFloor: 0.03,
      minStartThreshold: 0.08,
      startDelta: 0.06,
      continueDelta: 0.03,
      noiseFloorAdaptRate: 0.02,
      ...options
    };

    this.stream = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.selectedMimeType = '';

    // VAD State
    this.isActive = false;
    this.isPaused = false;
    this.isSpeechActive = false;
    this.isCalibrating = false;
    this.noiseFloor = this.options.initialNoiseFloor;
    this.startThreshold = this.options.minStartThreshold;
    this.continueThreshold = this.options.minStartThreshold * 0.7;

    // Timestamps
    this.calibrationStartTime = 0;
    this.speechCandidateStartTime = null;
    this.speechConfirmedStartTime = null;
    this.silenceStartTime = null;

    // Monitor interval
    this.monitorInterval = null;

    // Callbacks
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onPhraseCaptured = null;
    this.onAudioLevel = null;
    this.onCalibrationComplete = null;
    this.onError = null;
  }

  /**
   * Attach persistent stream and analyser node from MicrophoneSession
   */
  attachStream(stream, analyser) {
    this.stream = stream;
    this.analyser = analyser;
    this.selectedMimeType = chooseSupportedMimeType();
  }

  /**
   * Start VAD monitoring and phrase capture
   */
  start() {
    if (this.isActive) return;
    if (!this.stream || !this.analyser) {
      throw new Error('SpeechSegmenter requires an attached microphone stream and analyser node.');
    }

    this.isActive = true;
    this.isPaused = false;
    this.reset();

    // Begin with brief noise floor calibration
    this.calibrateNoiseFloor();
    this.startMonitorLoop();
  }

  /**
   * Pause VAD monitoring (e.g. while character is speaking or app is backgrounded)
   * Discards any partially-recorded phrase buffer that overlaps playback!
   */
  pause() {
    this.isPaused = true;
    this.abortCurrentRecording();
    this.isSpeechActive = false;
    this.speechCandidateStartTime = null;
    this.speechConfirmedStartTime = null;
    this.silenceStartTime = null;
  }

  /**
   * Resume VAD monitoring on the same persistent stream
   */
  resume() {
    if (!this.isActive) return;
    this.isPaused = false;
    this.resetStateTrackers();
  }

  /**
   * Reset phrase trackers without stopping monitor loop
   */
  reset() {
    this.abortCurrentRecording();
    this.resetStateTrackers();
  }

  resetStateTrackers() {
    this.isSpeechActive = false;
    this.speechCandidateStartTime = null;
    this.speechConfirmedStartTime = null;
    this.silenceStartTime = null;
  }

  /**
   * Stop VAD monitoring completely
   */
  stop() {
    this.isActive = false;
    this.isPaused = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.abortCurrentRecording();
    this.resetStateTrackers();
  }

  /**
   * Run background noise calibration to estimate ambient noise floor
   */
  calibrateNoiseFloor() {
    if (this.options.calibrationDurationMs <= 0) {
      this.isCalibrating = false;
      this.noiseFloor = this.options.initialNoiseFloor;
      this.updateThresholds();
      if (typeof this.onCalibrationComplete === 'function') {
        try {
          this.onCalibrationComplete(this.noiseFloor);
        } catch {}
      }
      return;
    }

    this.isCalibrating = true;
    this.calibrationStartTime = Date.now();
    let sampleCount = 0;
    let accumulatedEnergy = 0;

    const calibrationInterval = setInterval(() => {
      if (!this.isActive || !this.isCalibrating) {
        clearInterval(calibrationInterval);
        return;
      }

      const currentRms = this.measureCurrentRms();
      accumulatedEnergy += currentRms;
      sampleCount++;

      const elapsed = Date.now() - this.calibrationStartTime;
      if (elapsed >= this.options.calibrationDurationMs) {
        clearInterval(calibrationInterval);
        this.isCalibrating = false;

        const avgNoise = sampleCount > 0 ? (accumulatedEnergy / sampleCount) : this.options.initialNoiseFloor;
        this.noiseFloor = Math.max(0.015, Math.min(0.25, avgNoise));
        this.updateThresholds();

        if (typeof this.onCalibrationComplete === 'function') {
          try {
            this.onCalibrationComplete(this.noiseFloor);
          } catch {}
        }
      }
    }, 25);
  }

  updateThresholds() {
    this.startThreshold = Math.max(
      this.options.minStartThreshold,
      this.noiseFloor + this.options.startDelta
    );
    this.continueThreshold = Math.max(
      this.options.minStartThreshold * 0.65,
      this.noiseFloor + this.options.continueDelta
    );
  }

  measureCurrentRms() {
    if (!this.analyser) return 0;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    return Math.sqrt(sumSquares / bufferLength);
  }

  startMonitorLoop() {
    if (this.monitorInterval) clearInterval(this.monitorInterval);

    this.monitorInterval = setInterval(() => {
      if (!this.isActive || this.isPaused || this.isCalibrating) return;

      const rms = this.measureCurrentRms();
      const now = Date.now();

      // Emit audio level for UI level meter
      if (typeof this.onAudioLevel === 'function') {
        const normalized = Math.min(1.0, rms * 5.0);
        this.onAudioLevel(rms, normalized);
      }

      this.processAudioFrame(rms, now);
    }, this.options.frameIntervalMs);
  }

  processAudioFrame(rms, now) {
    if (!this.isSpeechActive) {
      // -------------------------------------------------------------
      // STATE: INACTIVE (Waiting for speech start)
      // -------------------------------------------------------------
      if (rms >= this.startThreshold) {
        if (!this.speechCandidateStartTime) {
          this.speechCandidateStartTime = now;
        } else if (now - this.speechCandidateStartTime >= this.options.speechStartConfirmMs) {
          // Confirmed genuine speech start (sustained above start threshold)
          this.isSpeechActive = true;
          this.speechConfirmedStartTime = this.speechCandidateStartTime;
          this.speechCandidateStartTime = null;
          this.silenceStartTime = null;

          this.startPhraseRecording();

          if (typeof this.onSpeechStart === 'function') {
            try { this.onSpeechStart(); } catch {}
          }
        }
      } else {
        // Below start threshold: clear candidate if it didn't sustain
        this.speechCandidateStartTime = null;

        // Slow noise-floor adaptation during genuine silence
        if (rms < this.startThreshold * 0.7) {
          this.noiseFloor = (1 - this.options.noiseFloorAdaptRate) * this.noiseFloor +
            this.options.noiseFloorAdaptRate * rms;
          this.updateThresholds();
        }
      }
    } else {
      // -------------------------------------------------------------
      // STATE: SPEECH ACTIVE (Recording phrase, detecting pause/end)
      // -------------------------------------------------------------
      const phraseDuration = now - (this.speechConfirmedStartTime || now);

      // Bound phrase duration to avoid runaway recording
      if (phraseDuration >= this.options.maxPhraseDurationMs) {
        this.finalizePhrase('max_duration');
        return;
      }

      if (rms >= this.continueThreshold) {
        // Speech continues: reset silence timer
        this.silenceStartTime = null;
      } else {
        // Level dropped below continuation threshold
        if (!this.silenceStartTime) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= this.options.endOfPhraseSilenceMs) {
          // Silence sustained beyond end-of-phrase timeout: finalize phrase!
          this.finalizePhrase('silence');
        }
      }
    }
  }

  /**
   * Start MediaRecorder phrase capture on the persistent stream
   */
  startPhraseRecording() {
    this.abortCurrentRecording();
    this.recordedChunks = [];

    if (typeof MediaRecorder === 'undefined' || !this.stream) return;

    try {
      const options = this.selectedMimeType ? { mimeType: this.selectedMimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (err) => {
        console.warn('[SpeechSegmenter] MediaRecorder error:', err);
        if (typeof this.onError === 'function') {
          this.onError(err);
        }
      };

      // Start recording with 100ms time slice
      this.mediaRecorder.start(100);
    } catch (err) {
      console.warn('[SpeechSegmenter] Failed to start MediaRecorder:', err);
    }
  }

  /**
   * Finalize the captured phrase and emit blob
   */
  finalizePhrase(reason = 'silence') {
    const speechDuration = Date.now() - (this.speechConfirmedStartTime || Date.now());
    this.isSpeechActive = false;
    this.resetStateTrackers();

    if (typeof this.onSpeechEnd === 'function') {
      try { this.onSpeechEnd(reason); } catch {}
    }

    if (!this.mediaRecorder) {
      return;
    }

    const recorder = this.mediaRecorder;
    this.mediaRecorder = null;

    if (recorder.state === 'inactive') {
      return;
    }

    recorder.onstop = () => {
      const chunks = this.recordedChunks;
      this.recordedChunks = [];

      // Reject segments that are too brief to be meaningful speech
      if (speechDuration < this.options.minPhraseDurationMs || chunks.length === 0) {
        return;
      }

      const mimeType = this.selectedMimeType || 'audio/webm';
      const audioBlob = new Blob(chunks, { type: mimeType });

      // Reject microscopic blobs (e.g. empty header only)
      if (audioBlob.size < 800) {
        return;
      }

      if (typeof this.onPhraseCaptured === 'function') {
        try {
          this.onPhraseCaptured(audioBlob, speechDuration);
        } catch (err) {
          console.error('[SpeechSegmenter] onPhraseCaptured error:', err);
        }
      }
    };

    try {
      recorder.stop();
    } catch (err) {
      console.warn('[SpeechSegmenter] Error stopping MediaRecorder:', err);
    }
  }

  /**
   * Discards active recording without emitting onPhraseCaptured
   * (e.g. when Ayush starts speaking or user pauses)
   */
  abortCurrentRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.onerror = null;
        this.mediaRecorder.stop();
      } catch {}
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}
