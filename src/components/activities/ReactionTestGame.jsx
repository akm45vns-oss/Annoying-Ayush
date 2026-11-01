import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

export default function ReactionTestGame({ onFinish, onClose, gfName = 'Babe' }) {
  const [state, setState] = useState('waiting'); // 'waiting' | 'ready' | 'tapped' | 'early'
  const [reactionTime, setReactionTime] = useState(null);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Schedule random trigger between 1.5s and 4.0s
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      soundManager.playChime();
      startTimeRef.current = Date.now();
      setState('ready');
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClickArena = () => {
    if (state === 'waiting') {
      // Tapped too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      soundManager.playBoing();
      setState('early');
    } else if (state === 'ready') {
      const diff = Date.now() - startTimeRef.current;
      soundManager.playSparkle();
      setReactionTime(diff);
      setState('tapped');
    }
  };

  const handleRetry = () => {
    setState('waiting');
    setReactionTime(null);
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      soundManager.playChime();
      startTimeRef.current = Date.now();
      setState('ready');
    }, delay);
  };

  const handleClaim = () => {
    onFinish(100);
  };

  return (
    <div className="activity-modal-backdrop" onClick={onClose}>
      <div 
        className="activity-game-container reaction-test-game"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reaction Speed Test Mini-Game"
      >
        <div className="game-top-bar">
          <div className="game-title-badge">Reaction Test ⚡</div>
          <button 
            type="button" 
            className="game-exit-btn" 
            onClick={onClose}
            aria-label="Exit game"
          >
            <X size={18} />
          </button>
        </div>

        <div 
          className={`reaction-arena ${state}`}
          onPointerDown={handleClickArena}
          onClick={handleClickArena}
        >
          {state === 'waiting' && (
            <div className="reaction-prompt">
              <span className="reaction-emoji">⏳</span>
              <h3>Wait for Green...</h3>
              <p>Don't tap yet!</p>
            </div>
          )}

          {state === 'ready' && (
            <div className="reaction-prompt">
              <span className="reaction-emoji">💥</span>
              <h3>TAP NOW!</h3>
            </div>
          )}

          {state === 'early' && (
            <div className="reaction-prompt">
              <span className="reaction-emoji">⚠️</span>
              <h3>Too early!</h3>
              <p>Patience, {gfName}! Wait for green.</p>
              <button 
                type="button" 
                className="retry-btn" 
                onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              >
                Try Again
              </button>
            </div>
          )}

          {state === 'tapped' && (
            <div className="game-summary-card">
              <div className="summary-trophy">⚡</div>
              <h3 className="summary-title">{reactionTime} ms!</h3>
              <p className="summary-score">
                {reactionTime < 280 ? 'Lightning reflexes! ⚡' : 'Great timing! 💕'}
              </p>
              <div className="summary-rewards">
                <span>💖 +10% Affection</span>
                <span>⭐ +40 XP</span>
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
    </div>
  );
}
