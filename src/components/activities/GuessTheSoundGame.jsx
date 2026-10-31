import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Volume2, Trophy, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

const SOUND_LIBRARY = [
  { id: 'kiss', name: 'Sweet Kiss 💋', icon: '💋', play: () => soundManager.playKiss() },
  { id: 'boing', name: 'Funny Boing 🤪', icon: '🤾', play: () => soundManager.playBoing() },
  { id: 'laugh', name: 'Playful Giggle 🤣', icon: '😂', play: () => soundManager.playLaugh() },
  { id: 'fanfare', name: 'Victory Fanfare 🎺', icon: '🎺', play: () => soundManager.playFanfare() },
  { id: 'purr', name: 'Cozy Purr 🐱', icon: '😻', play: () => soundManager.playPurr() },
  { id: 'boop', name: 'Nose Boop 👃', icon: '✨', play: () => soundManager.playBoop() },
  { id: 'pop', name: 'Bubble Pop 🫧', icon: '🎈', play: () => soundManager.playPop() }
];

const getRandomRoundData = () => {
  const target = SOUND_LIBRARY[Math.floor(Math.random() * SOUND_LIBRARY.length)];
  const others = SOUND_LIBRARY.filter((s) => s.id !== target.id);
  const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
  const roundOptions = [...shuffledOthers, target].sort(() => 0.5 - Math.random());
  return { target, options: roundOptions };
};

export default function GuessTheSoundGame({ onFinish, onClose, gfName = 'Babe' }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [roundData, setRoundData] = useState(getRandomRoundData);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const autoPlayTimeoutRef = useRef(null);

  const totalRounds = 5;
  const currentSound = roundData.target;
  const options = roundData.options;

  const startNextRound = useCallback(() => {
    setIsAnswered(false);
    setSelectedOption(null);
    const nextData = getRandomRoundData();
    setRoundData(nextData);

    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(() => {
      nextData.target.play();
    }, 400);
  }, []);

  useEffect(() => {
    autoPlayTimeoutRef.current = setTimeout(() => {
      currentSound.play();
    }, 400);
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [currentSound]);

  const handleReplay = () => {
    if (currentSound) {
      currentSound.play();
    }
  };

  const handleSelectOption = (opt) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(opt.id);

    if (opt.id === currentSound.id) {
      soundManager.playSparkle();
      setScore((s) => s + 20);
    } else {
      soundManager.playBoing();
    }

    // Advance to next round or end game
    setTimeout(() => {
      if (round >= totalRounds) {
        setIsGameOver(true);
      } else {
        setRound((r) => r + 1);
        startNextRound();
      }
    }, 1200);
  };

  const handleClaim = () => {
    const coins = Math.max(15, Math.floor(score * 1.25));
    onFinish(score, coins);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container guess-sound-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Guess the Sound Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-stat-pill">
            <span>Round {round}/{totalRounds}</span>
          </div>
          <div className="game-title-badge">Guess the Sound 🎵</div>
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

        {!isGameOver ? (
          <div className="sound-game-body">
            <p className="arena-instruction">Listen carefully and identify the sound!</p>

            <div className="sound-play-card">
              <button 
                type="button"
                className="sound-listen-btn pulse-glow"
                onClick={handleReplay}
                aria-label="Play sound again"
              >
                <Volume2 size={36} />
                <span>Replay Sound 🔊</span>
              </button>
            </div>

            <div className="sound-options-grid">
              {options.map((opt) => {
                let statusClass = '';
                if (isAnswered) {
                  if (opt.id === currentSound.id) {
                    statusClass = 'correct';
                  } else if (opt.id === selectedOption) {
                    statusClass = 'wrong';
                  }
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`sound-option-card ${statusClass}`}
                    onClick={() => handleSelectOption(opt)}
                    disabled={isAnswered}
                  >
                    <span className="sound-opt-icon">{opt.icon}</span>
                    <span className="sound-opt-name">{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="game-summary-card">
            <div className="summary-trophy">🎵</div>
            <h3 className="summary-title">Game Finished, {gfName}!</h3>
            <p className="summary-score">Final Score: <strong>{score}</strong> / 100 pts</p>
            <div className="summary-rewards">
              <span>🪙 +{Math.max(15, Math.floor(score * 1.25))} Coins</span>
              <span>⭐ +{30 + Math.floor(score / 5)} XP</span>
              <span>💖 +5% Affection</span>
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
