import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import AyushScene from './components/AyushScene';
import SpeechBubble from './components/SpeechBubble';
import InteractionMenu from './components/InteractionMenu';
import { soundManager } from './utils/audioEffects';
import { voiceEngine } from './utils/voiceRecorder';

// Curated Dialogue Pools
const GREETING_DIALOGUES = [
  "Hey beautiful! Ready to play? 🥰",
  "Look who's here! Tap me anywhere 😜",
  "I was just thinking about you! 💕",
];

const HEAD_TAP_DIALOGUES = [
  "Hey! Watch the hair, I spent 15 minutes styling it! 💇‍♂️😂",
  "Bonk! You tapped my forehead! Brain full of you! 🧠💖",
  "Head pats? Okay fine... you're allowed because you're cute 🥰",
  "Oof! Surprise attack on my head! 🙈",
];

const CHEEK_TAP_DIALOGUES = [
  "Hey! My cheeks are not mochi! ...Okay maybe they are! 🥟🥰",
  "Squish! You really like poking my cheeks, don't you? 😜",
  "Cheek pinch attack! Now I'm blushing pink! 😳",
  "Hehe that tickles right there! 🌸",
];

const NOSE_BOOP_DIALOGUES = [
  "BOOP! Nose access granted! 👃✨",
  "Hey! Did you just boop my snoot?! 😆",
  "Boop detected! System rebooting with 100% love! 💖",
  "Beep boop! Only you are allowed to do that! 🥰",
];

const BODY_TAP_DIALOGUES = [
  "Eeep! That tickles! Stopppp it! 😆✨",
  "Poke me again and I will send you 50 voice notes! 🎙️",
  "Tickle tickle! Can't keep your hands off me, huh? 🙈",
  "Bouncing right back into your heart! ❤️",
];

const ANNOYED_DIALOGUES = [
  "Ayush.exe has stopped being serious! 😤😂",
  "Okay, okay, I surrender! Stoppp poking! 🏳️😆",
  "You did that on purpose, didn't you? 😜",
  "Fine, one more hug. But that's it! 🙈❤️",
  "Why must you tease me so much?! (Secretly love it) 🥺",
];

const KISS_DIALOGUES = [
  "MWAHHH! 💋 Sending that kiss directly to your cheek!",
  "Catch! That's 10,000 kisses compressed into one! 😘✨",
  "One kiss isn't enough, but it's a good start! 💖",
  "Flying kiss delivered safely! Check your heart! 💌",
];

const DANCE_DIALOGUES = [
  "Look at these moves! Strictly choreographed for you! 🕺✨",
  "Music in my heart, you in my thoughts! Let's groove! 🎶",
  "Rate my dancing from 10 to 10! 😜",
  "Dancing like nobody's watching except my favorite girl! 💃🕺",
];

const LAUGH_DIALOGUES = [
  "Hahaha! Stop it, you're making me giggle like crazy! 🤣✨",
  "Hehehe! That tickles so much! I can't breathe! 😆",
  "You always know how to make me laugh! 🥰",
  "My stomach hurts from laughing with you! 💖",
];

const LOVE_NOTE_DIALOGUES = [
  "This little character was made just for you. ❤️",
  "Out of everyone in the world, I chose you to annoy forever! 🌍✨",
  "Every second making you smile is my favorite second. 🌸",
  "Reminder: You are my dream girl and my favorite notification! 📱💌",
  "You're cute, you're sweet, and you're stuck with me! 🥰",
];

const HUG_DIALOGUES = [
  "Aww, are you holding me? Don't let go! 🧸❤️",
  "Big warm virtual hug locked in! Squeeeeze! 🥰✨",
  "I wish I could wrap you in this hug in real life right now! 💖",
  "Warm cuddles mode activated! You're so cozy! 🌸",
];

export default function App() {
  const [currentAction, setCurrentAction] = useState('idle');
  const [speechText, setSpeechText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);
  const [annoyanceCount, setAnnoyanceCount] = useState(0);

  // Milestone 3: Voice repeat state
  const [activeTab, setActiveTab] = useState('play'); // 'play' | 'voice'
  const [voiceMode, setVoiceMode] = useState('funny'); // 'funny' | 'original'
  const [talkingVolume, setTalkingVolume] = useState(0);

  const actionTimeoutRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const tapCounterRef = useRef(0);
  const tapResetTimerRef = useRef(null);

  // Helper to display a temporary dialogue toast that auto-dismisses
  const showSpeech = useCallback((text, durationMs = 3800) => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    setSpeechText(text);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechText('');
    }, durationMs);
  }, []);

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

  // Stop active voice playback if interrupting with another tap or action
  const interruptVoiceIfPlaying = useCallback(() => {
    if (voiceEngine.isPlaying) {
      voiceEngine.stopPlayback();
      setTalkingVolume(0);
    }
  }, []);

  // Reset character and state cleanly
  const resetToIdle = useCallback(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);

    voiceEngine.cleanup();
    setTalkingVolume(0);
    tapCounterRef.current = 0;
    setAnnoyanceCount(0);
    setCurrentAction('idle');
    setHeartBurst(0);
    showSpeech("All reset! What's next? 😊", 2400);
  }, [showSpeech]);

  // Track rapid taps for annoyance escalation
  const handleAnnoyanceTap = useCallback(() => {
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    tapResetTimerRef.current = setTimeout(() => {
      tapCounterRef.current = 0;
      setAnnoyanceCount(0);
    }, 2200);

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
      const quote = ANNOYED_DIALOGUES[Math.floor(Math.random() * ANNOYED_DIALOGUES.length)];
      showSpeech(quote, 3400);
      scheduleReturnToIdle(3400);
      return true;
    }
    return false;
  }, [interruptVoiceIfPlaying, scheduleReturnToIdle, showSpeech]);

  // Main Action trigger (buttons)
  const triggerAction = useCallback((actionId) => {
    interruptVoiceIfPlaying();
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction(actionId);

    if (actionId === 'boop') {
      const quote = NOSE_BOOP_DIALOGUES[Math.floor(Math.random() * NOSE_BOOP_DIALOGUES.length)];
      showSpeech(quote, 2800);
      scheduleReturnToIdle(2600);
    } else if (actionId === 'kiss') {
      setHeartBurst(b => b + 1);
      const quote = KISS_DIALOGUES[Math.floor(Math.random() * KISS_DIALOGUES.length)];
      showSpeech(quote, 3400);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'dance') {
      const quote = DANCE_DIALOGUES[Math.floor(Math.random() * DANCE_DIALOGUES.length)];
      showSpeech(quote, 3800);
      scheduleReturnToIdle(4000);
    } else if (actionId === 'laugh') {
      const quote = LAUGH_DIALOGUES[Math.floor(Math.random() * LAUGH_DIALOGUES.length)];
      showSpeech(quote, 3200);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'loveNote') {
      setHeartBurst(b => b + 1);
      const quote = LOVE_NOTE_DIALOGUES[Math.floor(Math.random() * LOVE_NOTE_DIALOGUES.length)];
      showSpeech(quote, 3600);
      scheduleReturnToIdle(3600);
    }
  }, [interruptVoiceIfPlaying, scheduleReturnToIdle, showSpeech]);

  // Direct 3D Character Tap handling
  const handleCharacterTap = useCallback((part) => {
    interruptVoiceIfPlaying();
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    if (part === 'longpress') {
      // Warm Hug
      soundManager.playHug();
      setCurrentAction('hug');
      setHeartBurst(b => b + 1);
      const quote = HUG_DIALOGUES[Math.floor(Math.random() * HUG_DIALOGUES.length)];
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
      const quote = HEAD_TAP_DIALOGUES[Math.floor(Math.random() * HEAD_TAP_DIALOGUES.length)];
      showSpeech(quote, 2800);
      scheduleReturnToIdle(2800);
    } else if (part === 'cheek') {
      soundManager.playPop();
      setCurrentAction('happy');
      const quote = CHEEK_TAP_DIALOGUES[Math.floor(Math.random() * CHEEK_TAP_DIALOGUES.length)];
      showSpeech(quote, 2600);
      scheduleReturnToIdle(2600);
    } else if (part === 'nose') {
      soundManager.playBoop();
      setCurrentAction('boop');
      const quote = NOSE_BOOP_DIALOGUES[Math.floor(Math.random() * NOSE_BOOP_DIALOGUES.length)];
      showSpeech(quote, 2500);
      scheduleReturnToIdle(2500);
    } else {
      // Body / Torso
      soundManager.playPop();
      setCurrentAction('tapReaction');
      const quote = BODY_TAP_DIALOGUES[Math.floor(Math.random() * BODY_TAP_DIALOGUES.length)];
      showSpeech(quote, 2500);
      scheduleReturnToIdle(2500);
    }
  }, [handleAnnoyanceTap, interruptVoiceIfPlaying, scheduleReturnToIdle, showSpeech]);

  // Bubble click cycles to next line
  const handleBubbleClick = useCallback(() => {
    soundManager.playPop();
    const allQuotes = [
      ...GREETING_DIALOGUES,
      ...LOVE_NOTE_DIALOGUES
    ].filter(q => q !== speechText);
    const next = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    showSpeech(next, 3800);
  }, [showSpeech, speechText]);

  // Sound toggle with instant sound feedback on unmute
  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playPop();
    }
  }, []);

  // Clean up all active timers and audio on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
      voiceEngine.cleanup();
    };
  }, []);

  return (
    <div className="game-app-wrapper">
      <div className="bg-glow-orb orb-1" />
      <div className="bg-glow-orb orb-2" />

      <main className="game-container">
        <Header />

        <div className="game-play-area">
          {/* Compact, unobtrusive, touch-transparent speech bubble */}
          <SpeechBubble 
            text={speechText} 
            onDismiss={dismissSpeech}
            onClickBubble={handleBubbleClick} 
          />

          {/* 3D Scene prominently focused on Ayush */}
          <AyushScene
            currentAction={currentAction}
            onTapPart={handleCharacterTap}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
            heartBurst={heartBurst}
            talkingVolume={talkingVolume}
          />
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
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
          onPlaybackStart={handlePlaybackStart}
          onPlaybackEnd={handlePlaybackEnd}
          onAmplitude={handleAmplitude}
        />
      </main>
    </div>
  );
}
