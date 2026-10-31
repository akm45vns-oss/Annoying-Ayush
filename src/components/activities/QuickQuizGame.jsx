import React, { useState } from 'react';
import { X, Trophy, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

const getQuizQuestions = (gfName, ayushName) => {
  const rawPool = [
    {
      question: `What is ${ayushName}'s absolute favorite hobby in the world?`,
      options: [`Teasing and loving ${gfName}! 💕`, "Eating cold plain bread", "Sleeping 20 hours", "Doing calculus"],
      correct: 0
    },
    {
      question: `What happens when you tap ${ayushName}'s nose in the 3D stage?`,
      options: ["He explodes", "A cute BOOP reaction! 👃✨", "He changes clothes", "He falls asleep"],
      correct: 1
    },
    {
      question: "What is the secret 3-step action combo that reveals the hidden letter?",
      options: ["Kiss → Hug → Blush 💖", "Tease → Tap → Cry", "Dance → Jump → Wave", "Belly → Feet → Head"],
      correct: 0
    },
    {
      question: "How many rapid taps on the heart in the header unlock the secret modal?",
      options: ["5 Taps! 💗", "100 Taps", "Only 1 Tap", "10 Taps"],
      correct: 0
    },
    {
      question: `Who is the most precious person in ${ayushName}'s life?`,
      options: [`${gfName}, forever and always! 👸✨`, "A movie celebrity", "Nobody", "His computer monitor"],
      correct: 0
    },
    {
      question: `When you need a warm hug from ${ayushName}, what can you do?`,
      options: ["Press and hold him for 500ms 🫂", "Throw your phone", "Turn off the screen", "Wait until next year"],
      correct: 0
    }
  ];
  return [...rawPool].sort(() => 0.5 - Math.random()).slice(0, 5);
};

export default function QuickQuizGame({
  onFinish,
  onClose,
  gfName = 'Babe',
  ayushName = 'Ayush'
}) {
  const [questions] = useState(() => getQuizQuestions(gfName, ayushName));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelectAnswer = (optionIndex) => {
    if (isAnswered || !currentQ) return;
    setIsAnswered(true);
    setSelectedOption(optionIndex);

    const isCorrect = optionIndex === currentQ.correct;
    if (isCorrect) {
      soundManager.playSparkle();
      setScore((s) => s + 20);
    } else {
      soundManager.playBoing();
    }

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setIsGameOver(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setIsAnswered(false);
        setSelectedOption(null);
      }
    }, 1300);
  };

  const handleClaim = () => {
    const coins = Math.max(20, Math.floor(score * 1.3));
    onFinish(score, coins);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container quick-quiz-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Quiz Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-stat-pill">
            <span>Q {currentIndex + 1}/{questions.length || 5}</span>
          </div>
          <div className="game-title-badge">Quick Quiz ❓</div>
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

        {!isGameOver && currentQ ? (
          <div className="quiz-game-body">
            <h3 className="quiz-question-text">{currentQ.question}</h3>

            <div className="quiz-options-list">
              {currentQ.options.map((option, idx) => {
                let statusClass = '';
                if (isAnswered) {
                  if (idx === currentQ.correct) {
                    statusClass = 'correct';
                  } else if (idx === selectedOption) {
                    statusClass = 'wrong';
                  }
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`quiz-option-btn ${statusClass}`}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={isAnswered}
                  >
                    <span className="quiz-option-label">{String.fromCharCode(65 + idx)}.</span>
                    <span className="quiz-option-content">{option}</span>
                    {isAnswered && idx === currentQ.correct && (
                      <CheckCircle2 size={18} className="quiz-feedback-icon" />
                    )}
                    {isAnswered && idx === selectedOption && idx !== currentQ.correct && (
                      <XCircle size={18} className="quiz-feedback-icon" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="game-summary-card">
            <div className="summary-trophy">🧠</div>
            <h3 className="summary-title">Quiz Completed, {gfName}!</h3>
            <p className="summary-score">Final Score: <strong>{score}</strong> / 100 pts</p>
            <div className="summary-rewards">
              <span>🪙 +{Math.max(20, Math.floor(score * 1.3))} Coins</span>
              <span>⭐ +{35 + Math.floor(score / 5)} XP</span>
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
