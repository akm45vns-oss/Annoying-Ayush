import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trophy, Timer, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

const getRandomTarget = () => {
  const emojis = ['💖', '💋', '⭐', '🌸', '🧸', '🍬'];
  return {
    id: 1,
    x: Math.floor(15 + Math.random() * 70),
    y: Math.floor(15 + Math.random() * 70),
    emoji: emojis[Math.floor(Math.random() * emojis.length)]
  };
};

export default function TapChallengeGame({ onFinish, onClose, gfName = 'Babe' }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'ended'
  const [target, setTarget] = useState(getRandomTarget);
  const timerRef = useRef(null);

  const spawnTarget = useCallback(() => {
    const emojis = ['💖', '💋', '⭐', '🌸', '🧸', '🍬'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    // Random position within safe inner area 15% - 85%
    const nextX = Math.floor(15 + Math.random() * 70);
    const nextY = Math.floor(15 + Math.random() * 70);
    setTarget({
      id: Date.now() + Math.random(),
      x: nextX,
      y: nextY,
      emoji: randomEmoji
    });
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTapTarget = (e) => {
    e.stopPropagation();
    if (gameState !== 'playing') return;
    soundManager.playPop();
    setScore((s) => s + 10);
    spawnTarget();
  };

  const handleClaim = () => {
    onFinish(score);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container tap-challenge-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Tap Challenge Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-stat-pill">
            <Timer size={16} />
            <span>{timeLeft}s</span>
          </div>
          <div className="game-title-badge">Tap Challenge 🎯</div>
          <div className="game-stat-pill score">
            <Trophy size={16} />
            <span>{score}</span>
          </div>
          <button 
            type="button" 
            className="game-exit-btn" 
            onClick={onClose}
            aria-label="Exit game"
          >
            <X size={18} />
          </button>
        </div>

        {gameState === 'playing' ? (
          <div className="game-tap-arena">
            <p className="arena-instruction">Tap the hearts before time runs out!</p>
            <button
              type="button"
              key={target.id}
              className="challenge-tap-target bounce-pop"
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
              onClick={handleTapTarget}
              aria-label="Tap target"
            >
              <span>{target.emoji}</span>
            </button>
          </div>
        ) : (
          <div className="game-summary-card">
            <div className="summary-trophy">🏆</div>
            <h3 className="summary-title">Time's Up, {gfName}!</h3>
            <p className="summary-score">Final Score: <strong>{score}</strong> pts</p>
            <div className="summary-rewards">
              <span>💖 +10% Affection</span>
              <span>⭐ +{35 + Math.floor(score / 10)} XP</span>
            </div>
            <button 
              type="button" 
              className="claim-reward-btn"
              onClick={handleClaim}
            >
              <Sparkles size={18} />
              <span>Great Job! Continue</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
