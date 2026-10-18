import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';
import Header from './components/Header';
import AyushScene from './components/AyushScene';
import SpeechBubble from './components/SpeechBubble';
import InteractionMenu from './components/InteractionMenu';
import RomanticSettingsModal from './components/RomanticSettingsModal';
import SecretLetterModal from './components/SecretLetterModal';
import { soundManager } from './utils/audioEffects';
import { voiceEngine } from './utils/voiceRecorder';
import { clonedVoiceEngine } from './utils/clonedVoiceEngine';
import { 
  talkingTomController, 
  LISTENING_STATES, 
  checkMicrophonePermission 
} from './utils/talkingTomController';
import { 
  getTimeAwareGreeting, 
  formatDialogue,
  DIALOGUE_POOLS 
} from './utils/dialoguePools';
import {
  loadRomanticSettings,
  saveRomanticSettings,
  loadUnlocks,
  saveUnlocks,
  resetAllSettingsAndUnlocks,
  calculateDaysTogether,
  DEFAULT_SETTINGS
} from './utils/romanticSettings';

export default function App() {
  // Settings & Unlocks (100% local persistence)
  const [settings, setSettings] = useState(() => loadRomanticSettings());
  const [unlocks, setUnlocks] = useState(() => loadUnlocks());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSecretLetterOpen, setIsSecretLetterOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('secretHeart');

  // Animation & Character State
  const [currentAction, setCurrentAction] = useState('idle');
  const [speechText, setSpeechText] = useState(() => (
    settings.romanticMessagesEnabled 
      ? getTimeAwareGreeting(settings.gfName, settings.ayushName)
      : ''
  ));
  const isMuted = !settings.soundEnabled;
  const [isHovered, setIsHovered] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);
  const [annoyanceCount, setAnnoyanceCount] = useState(0);

  // Milestone 3 & 4: Voice repeat state (authoritative Talking Tom lifecycle)
  const [activeTab, setActiveTab] = useState('play'); // 'play' | 'chat'
  const prevTabRef = useRef(activeTab);
  const voiceMode = settings.voiceMode || 'funny';
  const [talkingVolume, setTalkingVolume] = useState(0);
  const [listeningState, setListeningState] = useState(() => talkingTomController.state);
  const [micErrorMessage, setMicErrorMessage] = useState('');

  // Authoritative active status: True whenever continuous voice engine is running
  const isListening = listeningState === LISTENING_STATES.LISTENING ||
                      listeningState === LISTENING_STATES.STARTING ||
                      listeningState === LISTENING_STATES.PROCESSING ||
                      listeningState === LISTENING_STATES.SPEAKING;

  // Sync listeningState with talkingTomController state events
  useEffect(() => {
    const handleState = (state, detail = {}) => {
      setListeningState(state);
      if (state === LISTENING_STATES.ERROR && detail.message) {
        setMicErrorMessage(detail.message);
      } else if (state === LISTENING_STATES.LISTENING || state === LISTENING_STATES.PROCESSING || state === LISTENING_STATES.SPEAKING) {
        setMicErrorMessage('');
      }
    };
    talkingTomController.addStateListener(handleState);
    return () => {
      talkingTomController.removeStateListener(handleState);
    };
  }, []);

  // Sync recognition language preference with controller
  useEffect(() => {
    talkingTomController.setLanguage(settings.recognitionLanguage || 'auto');
  }, [settings.recognitionLanguage]);

  // Hands-free auto-start on load if previously opted in and microphone permission is already granted
  useEffect(() => {
    let isMounted = true;
    async function checkAutoStart() {
      if (talkingTomController.hasOptedIn()) {
        const perm = await checkMicrophonePermission();
        if (isMounted && perm === 'granted') {
          talkingTomController.startListening();
        }
      }
    }
    checkAutoStart();
    return () => {
      isMounted = false;
    };
  }, []);

  // Secret combo buffer
  const comboBufferRef = useRef([]);
  const actionTimeoutRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const tapCounterRef = useRef(0);
  const tapResetTimerRef = useRef(null);
  const lastQuoteRef = useRef('');

  // Keep soundManager mute state synced with settings
  useEffect(() => {
    soundManager.setMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Auto-dismiss initial greeting after 4.2 seconds
  useEffect(() => {
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechText('');
    }, 4200);
  }, []);

  // Helper to get non-repetitive dialogue formatted with names
  const getNextDialogue = useCallback((category) => {
    const list = DIALOGUE_POOLS[category] || DIALOGUE_POOLS.compliments;
    const candidates = list.filter((q) => q !== lastQuoteRef.current);
    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : list[0];
    lastQuoteRef.current = chosen;
    return formatDialogue(chosen, settings.gfName, settings.ayushName);
  }, [settings.gfName, settings.ayushName]);

  // Helper to display a temporary dialogue toast that auto-dismisses
  const showSpeech = useCallback((text, durationMs = 3800) => {
    if (!settings.romanticMessagesEnabled) return;
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    setSpeechText(text);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechText('');
    }, durationMs);
  }, [settings.romanticMessagesEnabled]);

  const dismissSpeech = useCallback(() => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    setSpeechText('');
  }, []);

  // Helper to schedule clean return to idle
  const scheduleReturnToIdle = useCallback((durationMs = 3000) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setCurrentAction('idle');
    }, durationMs);
  }, []);

  // Check secret combo sequence (kiss -> hug -> blush)
  const recordComboAction = useCallback((actionId) => {
    const nextBuffer = [...comboBufferRef.current, actionId].slice(-3);
    comboBufferRef.current = nextBuffer;

    if (
      nextBuffer.length === 3 &&
      nextBuffer[0] === 'kiss' &&
      nextBuffer[1] === 'hug' &&
      nextBuffer[2] === 'blush'
    ) {
      soundManager.playFanfare();
      const updatedUnlocks = { ...unlocks, comboUnlocked: true };
      setUnlocks(updatedUnlocks);
      saveUnlocks(updatedUnlocks);
      setUnlockReason('combo');
      setIsSecretLetterOpen(true);
      comboBufferRef.current = [];
    }
  }, [unlocks]);

  // Voice playback lifecycle events
  const handlePlaybackStart = useCallback(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction('talking');
  }, []);

  const handlePlaybackEnd = useCallback(() => {
    setCurrentAction('idle');
    setTalkingVolume(0);
  }, []);

  const handleAmplitude = useCallback((vol) => {
    setTalkingVolume(vol);
  }, []);

  // Stop ALL active voice playback (both pipelines) if interrupting with another tap or action
  const interruptVoiceIfPlaying = useCallback(() => {
    let didStop = false;
    if (voiceEngine.isPlaying) {
      voiceEngine.stopPlayback();
      didStop = true;
    }
    if (clonedVoiceEngine.isPlaying || clonedVoiceEngine.isGenerating) {
      clonedVoiceEngine.stopPlayback();
      didStop = true;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
      didStop = true;
    }
    talkingTomController.setSpeaking(false, 300);
    if (didStop) setTalkingVolume(0);
  }, []);

  // Talking Tom Continuous Repeat Loop:
  // When user finishes a phrase, Ayush repeats it using the active voiceMode,
  // then resumes listening after a feedback-preventing cooldown.
  // Requirement 5: Do NOT show transcript or subtitles in SpeechBubble!
  useEffect(() => {
    talkingTomController.onPhraseFinalized = (phrase) => {
      talkingTomController.setSpeaking(true);

      const activeVoice = settings.voiceMode || voiceMode || 'funny';
      clonedVoiceEngine.speakPhraseWithMode(phrase, activeVoice, {
        onStart: () => {
          handlePlaybackStart();
        },
        onAmplitude: (vol) => {
          handleAmplitude(vol);
        },
        onEnded: () => {
          handlePlaybackEnd();
          talkingTomController.setSpeaking(false, 450);
        },
        onFallback: () => {
          // Handled within clonedVoiceEngine
        }
      });
    };

    return () => {
      talkingTomController.onPhraseFinalized = null;
    };
  }, [settings.voiceMode, voiceMode, handlePlaybackStart, handleAmplitude, handlePlaybackEnd]);

  // Pause continuous repeat during AI Chat to prevent audio competition (strictly on tab transition)
  useEffect(() => {
    if (prevTabRef.current === activeTab) return;
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;

    if (activeTab === 'chat') {
      talkingTomController.pauseListening();
    } else if (prev === 'chat' && activeTab === 'play') {
      talkingTomController.resumeListening();
    }
  }, [activeTab]);

  const handleStartListening = useCallback(() => {
    soundManager.playPop();
    setMicErrorMessage('');
    clonedVoiceEngine.unlockAudio();
    talkingTomController.startListening();
  }, []);

  const handleToggleListening = useCallback(() => {
    soundManager.playPop();
    setMicErrorMessage('');
    if (talkingTomController.isExplicitlyEnabled) {
      talkingTomController.stopListening();
    } else {
      clonedVoiceEngine.unlockAudio();
      talkingTomController.startListening();
    }
  }, []);

  // Reset character and state cleanly
  const resetToIdle = useCallback(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);

    talkingTomController.stopListening();
    voiceEngine.cleanup();
    clonedVoiceEngine.cleanup();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setTalkingVolume(0);
    tapCounterRef.current = 0;
    setAnnoyanceCount(0);
    comboBufferRef.current = [];
    setCurrentAction('idle');
    setHeartBurst(0);
    showSpeech(
      formatDialogue("All reset! What should we do now, {gfName}? 😊", settings.gfName, settings.ayushName),
      2600
    );
  }, [settings.gfName, settings.ayushName, showSpeech]);

  // Track rapid taps for mock-annoyed escalation & stopping reaction
  const handleAnnoyanceTap = useCallback(() => {
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    
    // Distinct reaction for stopping after rapid taps
    tapResetTimerRef.current = setTimeout(() => {
      if (tapCounterRef.current >= 3) {
        showSpeech(
          formatDialogue("Phew, safe now... but I secretly loved the attention, {gfName}! 🥺💕", settings.gfName, settings.ayushName),
          3200
        );
      }
      tapCounterRef.current = 0;
      setAnnoyanceCount(0);
    }, 2400);

    tapCounterRef.current += 1;
    const currentTaps = tapCounterRef.current;
    setAnnoyanceCount(currentTaps);

    if (currentTaps >= 5) {
      // Trigger Annoyed reaction
      tapCounterRef.current = 0;
      setAnnoyanceCount(0);
      interruptVoiceIfPlaying();
      soundManager.playAnnoyedPout();
      setCurrentAction('annoyed');
      const quote = getNextDialogue('mockAnnoyed');
      showSpeech(quote, 3400);
      scheduleReturnToIdle(3400);
      return true;
    }
    return false;
  }, [getNextDialogue, interruptVoiceIfPlaying, scheduleReturnToIdle, settings.gfName, settings.ayushName, showSpeech]);

  // Main Action trigger (buttons)
  const triggerAction = useCallback((actionId) => {
    interruptVoiceIfPlaying();
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction(actionId);

    // Record combo progression
    recordComboAction(actionId);

    if (actionId === 'kiss') {
      if (settings.floatingEffectsEnabled) {
        setHeartBurst((b) => b + 1);
      }
      const quote = getNextDialogue('kiss');
      showSpeech(quote, 3400);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'hug') {
      if (settings.floatingEffectsEnabled) {
        setHeartBurst((b) => b + 1);
      }
      const quote = getNextDialogue('hug');
      showSpeech(quote, 3600);
      scheduleReturnToIdle(3400);
    } else if (actionId === 'blush') {
      const quote = getNextDialogue('blush');
      showSpeech(quote, 3200);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'cuddle') {
      if (settings.floatingEffectsEnabled) {
        setHeartBurst((b) => b + 1);
      }
      const quote = getNextDialogue('cuddle');
      showSpeech(quote, 3600);
      scheduleReturnToIdle(3600);
    } else if (actionId === 'laugh') {
      handleAnnoyanceTap();
      const quote = getNextDialogue('teasing');
      showSpeech(quote, 3200);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'loveNote') {
      if (settings.floatingEffectsEnabled) {
        setHeartBurst((b) => b + 1);
      }
      const quote = getNextDialogue('loveNotes');
      showSpeech(quote, 4000);
      scheduleReturnToIdle(3600);
    } else if (actionId === 'boop') {
      showSpeech(getNextDialogue('teasing'), 2800);
      scheduleReturnToIdle(2600);
    } else if (actionId === 'dance') {
      showSpeech(
        formatDialogue("Look at these moves, {gfName}! Strictly for you! 🕺✨", settings.gfName, settings.ayushName),
        3800
      );
      scheduleReturnToIdle(4000);
    }
  }, [
    getNextDialogue,
    handleAnnoyanceTap,
    interruptVoiceIfPlaying,
    recordComboAction,
    scheduleReturnToIdle,
    settings.floatingEffectsEnabled,
    settings.gfName,
    settings.ayushName,
    showSpeech
  ]);

  // Direct 3D Character Tap handling
  const handleCharacterTap = useCallback((part) => {
    interruptVoiceIfPlaying();
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    if (part === 'longpress') {
      // Warm Hug
      soundManager.playHug();
      setCurrentAction('hug');
      recordComboAction('hug');
      if (settings.floatingEffectsEnabled) {
        setHeartBurst((b) => b + 1);
      }
      const quote = getNextDialogue('hug');
      showSpeech(quote, 3600);
      scheduleReturnToIdle(3600);
      return;
    }

    // Check for rapid annoyance escalation
    const isAnnoyed = handleAnnoyanceTap();
    if (isAnnoyed) return;

    if (part === 'head') {
      soundManager.playBoing();
      setCurrentAction('surprised');
      const quote = formatDialogue(
        "Bonk! You tapped my forehead! Brain 100% full of {gfName}! 🧠💖",
        settings.gfName,
        settings.ayushName
      );
      showSpeech(quote, 2800);
      scheduleReturnToIdle(2800);
    } else if (part === 'cheek' || part === 'cheeks') {
      soundManager.playShyChime();
      setCurrentAction('blush');
      recordComboAction('blush');
      const quote = getNextDialogue('blush');
      showSpeech(quote, 2800);
      scheduleReturnToIdle(2800);
    } else if (part === 'nose') {
      soundManager.playBoop();
      setCurrentAction('boop');
      const quote = formatDialogue("BOOP! Only {gfName} is authorized to do that! 👃✨", settings.gfName, settings.ayushName);
      showSpeech(quote, 2500);
      scheduleReturnToIdle(2500);
    } else {
      // Body / Torso
      soundManager.playPop();
      setCurrentAction('tapReaction');
      const quote = getNextDialogue('teasing');
      showSpeech(quote, 2600);
      scheduleReturnToIdle(2500);
    }
  }, [
    getNextDialogue,
    handleAnnoyanceTap,
    interruptVoiceIfPlaying,
    recordComboAction,
    scheduleReturnToIdle,
    settings.floatingEffectsEnabled,
    settings.gfName,
    settings.ayushName,
    showSpeech
  ]);

  // Bubble click cycles to next line without spamming
  const handleBubbleClick = useCallback(() => {
    soundManager.playPop();
    const categories = ['compliments', 'loveNotes', 'teasing', 'encouraging'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const next = getNextDialogue(randomCat);
    showSpeech(next, 3800);
  }, [getNextDialogue, showSpeech]);

  // Sound toggle with instant sound feedback on unmute
  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    // isMuted is derived from settings.soundEnabled — update settings only
    const updatedSettings = { ...settings, soundEnabled: !nextMuted };
    setSettings(updatedSettings);
    saveRomanticSettings(updatedSettings);
    if (!nextMuted) {
      soundManager.playPop();
    }
  }, [settings]);

  // Settings Save & Reset Handlers
  const handleSaveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    saveRomanticSettings(newSettings);
    soundManager.setMuted(!newSettings.soundEnabled);
  }, []);

  const handleResetSettings = useCallback(() => {
    resetAllSettingsAndUnlocks();
    setSettings(DEFAULT_SETTINGS);
    setUnlocks({
      secretHeartUnlocked: false,
      comboUnlocked: false,
      heartTapCount: 0,
      totalKisses: 0,
      totalHugs: 0
    });
    soundManager.setMuted(!DEFAULT_SETTINGS.soundEnabled);
  }, []);

  // Secret Heart 5-tap Unlock Handler
  const handleUnlockSecretHeart = useCallback(() => {
    soundManager.playFanfare();
    const updatedUnlocks = { ...unlocks, secretHeartUnlocked: true };
    setUnlocks(updatedUnlocks);
    saveUnlocks(updatedUnlocks);
    setUnlockReason('secretHeart');
    setIsSecretLetterOpen(true);
  }, [unlocks]);

  // Handle Ayush AI / Fallback Chat Response Animation & Speech Excerpt
  const handleAyushChatReply = useCallback((replyText, reaction) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    
    // Animate the character with the inferred reaction or animated talking
    const validReaction = reaction || 'talking';
    setCurrentAction(validReaction);

    // If affectionate reaction, burst hearts
    if (settings.floatingEffectsEnabled && (validReaction === 'kiss' || validReaction === 'hug' || validReaction === 'cuddle')) {
      setHeartBurst((b) => b + 1);
    }

    // Display a short excerpt in the 3D speech bubble above Ayush's head
    const excerpt = replyText.length > 70 ? replyText.slice(0, 68) + '...' : replyText;
    showSpeech(excerpt, 3600);
    scheduleReturnToIdle(3600);
  }, [scheduleReturnToIdle, settings.floatingEffectsEnabled, showSpeech]);

  // Clean up all active timers and audio on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
      talkingTomController.destroy();
      voiceEngine.cleanup();
      clonedVoiceEngine.cleanup();
    };
  }, []);

  const daysTogether = calculateDaysTogether(settings.anniversaryDate);

  return (
    <div className="game-app-wrapper">
      <main className="game-container">
        <Header 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenChat={() => setActiveTab('chat')}
          onUnlockSecretHeart={handleUnlockSecretHeart}
          daysTogether={daysTogether}
          gfName={settings.gfName}
          ayushName={settings.ayushName}
          isListening={isListening}
          onToggleListening={handleToggleListening}
        />

        <div className="game-play-area">
          {/* Compact, unobtrusive, touch-transparent speech bubble */}
          <SpeechBubble 
            text={speechText} 
            onDismiss={dismissSpeech}
            onClickBubble={handleBubbleClick} 
          />

          {/* 3D Scene prominently focused on Ayush (65-75% viewport) */}
          <AyushScene
            customModelUrl={settings.customModelUrl}
            currentAction={currentAction}
            onTapPart={handleCharacterTap}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
            heartBurst={heartBurst}
            talkingVolume={talkingVolume}
            floatingEffectsEnabled={settings.floatingEffectsEnabled}
          />

          {/* Single clear start/permission prompt when hands-free listening is not active */}
          {!isListening && activeTab !== 'chat' && (
            <div className="tom-start-prompt-wrap">
              <button
                type="button"
                className="tom-start-prompt-btn"
                onClick={handleStartListening}
                aria-label="Tap to talk to Ayush"
              >
                <Mic size={16} className="prompt-mic-icon" />
                <span>Tap to Talk to Ayush 🎙️</span>
              </button>
              {micErrorMessage && (
                <p className="tom-mic-error-pill">{micErrorMessage}</p>
              )}
            </div>
          )}
        </div>

        <InteractionMenu
          onTriggerAction={triggerAction}
          onReset={resetToIdle}
          currentAction={currentAction}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          annoyanceCount={annoyanceCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          gfName={settings.gfName}
          ayushName={settings.ayushName}
          onAyushReply={handleAyushChatReply}
        />
      </main>

      {/* Romantic Settings Modal */}
      <RomanticSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetSettings={handleResetSettings}
      />

      {/* Secret Romantic Letter Modal */}
      <SecretLetterModal
        isOpen={isSecretLetterOpen}
        onClose={() => setIsSecretLetterOpen(false)}
        gfName={settings.gfName}
        ayushName={settings.ayushName}
        anniversaryDate={settings.anniversaryDate}
        unlockReason={unlockReason}
        onResetUnlocks={handleResetSettings}
      />
    </div>
  );
}
