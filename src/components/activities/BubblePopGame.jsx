import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Timer, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

export default function BubblePopGame({ onFinish, onClose, gfName = 'Babe' }) {
  const [bubbles, setBubbles] = useState([]);
  const [poppedCount, setPoppedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isGameOver, setIsGameOver] = useState(false);
  const timerRef = useRef(null);
  const spawnRef = useRef(null);

  useEffect(() => {
    // Timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(spawnRef.current);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Bubble spawner
    spawnRef.current = setInterval(() => {
      const colors = ['#ff80ab', '#80d8ff', '#ffd180', '#b9f6ca', '#ea80fc'];
      const newBubble = {
        id: Math.random() + Date.now(),
        x: Math.floor(10 + Math.random() * 80),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.floor(45 + Math.random() * 30),
        speed: 3 + Math.random() * 3
      };
      setBubbles((prev) => [...prev.slice(-15), newBubble]);
    }, 600);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, []);

  const handlePopBubble = (bubbleId) => {
    soundManager.playPop();
    setPoppedCount((c) => c + 1);
    setBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
  };

  const handleClaim = () => {
    const coins = Math.max(15, poppedCount * 3);
    onFinish(poppedCount * 10, coins);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container bubble-pop-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Bubble Pop Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-stat-pill">
            <Timer size={16} />
            <span>{timeLeft}s</span>
          </div>
          <div className="game-title-badge">Bubble Pop 🫧</div>
          <div className="game-stat-pill score">
            <Trophy size={16} />
            <span>{poppedCount}</span>
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

        {!isGameOver ? (
          <div className="bubble-arena">
            {bubbles.map((b) => (
              <button
                key={b.id}
                type="button"
                className="floating-bubble"
                style={{
                  left: `${b.x}%`,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  backgroundColor: b.color + '44',
                  borderColor: b.color,
                  animationDuration: `${b.speed}s`
                }}
                onClick={() => handlePopBubble(b.id)}
                aria-label="Pop bubble"
              >
                <div className="bubble-shine" />
              </button>
            ))}
          </div>
        ) : (
          <div className="game-summary-card">
            <div className="summary-trophy">🫧</div>
            <h3 className="summary-title">{poppedCount} Bubbles Popped!</h3>
            <p className="summary-score">Awesome popping frenzy, {gfName}! 💖</p>
            <div className="summary-rewards">
              <span>🪙 +{Math.max(15, poppedCount * 3)} Coins</span>
              <span>⭐ +{30 + poppedCount * 2} XP</span>
            </div>
            <button 
              type="button" 
              className="claim-reward-btn"
              onClick={handleClaim}
            >
              <Sparkles size={18} />
              <span>Claim Rewards & Return</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
