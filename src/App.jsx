import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import AyushScene from './components/AyushScene';
import SpeechBubble from './components/SpeechBubble';
import InteractionMenu from './components/InteractionMenu';
import { soundManager } from './utils/audioEffects';

const RANDOM_DIALOGUES = [
  "Hey beautiful! Look who's here to annoy you forever 😜",
  "Are you here to poke me or love me? Both are accepted! 💕",
  "I was just thinking about you... and then you showed up! 🥰",
  "Warning: Extreme cuteness ahead! Approach with cuddles 🧸",
  "You looked extra gorgeous today, just had to let you know! ✨",
  "Tap my head, my tummy, or any button below to play with me! 👉",
];

const HEAD_TAP_DIALOGUES = [
  "Hey! Watch the hair, I spent 15 minutes styling it! 💇‍♂️😂",
  "Bonk! You tapped my head! Careful, my brain is full of you! 🧠💖",
  "Head pats? Okay fine... you're allowed because you're cute 🥰",
  "Oof! My head is not a button! (Wait, actually it is!) 😜",
];

const BODY_TAP_DIALOGUES = [
  "Eeep! That tickles! Stopppp it! 😆✨",
  "Poke me again and I will send you 50 cheesy voice notes! 🎙️",
  "Tickle tickle! You really can't keep your hands off me, huh? 🙈",
  "Bouncing back into your heart! ❤️",
];

export default function App() {
  const [currentAction, setCurrentAction] = useState('idle');
  const [speechText, setSpeechText] = useState(RANDOM_DIALOGUES[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const actionTimeoutRef = useRef(null);

  const resetToIdle = useCallback(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction('idle');
    setSpeechText("I'm ready for your next move! What's next? 😊");
  }, []);

  const triggerAction = useCallback((actionId) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setCurrentAction(actionId);

    if (actionId === 'poke') {
      const idx = Math.floor(Math.random() * BODY_TAP_DIALOGUES.length);
      setSpeechText(BODY_TAP_DIALOGUES[idx]);
    } else if (actionId === 'wave') {
      setSpeechText("Hiiiii my favorite human! Sending you the biggest wave! 👋💖");
    } else if (actionId === 'kiss') {
      setSpeechText("MWAHHH! 💋 That kiss is reserved exclusively for you!");
    } else if (actionId === 'compliment') {
      setSpeechText("Reminder: You are the prettiest, smartest, sweetest girl ever! 🌸✨");
    }

    // Auto-return to idle after 3 seconds
    actionTimeoutRef.current = setTimeout(() => {
      setCurrentAction('idle');
    }, 3200);
  }, []);

  // Handle direct 3D character tap
  const handleCharacterTap = useCallback((part) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    if (part === 'head') {
      soundManager.playBoing();
      setCurrentAction('poke');
      const idx = Math.floor(Math.random() * HEAD_TAP_DIALOGUES.length);
      setSpeechText(HEAD_TAP_DIALOGUES[idx]);
    } else {
      soundManager.playPop();
      setCurrentAction('poke');
      const idx = Math.floor(Math.random() * BODY_TAP_DIALOGUES.length);
      setSpeechText(BODY_TAP_DIALOGUES[idx]);
    }

    actionTimeoutRef.current = setTimeout(() => {
      setCurrentAction('idle');
    }, 2800);
  }, []);

  // Cycle random dialogues on bubble click
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
    };
  }, []);

  return (
    <div className="game-app-wrapper">
      {/* Background Ambience */}
      <div className="bg-glow-orb orb-1" />
      <div className="bg-glow-orb orb-2" />

      {/* Main Mobile App Frame */}
      <main className="game-container">
        {/* Header */}
        <Header />

        {/* Playable Area */}
        <div className="game-play-area">
          {/* Floating Speech Bubble */}
          <SpeechBubble 
            text={speechText} 
            onClickBubble={handleBubbleClick} 
          />

          {/* 3D Interactive Canvas */}
          <AyushScene
            currentAction={currentAction}
            onTapPart={handleCharacterTap}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
          />
        </div>

        {/* Bottom Interaction Menu */}
        <InteractionMenu
          onTriggerAction={triggerAction}
          onReset={resetToIdle}
          currentAction={currentAction}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      </main>
    </div>
  );
}
