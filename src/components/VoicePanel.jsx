import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mic, 
  Square, 
  Sparkles, 
  Volume2, 
  ShieldCheck, 
  AlertCircle, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Radio
} from 'lucide-react';
import { talkingTomController, LISTENING_STATES } from '../utils/talkingTomController';
import { clonedVoiceEngine } from '../utils/clonedVoiceEngine';
import { voiceEngine } from '../utils/voiceRecorder';

/**
 * Talking Tom-Style Voice Panel with Continuous Listening
 * 
 * Features:
 * - One-touch Continuous Listening toggle: user enables once, speaks naturally, Ayush repeats!
 * - Automatic feedback prevention (recognition suspended while Ayush speaks)
 * - 3 functional voice modes:
 *     1. "funny" (Funny Ayush 🐿️ - signature cartoon pitch-shift)
 *     2. "device" (Device Voice 🗣️ - native speech synthesis)
 *     3. "cloned" (Ayush Cloned Voice 🎙️ - server-side ElevenLabs with honest fallback)
 * - Secondary collapsible panel for typing custom phrases and testing without a mic.
 */
export default function VoicePanel({
  voiceMode = 'funny',
  setVoiceMode = () => {},
  onPlaybackStart = () => {},
  onPlaybackEnd = () => {},
  onAmplitude = () => {},
  _isMuted = false
}) {
  const [listeningState, setListeningState] = useState(talkingTomController.state);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('Enable listening to talk with Ayush hands-free!');
  const [manualText, setManualText] = useState('');
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const [serverTtsStatus, setServerTtsStatus] = useState('checking'); // 'live' | 'unconfigured' | 'checking'

  // Check server TTS support on mount
  useEffect(() => {

    // Probe server-side TTS readiness probe
    let isMounted = true;
    fetch('/api/tts', { method: 'GET', signal: AbortSignal.timeout(4000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.configured) {
          setServerTtsStatus('live');
        } else {
          setServerTtsStatus('unconfigured');
        }
      })
      .catch(() => {
        if (isMounted) setServerTtsStatus('unconfigured');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync with talkingTomController state changes
  useEffect(() => {
    const handleStateChange = (newState, detail = {}) => {
      setListeningState(newState);

      if (newState === LISTENING_STATES.IDLE) {
        setStatusMessage('Tap Start Listening to talk with Ayush hands-free!');
      } else if (newState === LISTENING_STATES.LISTENING) {
        setErrorMessage('');
        setStatusMessage("Ayush is listening... Say anything cute! 🎙️");
      } else if (newState === LISTENING_STATES.PROCESSING) {
        setStatusMessage(detail.phrase ? `Heard: "${detail.phrase}" ✨` : 'Processing your speech...');
      } else if (newState === LISTENING_STATES.SPEAKING) {
        const modeLabel = voiceMode === 'funny' ? 'Funny Voice 🐿️' : voiceMode === 'cloned' ? 'Cloned Voice 🎙️' : 'Device Voice 🗣️';
        setStatusMessage(`Ayush is repeating in ${modeLabel}!`);
      } else if (newState === LISTENING_STATES.PAUSED) {
        setStatusMessage('Listening paused (switched tab or screen hidden).');
      } else if (newState === LISTENING_STATES.ERROR) {
        setErrorMessage(detail.message || 'Microphone error.');
        setStatusMessage('Listening stopped.');
      }
    };

    const handleError = (err) => {
      if (err === 'not-allowed') {
        setErrorMessage('Microphone access blocked. On Android Chrome: tap the 🔒 lock icon in the address bar > Permissions > Microphone > Allow.');
      } else if (err === 'unsupported') {
        setErrorMessage('Speech recognition is not supported in this browser. You can type below or use Chrome/Edge!');
      }
    };

    talkingTomController.addStateListener(handleStateChange);
    talkingTomController.onError = handleError;

    return () => {
      talkingTomController.removeStateListener(handleStateChange);
      if (talkingTomController.onError === handleError) {
        talkingTomController.onError = null;
      }
    };
  }, [voiceMode]);

  // Master Listening Toggle
  const handleToggleListening = useCallback(() => {
    setErrorMessage('');
    if (talkingTomController.isExplicitlyEnabled) {
      talkingTomController.stopListening();
    } else {
      const started = talkingTomController.startListening();
      if (!started && !talkingTomController.isSupported()) {
        setErrorMessage('Continuous speech recognition requires Chrome, Edge, or Safari with microphone permissions enabled.');
      }
    }
  }, []);

  // Stop active speech playback if user wants to interrupt Ayush
  const handleStopSpeaking = useCallback(() => {
    clonedVoiceEngine.stopPlayback();
    talkingTomController.setSpeaking(false, 300);
    onPlaybackEnd();
    onAmplitude(0);
    setStatusMessage('Playback stopped. Ready for next phrase.');
  }, [onPlaybackEnd, onAmplitude]);

  // Manual Phrase Playback (For typing or sample testing)
  const handleSpeakManualText = useCallback(async (phraseToSpeak) => {
    const text = (phraseToSpeak || manualText).trim();
    if (!text) {
      setErrorMessage('Please type a phrase or choose a prompt first!');
      return;
    }

    setErrorMessage('');

    // If continuous listening is active, inform controller that Ayush is speaking
    talkingTomController.setSpeaking(true);

    await clonedVoiceEngine.speakPhraseWithMode(text, voiceMode, {
      onStart: () => {
        onPlaybackStart();
        const modeLabel = voiceMode === 'funny' ? 'Funny Voice 🐿️' : voiceMode === 'cloned' ? 'Cloned Voice 🎙️' : 'Device Voice 🗣️';
        setStatusMessage(`Speaking: "${text}" in ${modeLabel}...`);
      },
      onAmplitude: (vol) => {
        onAmplitude(vol);
      },
      onEnded: () => {
        onPlaybackEnd();
        onAmplitude(0);
        talkingTomController.setSpeaking(false, 450);
        setStatusMessage('Ayush finished speaking!');
      },
      onFallback: (reason) => {
        if (reason === 'unconfigured') {
          setStatusMessage('Server voice key unconfigured — speaking via device voice.');
        }
      }
    });
  }, [manualText, voiceMode, onPlaybackStart, onPlaybackEnd, onAmplitude]);

  // Sample Audio Melody (Mic-Free Testing)
  const handlePlaySampleMelody = useCallback(() => {
    try {
      voiceEngine.loadSampleAudio();
      setErrorMessage('');
      talkingTomController.setSpeaking(true);
      onPlaybackStart();
      setStatusMessage(`Playing sample melody in ${voiceMode === 'funny' ? 'Funny Chipmunk 🐿️' : 'Original 🎙️'} voice...`);

      voiceEngine.playRecording(
        voiceMode === 'funny' ? 'funny' : 'original',
        (vol) => onAmplitude(vol),
        () => {
          onPlaybackEnd();
          onAmplitude(0);
          talkingTomController.setSpeaking(false, 300);
          setStatusMessage('Sample finished playing!');
        }
      );
    } catch (err) {
      onPlaybackEnd();
      talkingTomController.setSpeaking(false, 200);
      setErrorMessage(err?.message || 'Could not play sample.');
    }
  }, [voiceMode, onPlaybackStart, onPlaybackEnd, onAmplitude]);

  const isListening = listeningState === LISTENING_STATES.LISTENING;
  const isSpeaking = listeningState === LISTENING_STATES.SPEAKING || clonedVoiceEngine.isPlaying;
  const isProcessing = listeningState === LISTENING_STATES.PROCESSING;

  return (
    <div className="voice-panel-container talking-tom-container">
      {/* 1. Real-time Status Badge */}
      <div className="voice-status-bar" role="status" aria-live="polite">
        {isListening ? (
          <div className="status-indicator listening-pulse">
            <span className="live-ping-dot" />
            <span className="status-label">Listening for your speech...</span>
          </div>
        ) : isSpeaking ? (
          <div className="status-indicator speaking-active">
            <Radio size={14} className="radio-pulse" />
            <span className="status-label">{statusMessage}</span>
          </div>
        ) : isProcessing ? (
          <div className="status-indicator processing-active">
            <Sparkles size={14} className="sparkle-spin" />
            <span className="status-label">{statusMessage}</span>
          </div>
        ) : (
          <span className="status-text">{statusMessage}</span>
        )}
      </div>

      {/* 2. One Master Continuous Listening Toggle */}
      <div className="talking-tom-master-control">
        {isSpeaking ? (
          <button
            type="button"
            className="master-listen-button speaking-state"
            onClick={handleStopSpeaking}
            title="Ayush is speaking. Tap to interrupt."
            aria-label="Stop Ayush from speaking"
          >
            <div className="listen-icon-bubble wave-anim">
              <Square size={20} />
            </div>
            <div className="listen-btn-text">
              <span className="listen-main-text">Ayush is Speaking...</span>
              <span className="listen-sub-text">Tap to Stop Playback</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className={`master-listen-button ${isListening ? 'listening-active' : 'idle-ready'}`}
            onClick={handleToggleListening}
            title={isListening ? 'Stop continuous listening' : 'Start hands-free Talking Tom repeat'}
            aria-pressed={isListening}
          >
            <div className={`listen-icon-bubble ${isListening ? 'pulse-ring' : ''}`}>
              {isListening ? <Square size={20} /> : <Mic size={24} />}
            </div>
            <div className="listen-btn-text">
              <span className="listen-main-text">
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </span>
              <span className="listen-sub-text">
                {isListening ? 'Hands-free repeat is active • Tap to stop' : 'Enable hands-free Talking Tom repeat'}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 3. Compact 3-Mode Voice Selector */}
      <div className="talking-tom-voice-modes" role="radiogroup" aria-label="Ayush Voice Style">
        <span className="voice-mode-caption">Voice:</span>

        <button
          type="button"
          role="radio"
          aria-checked={voiceMode === 'funny'}
          className={`mode-select-pill ${voiceMode === 'funny' ? 'active' : ''}`}
          onClick={() => setVoiceMode('funny')}
          title="Funny Talking Tom cartoon chipmunk pitch"
        >
          <Sparkles size={14} />
          <span>Funny Ayush 🐿️</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={voiceMode === 'device'}
          className={`mode-select-pill ${voiceMode === 'device' ? 'active' : ''}`}
          onClick={() => setVoiceMode('device')}
          title="Natural browser device speech"
        >
          <Volume2 size={14} />
          <span>Device Voice 🗣️</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={voiceMode === 'cloned' || voiceMode === 'original'}
          className={`mode-select-pill ${voiceMode === 'cloned' || voiceMode === 'original' ? 'active' : ''}`}
          onClick={() => setVoiceMode('cloned')}
          title={serverTtsStatus === 'live' ? 'Authorized server voice clone' : 'Server voice (falls back to device if unconfigured)'}
        >
          <Radio size={13} />
          <span>Cloned Voice 🎙️</span>
          {serverTtsStatus === 'live' && (
            <span className="clone-tag-live">Live</span>
          )}
        </button>
      </div>

      {/* 4. Error Message Alert */}
      {errorMessage && (
        <div className="voice-error-banner" role="alert">
          <AlertCircle size={15} className="error-icon" />
          <span className="error-text">{errorMessage}</span>
        </div>
      )}

      {/* 5. Secondary / Collapsible Manual Input & Sample Voice Section */}
      <div className="manual-voice-accordion">
        <button
          type="button"
          className="accordion-header-btn"
          onClick={() => setIsManualExpanded((prev) => !prev)}
          aria-expanded={isManualExpanded}
        >
          <div className="accordion-label">
            <Info size={13} />
            <span>Type to Speak / Test Without Mic</span>
          </div>
          {isManualExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isManualExpanded && (
          <div className="accordion-content">
            {/* Quick preset chips */}
            <div className="prompt-chips-row">
              <button
                type="button"
                className="prompt-chip"
                onClick={() => handleSpeakManualText("I love you more than all the stars, Babe! ❤️")}
              >
                "I love you!" ❤️
              </button>
              <button
                type="button"
                className="prompt-chip"
                onClick={() => handleSpeakManualText("Who is the most beautiful girl in the world? You! 🥰")}
              >
                "Most beautiful girl" 🥰
              </button>
              <button
                type="button"
                className="prompt-chip"
                onClick={() => handleSpeakManualText("Stop being so cute or I'm never letting you go! 🥺")}
              >
                "Stop being cute" 🥺
              </button>
            </div>

            {/* Manual text input */}
            <div className="manual-input-row">
              <input
                type="text"
                className="manual-phrase-input"
                placeholder="Type any message for Ayush to speak..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSpeakManualText();
                  }
                }}
              />
              <button
                type="button"
                className="manual-speak-btn"
                disabled={!manualText.trim()}
                onClick={() => handleSpeakManualText()}
                title="Speak typed text"
              >
                <Send size={14} />
                <span>Say It!</span>
              </button>
            </div>

            {/* Test Sample Melody button */}
            <div className="sample-voice-row">
              <button
                type="button"
                className="sample-voice-btn"
                onClick={handlePlaySampleMelody}
                title="Play a synthetic melody through Web Audio"
              >
                <Sparkles size={13} />
                <span>Test Sample Voice 🎵 (No Mic Needed)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Privacy & Capability Assurance */}
      <div className="voice-privacy-note">
        <ShieldCheck size={12} className="privacy-icon" />
        <span>Hands-free repeat • Audio is processed locally in-browser for privacy</span>
      </div>
    </div>
  );
}
