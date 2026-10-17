import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import AyushScene from './components/AyushScene';
import SpeechBubble from './components/SpeechBubble';
import InteractionMenu from './components/InteractionMenu';
import { soundManager } from './utils/audioEffects';

// Curated Dialogue Pools
const RANDOM_DIALOGUES = [
  "Hey beautiful! Look who's here to annoy you forever 😜",
  "Are you here to poke me or love me? Both are accepted! 💕",
  "I was just thinking about you... and then you showed up! 🥰",
  "Warning: Extreme cuteness ahead! Approach with cuddles 🧸",
  "You looked extra gorgeous today, just had to let you know! ✨",
  "Tap my nose, cheeks, tummy, or hold me for a hug! 👉",
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
  "Ouchie! Cheek pinch attack! Now I'm blushing pink! 😳",
  "Hehe that tickles right there! 🌸",
];

const NOSE_BOOP_DIALOGUES = [
  "BOOP! Nose access granted! 👃✨",
  "Hey! Did you just boop my snoot?! 😆",
  "Boop detected! System rebooting with 100% more love! 💖",
  "Beep boop! You're the only one allowed to do that! 🥰",
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
  "Why must you tease me so much?! (Secretly love it though) 🥺",
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
  "Rate my dancing from 10 to 10! (No other options allowed) 😜",
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
  "Out of all the people in the universe, I chose you to annoy forever! 🌍✨",
  "Every second spent making you smile is my favorite second. 🌸",
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
  const [speechText, setSpeechText] = useState(RANDOM_DIALOGUES[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);
  const [annoyanceCount, setAnnoyanceCount] = useState(0);

  const actionTimeoutRef = useRef(null);
  const annoyanceResetTimerRef = useRef(null);

  // Return to idle cleanly
  const resetToIdle = useCallback(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction('idle');
    setAnnoyanceCount(0);
    setSpeechText("I'm ready for your next move! What's next? 😊");
  }, []);

  // Helper to safely schedule idle transition
  const scheduleReturnToIdle = useCallback((durationMs = 3000) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setCurrentAction('idle');
    }, durationMs);
  }, []);

  // Track rapid taps for annoyance escalation
  const registerTapForAnnoyance = useCallback(() => {
    if (annoyanceResetTimerRef.current) clearTimeout(annoyanceResetTimerRef.current);
    annoyanceResetTimerRef.current = setTimeout(() => {
      setAnnoyanceCount(0);
    }, 2400);

    setAnnoyanceCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        soundManager.playAnnoyedPout();
        setCurrentAction('annoyed');
        const quote = ANNOYED_DIALOGUES[Math.floor(Math.random() * ANNOYED_DIALOGUES.length)];
        setSpeechText(quote);
        scheduleReturnToIdle(3400);
        return 0; // reset annoyance cycle
      }
      return next;
    });
  }, [scheduleReturnToIdle]);

  // Main Action trigger (buttons)
  const triggerAction = useCallback((actionId) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction(actionId);

    if (actionId === 'boop') {
      const quote = NOSE_BOOP_DIALOGUES[Math.floor(Math.random() * NOSE_BOOP_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(2600);
    } else if (actionId === 'kiss') {
      setHeartBurst(b => b + 1);
      const quote = KISS_DIALOGUES[Math.floor(Math.random() * KISS_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'dance') {
      const quote = DANCE_DIALOGUES[Math.floor(Math.random() * DANCE_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(4000);
    } else if (actionId === 'laugh') {
      const quote = LAUGH_DIALOGUES[Math.floor(Math.random() * LAUGH_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(3200);
    } else if (actionId === 'loveNote') {
      setHeartBurst(b => b + 1);
      const quote = LOVE_NOTE_DIALOGUES[Math.floor(Math.random() * LOVE_NOTE_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(3600);
    }
  }, [scheduleReturnToIdle]);

  // Touch zones on 3D Character
  const handleCharacterTap = useCallback((part) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    if (part === 'longpress') {
      // Warm Hug
      soundManager.playHug();
      setCurrentAction('hug');
      setHeartBurst(b => b + 1);
      const quote = HUG_DIALOGUES[Math.floor(Math.random() * HUG_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(3600);
      return;
    }

    // Register tap for potential annoyance
    registerTapForAnnoyance();

    if (part === 'head') {
      soundManager.playBoing();
      setCurrentAction('surprised');
      const quote = HEAD_TAP_DIALOGUES[Math.floor(Math.random() * HEAD_TAP_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(2800);
    } else if (part === 'cheek') {
      soundManager.playPop();
      setCurrentAction('happy');
      const quote = CHEEK_TAP_DIALOGUES[Math.floor(Math.random() * CHEEK_TAP_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(2600);
    } else if (part === 'nose') {
      soundManager.playBoop();
      setCurrentAction('boop');
      const quote = NOSE_BOOP_DIALOGUES[Math.floor(Math.random() * NOSE_BOOP_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(2400);
    } else {
      // Body / Torso
      soundManager.playPop();
      setCurrentAction('tapReaction');
      const quote = BODY_TAP_DIALOGUES[Math.floor(Math.random() * BODY_TAP_DIALOGUES.length)];
      setSpeechText(quote);
      scheduleReturnToIdle(2400);
    }
  }, [registerTapForAnnoyance, scheduleReturnToIdle]);

  // Bubble click to cycle quotes
  const handleBubbleClick = useCallback(() => {
    soundManager.playPop();
    const otherQuotes = RANDOM_DIALOGUES.filter(q => q !== speechText);
    const nextQuote = otherQuotes[Math.floor(Math.random() * otherQuotes.length)];
    setSpeechText(nextQuote);
  }, [speechText]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      if (annoyanceResetTimerRef.current) clearTimeout(annoyanceResetTimerRef.current);
    };
  }, []);

  return (
    <div className="game-app-wrapper">
      <div className="bg-glow-orb orb-1" />
      <div className="bg-glow-orb orb-2" />

      <main className="game-container">
        <Header />

        <div className="game-play-area">
          <SpeechBubble 
            text={speechText} 
            onClickBubble={handleBubbleClick} 
          />

          <AyushScene
            currentAction={currentAction}
            onTapPart={handleCharacterTap}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
            heartBurst={heartBurst}
          />
        </div>

        <InteractionMenu
          onTriggerAction={triggerAction}
          onReset={resetToIdle}
          currentAction={currentAction}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          annoyanceCount={annoyanceCount}
        />
      </main>
    </div>
  );
}
