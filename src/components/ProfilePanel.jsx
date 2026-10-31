import React from 'react';
import { X, Heart, Trophy, Award } from 'lucide-react';
import { getXpRequiredForLevel } from '../utils/progressionStorage';
import { soundManager } from '../utils/audioEffects';

const EMOTES_CATALOG = [
  { id: 'kiss', label: 'Blow Kiss', icon: '💋', desc: 'Sweet romantic kiss' },
  { id: 'hug', label: 'Warm Hug', icon: '🤗', desc: 'Heartfelt warm embrace' },
  { id: 'blush', label: 'Shy Blush', icon: '😳', desc: 'Rosy shy cheeks' },
  { id: 'cuddle', label: 'Cuddle', icon: '🧸', desc: 'Cozy snuggles' },
  { id: 'laugh', label: 'Giggle', icon: '😂', desc: 'Cheerful laughter' },
  { id: 'dance', label: 'Dance', icon: '🕺', desc: 'Groovy moves' },
  { id: 'sleeping', label: 'Sleep', icon: '😴', desc: 'Peaceful snooze' },
  { id: 'celebrating', label: 'Celebrate', icon: '🎉', desc: 'Victory cheer' },
  { id: 'thinking', label: 'Think', icon: '🤔', desc: 'Deep contemplation' },
  { id: 'surprised', label: 'Surprised', icon: '😲', desc: 'Astonished look' },
  { id: 'annoyed', label: 'Pout', icon: '😒', desc: 'Mock annoyed pout' }
];

export default function ProfilePanel({
  isOpen,
  onClose,
  progression,
  onTriggerEmote,
  gfName = 'Babe',
  ayushName = 'Ayush'
}) {
  if (!isOpen) return null;

  const { level = 1, xp = 0, coins = 0, affection = 20, streak = 1, achievements = {} } = progression;
  const xpNeeded = getXpRequiredForLevel(level);
  const xpPercent = Math.min(100, Math.floor((xp / xpNeeded) * 100));

  // Determine companionship title based on affection
  let bondTitle = 'Playful Pal';
  if (affection >= 80) bondTitle = 'Eternal Soulmates 💕';
  else if (affection >= 50) bondTitle = 'Sweetheart Lovers 💖';
  else if (affection >= 30) bondTitle = 'Close Confidant 🌸';

  const achievementList = Object.keys(achievements).map((key) => ({
    id: key,
    ...achievements[key]
  }));

  const handleEmoteClick = (emoteId) => {
    soundManager.playPop();
    if (onTriggerEmote) {
      onTriggerEmote(emoteId);
    }
  };

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div 
        className="bottom-sheet-card profile-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Profile and Progress"
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div className="sheet-title-group">
            <h2 className="sheet-title">Profile & Milestones 👤</h2>
            <p className="sheet-subtitle">{gfName} & {ayushName} • {bondTitle}</p>
          </div>
          <button 
            type="button" 
            className="sheet-close-btn" 
            onClick={onClose}
            aria-label="Close profile"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. Companion Level & Affection Overview */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box level-box">
            <div className="stat-header-row">
              <span className="stat-badge">Level {level}</span>
              <span className="xp-text">{xp} / {xpNeeded} XP</span>
            </div>
            <div className="xp-bar-bg">
              <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>

          <div className="profile-stat-box affection-box">
            <div className="stat-header-row">
              <span className="stat-label">
                <Heart size={14} className="heart-pulse-icon" fill="currentColor" />
                Affection Meter
              </span>
              <span className="affection-percent">{affection}%</span>
            </div>
            <div className="affection-bar-bg">
              <div className="affection-bar-fill" style={{ width: `${affection}%` }} />
            </div>
          </div>

          <div className="profile-stat-pill-row">
            <div className="pill-item">
              <span className="pill-emoji">🪙</span>
              <span className="pill-val">{coins} Coins</span>
            </div>
            <div className="pill-item">
              <span className="pill-emoji">🔥</span>
              <span className="pill-val">{streak} Day Streak</span>
            </div>
          </div>
        </div>

        {/* 2. Emotes Trigger Grid */}
        <div className="profile-section">
          <h3 className="section-title">Character Emotes & Poses 🎭</h3>
          <p className="section-desc">Tap any emote to make {ayushName} perform it on stage!</p>
          <div className="emotes-grid">
            {EMOTES_CATALOG.map((emote) => (
              <button
                key={emote.id}
                type="button"
                className="emote-pill-btn"
                onClick={() => handleEmoteClick(emote.id)}
              >
                <span className="emote-icon">{emote.icon}</span>
                <span className="emote-label">{emote.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Achievements List */}
        <div className="profile-section">
          <h3 className="section-title">Achievements 🏆</h3>
          <div className="achievements-list">
            {achievementList.map((ach) => (
              <div key={ach.id} className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}>
                <div className="ach-icon-wrap">
                  {ach.unlocked ? (
                    <Award size={22} className="ach-icon-unlocked" />
                  ) : (
                    <Trophy size={20} className="ach-icon-locked" />
                  )}
                </div>
                <div className="ach-details">
                  <div className="ach-title-row">
                    <h4 className="ach-title">{ach.title}</h4>
                    {ach.unlocked && <span className="ach-done-tag">Unlocked! ✨</span>}
                  </div>
                  <p className="ach-desc">{ach.desc}</p>
                  {!ach.unlocked && ach.max > 1 && (
                    <div className="ach-progress-bar">
                      <div 
                        className="ach-progress-fill" 
                        style={{ width: `${Math.min(100, (ach.progress / ach.max) * 100)}%` }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
