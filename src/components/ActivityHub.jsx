import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { recordMiniGameCompleted } from '../utils/progressionStorage';
import TapChallengeGame from './activities/TapChallengeGame';
import MemoryMatchGame from './activities/MemoryMatchGame';
import ReactionTestGame from './activities/ReactionTestGame';
import BubblePopGame from './activities/BubblePopGame';
import RockPaperScissorsGame from './activities/RockPaperScissorsGame';
import DanceCopyGame from './activities/DanceCopyGame';
import GuessTheSoundGame from './activities/GuessTheSoundGame';
import QuickQuizGame from './activities/QuickQuizGame';

const ACTIVITIES_LIST = [
  {
    id: 'tap_challenge',
    title: 'Tap Challenge',
    desc: 'Rapid tap popping targets before the clock runs out!',
    icon: '🎯',
    color: '#ff4081',
    reward: 'Up to 60 Coins'
  },
  {
    id: 'memory_match',
    title: 'Memory Match',
    desc: 'Match adorable pairs of cute companion emojis.',
    icon: '🧠',
    color: '#7c4dff',
    reward: 'Up to 50 Coins'
  },
  {
    id: 'reaction_test',
    title: 'Reaction Speed',
    desc: 'Test your lightning reflexes when Ayush signals green!',
    icon: '⚡',
    color: '#00e676',
    reward: 'Up to 45 Coins'
  },
  {
    id: 'dance_copy',
    title: 'Dance Copy',
    desc: 'Repeat Ayush’s groovy dance sequence in rhythm!',
    icon: '🕺',
    color: '#e040fb',
    reward: 'Up to 50 Coins'
  },
  {
    id: 'bubble_pop',
    title: 'Bubble Pop',
    desc: 'Pop floating rainbow bubbles drifting through the room.',
    icon: '🫧',
    color: '#00b0ff',
    reward: 'Up to 55 Coins'
  },
  {
    id: 'rps',
    title: 'Rock Paper Scissors',
    desc: 'Play the timeless duel of hands with Ayush!',
    icon: '✌️',
    color: '#ff9100',
    reward: 'Up to 40 Coins'
  },
  {
    id: 'guess_sound',
    title: 'Guess the Sound',
    desc: 'Listen closely and guess what sound Ayush just made!',
    icon: '🎵',
    color: '#ff007f',
    reward: 'Up to 50 Coins'
  },
  {
    id: 'quick_quiz',
    title: 'Quick Quiz',
    desc: 'Fun couple trivia and questions about your companion!',
    icon: '❓',
    color: '#26c6da',
    reward: 'Up to 50 Coins'
  }
];

export default function ActivityHub({
  isOpen,
  onClose,
  progression,
  onUpdateProgression,
  gfName = 'Babe',
  ayushName = 'Ayush'
}) {
  const [activeGameId, setActiveGameId] = useState(null);

  if (!isOpen) return null;

  const handleLaunchGame = (gameId) => {
    soundManager.playPop();
    setActiveGameId(gameId);
  };

  const handleFinishGame = (score, coins) => {
    soundManager.playFanfare();
    const { updated } = recordMiniGameCompleted(progression, score, coins);
    onUpdateProgression(updated);
    setActiveGameId(null);
  };

  return (
    <>
      <div className="bottom-sheet-backdrop" onClick={onClose}>
        <div 
          className="bottom-sheet-card activity-hub-sheet"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Activities and Mini-Games"
        >
          <div className="sheet-handle" />

          <div className="sheet-header">
            <div className="sheet-title-group">
              <h2 className="sheet-title">Mini-Games & Fun 🎮</h2>
              <p className="sheet-subtitle">Earn coins & affection by playing with {ayushName}!</p>
            </div>
            <button 
              type="button" 
              className="sheet-close-btn" 
              onClick={onClose}
              aria-label="Close activities hub"
            >
              <X size={20} />
            </button>
          </div>

          <div className="activities-grid">
            {ACTIVITIES_LIST.map((act) => (
              <div key={act.id} className="activity-card">
                <div className="activity-icon-wrap" style={{ backgroundColor: act.color + '22' }}>
                  <span className="activity-emoji">{act.icon}</span>
                </div>
                <div className="activity-info">
                  <h4 className="activity-name">{act.title}</h4>
                  <p className="activity-desc">{act.desc}</p>
                  <span className="activity-reward">🪙 {act.reward}</span>
                </div>
                <button
                  type="button"
                  className="activity-play-btn"
                  onClick={() => handleLaunchGame(act.id)}
                  aria-label={`Play ${act.title}`}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Play</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE MODAL MINI-GAME */}
      {activeGameId === 'tap_challenge' && (
        <TapChallengeGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
        />
      )}
      {activeGameId === 'memory_match' && (
        <MemoryMatchGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
        />
      )}
      {activeGameId === 'reaction_test' && (
        <ReactionTestGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
        />
      )}
      {activeGameId === 'bubble_pop' && (
        <BubblePopGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
        />
      )}
      {activeGameId === 'rps' && (
        <RockPaperScissorsGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
          ayushName={ayushName}
        />
      )}
      {activeGameId === 'dance_copy' && (
        <DanceCopyGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
          ayushName={ayushName}
        />
      )}
      {activeGameId === 'guess_sound' && (
        <GuessTheSoundGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
        />
      )}
      {activeGameId === 'quick_quiz' && (
        <QuickQuizGame
          onFinish={handleFinishGame}
          onClose={() => setActiveGameId(null)}
          gfName={gfName}
          ayushName={ayushName}
        />
      )}
    </>
  );
}
