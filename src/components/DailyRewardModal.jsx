import React from 'react';
import { X, Sparkles, Flame } from 'lucide-react';
import { claimDailyReward, canClaimDailyReward } from '../utils/progressionStorage';
import { soundManager } from '../utils/audioEffects';

export default function DailyRewardModal({
  isOpen,
  onClose,
  progression,
  onUpdateProgression,
  gfName = 'Babe'
}) {
  if (!isOpen) return null;

  const isClaimable = canClaimDailyReward(progression.lastDailyClaim);
  const streak = progression.streak || 1;

  const handleClaim = () => {
    soundManager.playFanfare();
    const result = claimDailyReward(progression);
    if (result.success) {
      onUpdateProgression(result.updated);
    }
  };

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div 
        className="bottom-sheet-card daily-reward-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Reward"
      >
        <button 
          type="button" 
          className="sheet-close-btn" 
          onClick={onClose}
          aria-label="Close daily reward modal"
        >
          <X size={18} />
        </button>

        <div className="daily-reward-header">
          <div className="daily-gift-icon">🎁</div>
          <div className="streak-badge">
            <Flame size={16} className="flame-icon" />
            <span>{streak} Day Streak!</span>
          </div>
          <h2 className="daily-title">Daily Love Gift</h2>
          <p className="daily-subtitle">
            {isClaimable 
              ? `A special daily bonus just for you, ${gfName}!` 
              : 'You already collected your gift today! Come back tomorrow for more love! 💕'}
          </p>
        </div>

        <div className="daily-prizes-preview">
          <div className="prize-box">
            <span className="prize-emoji">💖</span>
            <span className="prize-amount">+10%</span>
            <span className="prize-label">Affection</span>
          </div>
          <div className="prize-box">
            <span className="prize-emoji">⭐</span>
            <span className="prize-amount">+60</span>
            <span className="prize-label">XP Boost</span>
          </div>
        </div>

        <div className="daily-actions">
          {isClaimable ? (
            <button 
              type="button" 
              className="claim-daily-btn"
              onClick={handleClaim}
            >
              <Sparkles size={18} />
              <span>Open & Claim Gift! 🎉</span>
            </button>
          ) : (
            <button 
              type="button" 
              className="daily-claimed-btn"
              onClick={onClose}
            >
              <span>Collected! Return to Play</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
