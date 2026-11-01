import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

const MOVES = [
  { id: 'left', label: 'Step Left', emoji: '⬅️' },
  { id: 'right', label: 'Step Right', emoji: '➡️' },
  { id: 'spin', label: 'Spin', emoji: '🔄' },
  { id: 'jump', label: 'Hop', emoji: '⬆️' }
];

const getRandomMove = () => MOVES[Math.floor(Math.random() * MOVES.length)].id;

export default function DanceCopyGame({ onFinish, onClose, gfName = 'Babe', ayushName = 'Ayush' }) {
  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [turn, setTurn] = useState('watch'); // 'watch' | 'repeat' | 'gameover'
  const [round, setRound] = useState(1);
  const [activeHighlight, setActiveHighlight] = useState(null);

  // Start new round
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextMove = getRandomMove();
      setTurn('watch');
      setPlayerIndex(0);

      setSequence((prevSeq) => {
        const newSeq = [...prevSeq, nextMove];
        // Playback sequence
        newSeq.forEach((moveId, idx) => {
          setTimeout(() => {
            setActiveHighlight(moveId);
            soundManager.playPop();
            setTimeout(() => setActiveHighlight(null), 400);
          }, (idx + 1) * 700);
        });

        setTimeout(() => {
          setTurn('repeat');
        }, (newSeq.length + 1) * 700);

        return newSeq;
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [round]);

  const handlePlayerMove = (moveId) => {
    if (turn !== 'repeat') return;
    soundManager.playPop();

    if (moveId === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      if (nextIndex === sequence.length) {
        soundManager.playSparkle();
        setRound((r) => r + 1);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      soundManager.playBoing();
      setTurn('gameover');
    }
  };

  const handleClaim = () => {
    onFinish(round * 20);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container dance-copy-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Dance Copy Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-title-badge">Dance Copy 🕺</div>
          <div className="game-stat-pill">
            <Trophy size={14} />
            <span>Round: {round}</span>
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

        {turn !== 'gameover' ? (
          <div className="dance-arena">
            <p className="dance-prompt">
              {turn === 'watch' ? `Watch ${ayushName}'s dance moves!` : 'Your turn to repeat the dance!'}
            </p>

            <div className="dance-buttons-grid">
              {MOVES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`dance-btn ${activeHighlight === m.id ? 'highlighted' : ''}`}
                  onPointerDown={() => handlePlayerMove(m.id)}
                  onClick={() => handlePlayerMove(m.id)}
                  disabled={turn !== 'repeat'}
                >
                  <span className="dance-emoji">{m.emoji}</span>
                  <span className="dance-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="game-summary-card">
            <div className="summary-trophy">🕺</div>
            <h3 className="summary-title">Awesome Dancing!</h3>
            <p className="summary-score">You reached Round {round}, {gfName}! ✨</p>
            <div className="summary-rewards">
              <span>💖 +10% Affection</span>
              <span>⭐ +{round * 20} XP</span>
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
