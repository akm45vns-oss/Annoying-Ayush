import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Sparkles, 
  Volume2, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { voiceEngine } from '../utils/voiceRecorder';

/**
 * Milestone 3 Voice Panel
 * Features:
 * - Hold to record / Tap to record
 * - Voice modes: 'funny' (Talking Tom chipmunk) vs 'original'
 * - Real-time recording timer
 * - Play Again / Stop controls
 * - Status indicators and microphone error handling
 * - Privacy notice: 100% local audio
 */
export default function VoicePanel({
  voiceMode,
  setVoiceMode,
  onPlaybackStart = () => {},
  onPlaybackEnd = () => {},
  onAmplitude = () => {}
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Hold or tap Mic to speak!');
  const [errorMessage, setErrorMessage] = useState('');

  const timerIntervalRef = useRef(null);
  const isHoldingRef = useRef(false);
  const holdStartTimeRef = useRef(0);
  const maxDurationTimeoutRef = useRef(null);
  const stopRecordingActionRef = useRef(null);

  // Maximum allowed recording: 15 seconds
  const MAX_RECORD_SECONDS = 15;

  const startTimer = useCallback(() => {
    setRecordSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev + 1 >= MAX_RECORD_SECONDS) {
          stopRecordingActionRef.current?.();
          return MAX_RECORD_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
  }, []);

  const startRecordingAction = async () => {
    if (isRecording || isPlaying) return;
    setErrorMessage('');
    setStatusMessage('🔴 Listening... say something cute!');

    try {
      await voiceEngine.startRecording();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      setIsRecording(false);
      stopTimer();
      setErrorMessage(err.message || 'Microphone error.');
      setStatusMessage('Microphone access needed.');
    }
  };

  const stopPlaybackAction = () => {
    voiceEngine.stopPlayback();
    setIsPlaying(false);
    onPlaybackEnd();
    onAmplitude(0);
    setStatusMessage('Playback stopped.');
  };

  const playRecordingAction = () => {
    if (!voiceEngine.hasRecording()) return;

    try {
      setIsPlaying(true);
      onPlaybackStart();
      setStatusMessage(`Repeating in ${voiceMode === 'funny' ? 'Funny Chipmunk 🐿️' : 'Original 🎙️'} voice...`);

      voiceEngine.playRecording(
        voiceMode,
        (vol) => {
          onAmplitude(vol);
        },
        () => {
          setIsPlaying(false);
          onPlaybackEnd();
          setStatusMessage('Tap Play Again or record a new message!');
        }
      );
    } catch (err) {
      setIsPlaying(false);
      onPlaybackEnd();
      setErrorMessage(err?.message || 'Could not play audio.');
    }
  };

  const handlePlaySampleVoice = () => {
    try {
      voiceEngine.loadSampleAudio();
      setHasRecording(true);
      setErrorMessage('');
      setIsPlaying(true);
      onPlaybackStart();
      setStatusMessage(`Playing sample in ${voiceMode === 'funny' ? 'Funny Chipmunk 🐿️' : 'Original 🎙️'} voice...`);

      voiceEngine.playRecording(
        voiceMode,
        (vol) => {
          onAmplitude(vol);
        },
        () => {
          setIsPlaying(false);
          onPlaybackEnd();
          setStatusMessage('Tap Play Again or record with mic!');
        }
      );
    } catch (err) {
      setIsPlaying(false);
      onPlaybackEnd();
      setErrorMessage(err?.message || 'Could not play sample audio.');
    }
  };

  const stopRecordingAction = async () => {
    if (!voiceEngine.isRecording) return;
    stopTimer();
    setIsRecording(false);
    setStatusMessage('Processing your voice... ✨');

    try {
      const result = await voiceEngine.stopRecording();
      if (result) {
        setHasRecording(true);
        setStatusMessage('Ayush is repeating your words! 🎙️');
        // Auto-play immediately (Talking Tom behavior)
        playRecordingAction();
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Recording failed.');
      setStatusMessage('Try speaking a bit longer!');
    }
  };

  useEffect(() => {
    stopRecordingActionRef.current = stopRecordingAction;
  });

  // Pointer event handlers supporting both "Hold to Record" and "Tap to Record"
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (isPlaying) {
      stopPlaybackAction();
      return;
    }
    if (isRecording) {
      // Tap-to-stop
      stopRecordingAction();
      return;
    }
    isHoldingRef.current = true;
    holdStartTimeRef.current = Date.now();
    startRecordingAction();
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    const duration = Date.now() - holdStartTimeRef.current;
    // If held for more than 400ms, release-to-stop
    if (duration > 400 && isRecording) {
      stopRecordingAction();
    }
    // If it was a quick tap (<400ms), we let it keep recording until the next tap or Stop!
  };

  const handlePointerCancel = () => {
    if (isHoldingRef.current && isRecording) {
      isHoldingRef.current = false;
      stopRecordingAction();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      voiceEngine.cleanup();
    };
  }, [stopTimer]);

  return (
    <div className="voice-panel-container">
      {/* 1. Voice Mode Selector */}
      <div className="voice-mode-selector">
        <span className="mode-title">Voice:</span>
        <button
          type="button"
          className={`voice-mode-pill ${voiceMode === 'funny' ? 'active' : ''}`}
          onClick={() => {
            setVoiceMode('funny');
            if (isPlaying) {
              stopPlaybackAction();
              setTimeout(() => playRecordingAction(), 50);
            }
          }}
          title="Playful high-pitched Talking Tom cartoon voice"
        >
          <Sparkles size={14} className="mode-icon" />
          <span>Funny 🐿️</span>
        </button>

        <button
          type="button"
          className={`voice-mode-pill ${voiceMode === 'original' ? 'active' : ''}`}
          onClick={() => {
            setVoiceMode('original');
            if (isPlaying) {
              stopPlaybackAction();
              setTimeout(() => playRecordingAction(), 50);
            }
          }}
          title="Play back your real unaltered voice"
        >
          <Volume2 size={14} className="mode-icon" />
          <span>Original 🎙️</span>
        </button>
      </div>

      {/* 2. Recording Status and Timer */}
      <div className="voice-status-bar">
        {isRecording ? (
          <div className="recording-indicator">
            <span className="rec-dot" />
            <span className="rec-text">Recording: {recordSeconds}s / {MAX_RECORD_SECONDS}s</span>
          </div>
        ) : isPlaying ? (
          <div className="playing-indicator">
            <span className="play-wave" />
            <span className="play-text">Ayush is speaking...</span>
          </div>
        ) : (
          <span className="status-text">{statusMessage}</span>
        )}
      </div>

      {/* 3. Main Microphone & Playback Controls */}
      <div className="voice-controls-row">
        {/* Main Record Button */}
        <button
          type="button"
          className={`main-mic-button ${isRecording ? 'recording' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label={isRecording ? 'Stop recording' : 'Record voice'}
          title={isRecording ? 'Tap or release to finish recording' : 'Hold or tap to talk'}
        >
          <div className="mic-icon-circle">
            {isRecording ? (
              <Square size={22} className="rec-stop-icon" />
            ) : (
              <Mic size={24} className="mic-icon" />
            )}
          </div>
          <span className="mic-label">
            {isRecording ? 'Stop Recording' : 'Hold or Tap to Talk'}
          </span>
        </button>

        {/* Secondary Play Again / Stop Button (shown when recording exists) */}
        {hasRecording && !isRecording && (
          <button
            type="button"
            className={`secondary-play-button ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? stopPlaybackAction : playRecordingAction}
            title={isPlaying ? 'Stop playback' : 'Play recorded voice again'}
          >
            {isPlaying ? (
              <>
                <Square size={16} />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Play Again</span>
              </>
            )}
          </button>
        )}

        {/* Sample Voice Button: Allows testing chipmunk & original pitch without a mic */}
        {!isRecording && (
          <button
            type="button"
            className="sample-voice-btn"
            onClick={handlePlaySampleVoice}
            title="Test Funny vs Original voice without a microphone"
          >
            <Sparkles size={14} />
            <span>{hasRecording ? 'Sample Voice' : 'No mic? Try Sample Voice 🎵'}</span>
          </button>
        )}
      </div>

      {/* 4. Error Message Banner */}
      {errorMessage && (
        <div className="voice-error-banner" role="alert">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 5. Privacy Notice */}
      <div className="voice-privacy-note">
        <ShieldCheck size={12} className="privacy-icon" />
        <span>100% Private • Audio processed locally in your browser</span>
      </div>
    </div>
  );
}
