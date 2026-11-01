import React, { useState } from 'react';
import { X, Sparkles, Trophy } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

const CHOICES = [
  { id: 'rock', emoji: '✊', label: 'Rock' },
  { id: 'paper', emoji: '✋', label: 'Paper' },
  { id: 'scissors', emoji: '✌️', label: 'Scissors' }
];

const getRandomAyushChoice = () => CHOICES[Math.floor(Math.random() * CHOICES.length)].id;

export default function RockPaperScissorsGame({ onFinish, onClose, gfName = 'Babe', ayushName = 'Ayush' }) {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [ayushChoice, setAyushChoice] = useState(null);
  const [result, setResult] = useState(null); // 'win' | 'lose' | 'tie'
  const [playerWins, setPlayerWins] = useState(0);

  const handlePlay = (choiceId) => {
    soundManager.playPop();
    const ayushPick = getRandomAyushChoice();
    setPlayerChoice(choiceId);
    setAyushChoice(ayushPick);

    if (choiceId === ayushPick) {
      setResult('tie');
      soundManager.playShyChime();
    } else if (
      (choiceId === 'rock' && ayushPick === 'scissors') ||
      (choiceId === 'paper' && ayushPick === 'rock') ||
      (choiceId === 'scissors' && ayushPick === 'paper')
    ) {
      setResult('win');
      setPlayerWins((w) => w + 1);
      soundManager.playSparkle();
    } else {
      setResult('lose');
      soundManager.playBoing();
    }
  };

  const handleNextRound = () => {
    setPlayerChoice(null);
    setAyushChoice(null);
    setResult(null);
  };

  const handleClaim = () => {
    onFinish(playerWins * 25);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container rps-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rock Paper Scissors Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-title-badge">Rock Paper Scissors ✌️</div>
          <div className="game-stat-pill">
            <Trophy size={14} />
            <span>Score: {playerWins}</span>
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

        {!result ? (
          <div className="rps-arena">
            <p className="rps-prompt">Pick your hand against {ayushName}!</p>
            <div className="rps-choices-grid">
              {CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rps-choice-btn"
                  onPointerDown={() => handlePlay(c.id)}
                  onClick={() => handlePlay(c.id)}
                >
                  <span className="rps-emoji">{c.emoji}</span>
                  <span className="rps-label">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rps-result-card">
            <div className="rps-battle-view">
              <div className="battle-side">
                <span className="battle-emoji">
                  {CHOICES.find((c) => c.id === playerChoice)?.emoji}
                </span>
                <span className="battle-label">{gfName}</span>
              </div>
              <div className="battle-vs">VS</div>
              <div className="battle-side">
                <span className="battle-emoji">
                  {CHOICES.find((c) => c.id === ayushChoice)?.emoji}
                </span>
                <span className="battle-label">{ayushName}</span>
              </div>
            </div>

            <div className="rps-outcome-banner">
              {result === 'win' && <h3 className="win-text">You Won! 🎉</h3>}
              {result === 'lose' && <h3 className="lose-text">{ayushName} Won! 😜</h3>}
              {result === 'tie' && <h3 className="tie-text">It's a Tie! 🤝</h3>}
            </div>

            <div className="rps-actions">
              <button
                type="button"
                className="rps-again-btn"
                onClick={handleNextRound}
              >
                Play Another Round 🔄
              </button>
              <button
                type="button"
                className="claim-reward-btn"
                onClick={handleClaim}
              >
                <Sparkles size={16} />
                <span>Finish & Continue</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
