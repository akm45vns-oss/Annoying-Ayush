import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Sparkles, 
  Volume2, 
  ShieldCheck, 
  AlertCircle,
  RotateCcw,
  Send,
  Edit3,
  CheckCircle2
} from 'lucide-react';
import { voiceEngine } from '../utils/voiceRecorder';
import { clonedVoiceEngine } from '../utils/clonedVoiceEngine';
import { speechTranscriber } from '../utils/speechTranscriber';

/**
 * Enhanced Voice Panel with Cloned Voice Speech Pipeline & Talking Tom Repeat
 * 
 * Sub-modes:
 * 1. "cloned": Speech recognition -> Transcribe -> Cloned TTS in Ayush's voice -> Lip-sync
 * 2. "repeat": Milestone 3 instant microphone repeat with cartoon pitch-shift
 */
export default function VoicePanel({
  voiceMode,
  setVoiceMode,
  onPlaybackStart = () => {},
  onPlaybackEnd = () => {},
  onAmplitude = () => {}
}) {
  const [pipelineMode, setPipelineMode] = useState('cloned'); // 'cloned' | 'repeat'
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isClonedPlaying, setIsClonedPlaying] = useState(false);
  const [clonedVoiceStatus, setClonedVoiceStatus] = useState('ready'); // 'ready' | 'generating' | 'playing' | 'fallback'

  // Milestone 3 repeat state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Tap Mic to speak to Ayush!');
  const [errorMessage, setErrorMessage] = useState('');

  const timerIntervalRef = useRef(null);
  const isHoldingRef = useRef(false);
  const holdStartTimeRef = useRef(0);
  const maxDurationTimeoutRef = useRef(null);
  const stopRecordingActionRef = useRef(null);

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

  useEffect(() => {
    return () => {
      clonedVoiceEngine.stopPlayback();
      speechTranscriber.stop();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Pipeline 1: Voice Recognition & Cloned Voice Generation
  // ---------------------------------------------------------------------------
  const handleStartListening = () => {
    if (isTranscribing || isGeneratingVoice || isClonedPlaying) return;
    setErrorMessage('');
    setIsTranscribing(true);
    setStatusMessage('🔴 Listening to you... speak clearly!');

    if (!speechTranscriber.isSupported()) {
      setIsTranscribing(false);
      setErrorMessage('Browser speech recognition not available. You can type your message in the box below!');
      return;
    }

    try {
      speechTranscriber.start(
        (text) => {
          setTranscribedText(text);
          setStatusMessage('Recognizing your words... ✨');
        },
        (error) => {
          setIsTranscribing(false);
          if (error === 'not-allowed') {
            setErrorMessage('Microphone access blocked. Tap the 🔒 lock icon in Chrome to allow microphone.');
          } else {
            setErrorMessage('Listening ended or no speech detected. Try again or type below!');
          }
        },
        () => {
          setIsTranscribing(false);
          setStatusMessage('Transcription ready! Review and generate Ayush’s voice.');
        }
      );
    } catch (err) {
      setIsTranscribing(false);
      setErrorMessage(err.message || 'Could not start microphone.');
    }
  };

  const handleStopListening = () => {
    speechTranscriber.stop();
    setIsTranscribing(false);
  };

  const handleGenerateAndSpeak = async (overrideText) => {
    const textToSpeak = (overrideText || transcribedText || '').trim();
    if (!textToSpeak) {
      setErrorMessage('Please speak or type a phrase first!');
      return;
    }

    setErrorMessage('');
    setIsGeneratingVoice(true);
    setClonedVoiceStatus('generating');
    setStatusMessage('Generating Ayush’s voice... ✨');

    try {
      const res = await clonedVoiceEngine.generateSpeech(textToSpeak);
      setIsGeneratingVoice(false);

      // If user pressed stop or reset while generating, discard late response safely
      if (res.cancelled) {
        setStatusMessage('Voice generation stopped.');
        return;
      }

      if (!res.ok && res.error) {
        setErrorMessage(res.error);
        setStatusMessage('Generation failed. Using device voice.');
      } else if (res.fallbackReason === 'unconfigured') {
        setClonedVoiceStatus('fallback');
      } else {
        setClonedVoiceStatus('live');
      }

      // Play audio and synchronize character mouth & gestures
      setIsClonedPlaying(true);
      onPlaybackStart();
      setStatusMessage(`Speaking in ${voiceMode === 'funny' ? 'Funny Ayush 🐿️' : 'Ayush’s Voice 🎙️'}...`);

      clonedVoiceEngine.playSpeech(
        voiceMode === 'funny' ? 'funny' : 'ayush',
        (vol) => {
          onAmplitude(vol);
        },
        () => {
          setIsClonedPlaying(false);
          onPlaybackEnd();
          onAmplitude(0);
          setStatusMessage('Ayush finished speaking!');
        }
      );
    } catch (err) {
      setIsGeneratingVoice(false);
      setIsClonedPlaying(false);
      onPlaybackEnd();
      setErrorMessage(err.message || 'Could not play voice.');
    }
  };

  const handleStopClonedPlayback = () => {
    clonedVoiceEngine.stopPlayback();
    setIsGeneratingVoice(false);
    setIsClonedPlaying(false);
    onPlaybackEnd();
    onAmplitude(0);
    setStatusMessage('Playback stopped.');
  };

  // ---------------------------------------------------------------------------
  // Pipeline 2: Instant Microphone Repeat (Milestone 3)
  // ---------------------------------------------------------------------------
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

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (isPlaying) {
      stopPlaybackAction();
      return;
    }
    if (isRecording) {
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
    if (duration > 400 && isRecording) {
      stopRecordingAction();
    }
  };

  const handlePointerCancel = () => {
    if (isHoldingRef.current && isRecording) {
      isHoldingRef.current = false;
      stopRecordingAction();
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
      voiceEngine.cleanup();
      clonedVoiceEngine.cleanup();
      speechTranscriber.stop();
    };
  }, [stopTimer]);

  return (
    <div className="voice-panel-container">
      {/* 1. Pipeline Selector Tabs */}
      <div className="voice-pipeline-tabs">
        <button
          type="button"
          className={`pipeline-tab-btn ${pipelineMode === 'cloned' ? 'active' : ''}`}
          onClick={() => {
            setPipelineMode('cloned');
            setErrorMessage('');
          }}
        >
          <Sparkles size={13} />
          <span>Ayush Cloned Voice 🗣️</span>
        </button>

        <button
          type="button"
          className={`pipeline-tab-btn ${pipelineMode === 'repeat' ? 'active' : ''}`}
          onClick={() => {
            setPipelineMode('repeat');
            setErrorMessage('');
          }}
        >
          <Volume2 size={13} />
          <span>Instant Repeat 🐿️</span>
        </button>
      </div>

      {/* 2. Voice Mode Selector: Ayush Voice vs Funny Ayush */}
      <div className="voice-mode-selector">
        <span className="mode-title">Style:</span>
        <button
          type="button"
          className={`voice-mode-pill ${voiceMode === 'original' || voiceMode === 'ayush' ? 'active' : ''}`}
          onClick={() => setVoiceMode('original')}
          title="Ayush’s natural voice"
        >
          <Volume2 size={14} className="mode-icon" />
          <span>Ayush Voice 🎙️</span>
        </button>

        <button
          type="button"
          className={`voice-mode-pill ${voiceMode === 'funny' ? 'active' : ''}`}
          onClick={() => setVoiceMode('funny')}
          title="Playful cartoon chipmunk pitch-shifted voice"
        >
          <Sparkles size={14} className="mode-icon" />
          <span>Funny Ayush 🐿️</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODE 1: CLONED VOICE SPEECH PIPELINE                              */}
      {/* ----------------------------------------------------------------- */}
      {pipelineMode === 'cloned' && (
        <div className="cloned-voice-workflow">
          {/* Status & Live Badge */}
          <div className="voice-status-bar">
            {isTranscribing ? (
              <div className="recording-indicator">
                <span className="rec-dot" />
                <span className="rec-text">Listening to your speech...</span>
              </div>
            ) : isGeneratingVoice ? (
              <div className="playing-indicator">
                <span className="play-wave" />
                <span className="play-text">Synthesizing Ayush’s voice...</span>
              </div>
            ) : isClonedPlaying ? (
              <div className="playing-indicator">
                <span className="play-wave" />
                <span className="play-text">Ayush is speaking!</span>
              </div>
            ) : (
              <span className="status-text">{statusMessage}</span>
            )}
          </div>

          {/* Step 1: Capture Speech / Review Transcription */}
          <div className="transcription-box">
            <div className="transcription-header">
              <span className="transcription-label">
                <Edit3 size={12} />
                <span>What to say in Ayush’s voice:</span>
              </span>
              {clonedVoiceStatus === 'live' ? (
                <span className="status-pill live-clone-pill">
                  <CheckCircle2 size={11} />
                  <span>Authorized Voice Clone</span>
                </span>
              ) : (
                <span className="status-pill fallback-pill">
                  <span>Device Voice Mode</span>
                </span>
              )}
            </div>

            <textarea
              className="transcription-input"
              rows={2}
              placeholder="Tap the mic below to speak, or type any romantic message here..."
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
            />

            {/* Quick Suggestions / Sample Prompts */}
            {!transcribedText && (
              <div className="prompt-chips-row">
                <button
                  type="button"
                  className="prompt-chip"
                  onClick={() => setTranscribedText("I love you more than all the stars, Babe! ❤️")}
                >
                  "I love you!" ❤️
                </button>
                <button
                  type="button"
                  className="prompt-chip"
                  onClick={() => setTranscribedText("Who is the most beautiful girl in the world? You! 🥰")}
                >
                  "Most beautiful girl" 🥰
                </button>
                <button
                  type="button"
                  className="prompt-chip"
                  onClick={() => setTranscribedText("Stop being so cute or I'm never letting you go! 🥺")}
                >
                  "Stop being so cute" 🥺
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="voice-controls-row">
            {/* Record / Listen Mic button */}
            <button
              type="button"
              className={`main-mic-button ${isTranscribing ? 'recording' : ''}`}
              onClick={isTranscribing ? handleStopListening : handleStartListening}
              title={isTranscribing ? 'Stop listening' : 'Speak into microphone'}
            >
              <div className="mic-icon-circle">
                {isTranscribing ? <Square size={20} /> : <Mic size={22} />}
              </div>
              <span className="mic-label">
                {isTranscribing ? 'Done Listening' : 'Speak Message'}
              </span>
            </button>

            {/* Generate & Speak in Ayush's Voice */}
            {isClonedPlaying ? (
              <button
                type="button"
                className="secondary-play-button playing"
                onClick={handleStopClonedPlayback}
                title="Stop voice playback"
              >
                <Square size={16} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="secondary-play-button generate-btn"
                disabled={!transcribedText.trim() || isGeneratingVoice}
                onClick={() => handleGenerateAndSpeak()}
                title="Speak text in Ayush's voice"
              >
                <Send size={15} />
                <span>{isGeneratingVoice ? 'Generating...' : 'Say It! 💖'}</span>
              </button>
            )}

            {/* Reset / Clear button */}
            {transcribedText && !isClonedPlaying && (
              <button
                type="button"
                className="sample-voice-btn reset-text-btn"
                onClick={() => {
                  setTranscribedText('');
                  setStatusMessage('Ready for your next message.');
                }}
                title="Clear text"
              >
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODE 2: INSTANT TALKING TOM REPEAT (MILESTONE 3)                 */}
      {/* ----------------------------------------------------------------- */}
      {pipelineMode === 'repeat' && (
        <div className="repeat-workflow">
          <div className="voice-status-bar">
            {isRecording ? (
              <div className="recording-indicator">
                <span className="rec-dot" />
                <span className="rec-text">Recording: {recordSeconds}s / {MAX_RECORD_SECONDS}s</span>
              </div>
            ) : isPlaying ? (
              <div className="playing-indicator">
                <span className="play-wave" />
                <span className="play-text">Ayush is repeating your words...</span>
              </div>
            ) : (
              <span className="status-text">{statusMessage}</span>
            )}
          </div>

          <div className="voice-controls-row">
            <button
              type="button"
              className={`main-mic-button ${isRecording ? 'recording' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              aria-label={isRecording ? 'Stop recording' : 'Record voice'}
            >
              <div className="mic-icon-circle">
                {isRecording ? <Square size={22} /> : <Mic size={24} />}
              </div>
              <span className="mic-label">
                {isRecording ? 'Stop Recording' : 'Hold or Tap to Talk'}
              </span>
            </button>

            {hasRecording && !isRecording && (
              <button
                type="button"
                className={`secondary-play-button ${isPlaying ? 'playing' : ''}`}
                onClick={isPlaying ? stopPlaybackAction : playRecordingAction}
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
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="voice-error-banner" role="alert">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="voice-privacy-note">
        <ShieldCheck size={12} className="privacy-icon" />
        <span>100% Private • Authorized voice model with secure server-side tokens</span>
      </div>
    </div>
  );
}
