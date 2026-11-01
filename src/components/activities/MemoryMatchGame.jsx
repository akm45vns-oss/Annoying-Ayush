import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

const CARD_PAIRS = ['💖', '🧸', '🌸', '👑', '🍭', '🐱'];

export default function MemoryMatchGame({ onFinish, onClose, gfName = 'Babe' }) {
  const [cards] = useState(() => (
    [...CARD_PAIRS, ...CARD_PAIRS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji }))
  ));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const handleCardClick = (index) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    soundManager.playPop();
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      if (cards[firstIdx].emoji === cards[secondIdx].emoji) {
        soundManager.playSparkle();
        setMatched((prev) => {
          const updated = [...prev, firstIdx, secondIdx];
          if (updated.length === cards.length) {
            setTimeout(() => {
              soundManager.playFanfare();
              setIsGameOver(true);
            }, 600);
          }
          return updated;
        });
        setFlipped([]);
      } else {
        setTimeout(() => {
          setFlipped([]);
        }, 900);
      }
    }
  };

  const handleClaim = () => {
    onFinish(100);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container memory-game-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Memory Match Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-title-badge">Memory Match 🧠</div>
          <div className="game-stat-pill">
            <span>Moves: {moves}</span>
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
          <div className="memory-grid">
            {cards.map((card, idx) => {
              const isRevealed = flipped.includes(idx) || matched.includes(idx);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`memory-card ${isRevealed ? 'flipped' : ''} ${matched.includes(idx) ? 'matched' : ''}`}
                  onPointerDown={() => handleCardClick(idx)}
                  onClick={() => handleCardClick(idx)}
                  aria-label={`Card ${idx + 1}`}
                >
                  <div className="card-inner">
                    <div className="card-front">❓</div>
                    <div className="card-back">{card.emoji}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="game-summary-card">
            <div className="summary-trophy">🎉</div>
            <h3 className="summary-title">Matched in {moves} Moves!</h3>
            <p className="summary-score">Brilliant memory, {gfName}! Ayush is impressed. 💕</p>
            <div className="summary-rewards">
              <span>💖 +10% Affection</span>
              <span>⭐ +50 XP</span>
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
