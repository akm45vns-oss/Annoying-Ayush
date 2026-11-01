import React, { useState, useRef, useEffect } from 'react';
import { X, Settings, Mic } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function Header({
  onOpenSettings,
  onOpenChat: _onOpenChat,
  onUnlockSecretHeart,
  daysTogether = null,
  gfName = 'Babe',
  ayushName = 'Ayush',
  isListening = false,
  onToggleListening = () => {},
  level = 1,
  isDailyClaimable = false,
  onOpenDailyReward = () => {},
  onOpenProfile = () => {},
  _onOpenInstall = () => {}
}) {
  const [showInfo, setShowInfo] = useState(false);
  const heartTapsRef = useRef(0);
  const heartResetTimerRef = useRef(null);
  const [heartBounce, setHeartBounce] = useState(false);

  // Close info dialog on Escape key
  useEffect(() => {
    if (!showInfo) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowInfo(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInfo]);

  const handleHeartClick = () => {
    soundManager.playPop();
    setHeartBounce(true);
    setTimeout(() => setHeartBounce(false), 300);

    if (heartResetTimerRef.current) clearTimeout(heartResetTimerRef.current);
    heartResetTimerRef.current = setTimeout(() => {
      heartTapsRef.current = 0;
    }, 3500);

    heartTapsRef.current += 1;
    if (heartTapsRef.current >= 5) {
      heartTapsRef.current = 0;
      if (onUnlockSecretHeart) {
        onUnlockSecretHeart();
      }
    }
  };

  return (
    <header className="game-header">
      <div className="header-content">
        <div className="title-group">
          <div className="title-row">
            <h1 className="game-title">
              Annoying Ayush{' '}
              <button
                type="button"
                className={`heart-secret-btn ${heartBounce ? 'tapped' : ''}`}
                onClick={handleHeartClick}
                title="Tap my heart! 💖"
                aria-label="Secret heart button"
              >
                <span className="heart-pulse">💗</span>
              </button>
            </h1>
          </div>
          <p className="game-subtitle">
            {daysTogether !== null
              ? `Day ${daysTogether} Together 💕`
              : `${ayushName}'s pocket avatar • for ${gfName} 💕`}
          </p>
        </div>

        <div className="header-actions">
          {/* Daily Reward Button */}
          <button
            type="button"
            className={`header-daily-pill ${isDailyClaimable ? 'claimable pulse-daily' : ''}`}
            onClick={() => {
              soundManager.playPop();
              onOpenDailyReward();
            }}
            title={isDailyClaimable ? "Daily gift is ready to open!" : "Daily reward claimed"}
            aria-label="Daily Reward"
          >
            <span className="daily-gift-emoji">🎁</span>
            {isDailyClaimable && <span className="daily-sparkle-dot" />}
          </button>

          {/* Level Badge */}
          <div
            className="header-level-pill"
            onClick={onOpenProfile}
            title={`Level ${level}`}
            role="button"
            tabIndex={0}
          >
            <span className="level-num">Lv.{level}</span>
          </div>

          {/* Settings */}
          <button
            type="button"
            className="icon-action-btn settings-toggle-btn"
            onClick={() => {
              soundManager.playPop();
              if (onOpenSettings) onOpenSettings();
            }}
            title="Personalize settings"
            aria-label="Open settings"
          >
            <Settings size={17} />
          </button>

          {/* Mic pill – compact, accessible voice repeat status */}
          <button
            type="button"
            className={`header-mic-pill ${isListening ? 'active' : ''}`}
            onClick={() => {
              if (onToggleListening) onToggleListening();
            }}
            title={isListening ? 'Listening hands-free. Tap to pause.' : 'Voice repeat paused. Tap to enable.'}
            aria-label="Toggle continuous voice repeat"
          >
            <Mic size={13} className={isListening ? 'mic-pulse' : ''} />
            <span className="header-mic-text">{isListening ? 'Voice On' : 'Voice Off'}</span>
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="info-modal-backdrop" onClick={() => setShowInfo(false)}>
          <div
            className="info-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-dialog-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowInfo(false)}
              aria-label="Close info dialog"
            >
              <X size={18} />
            </button>
            <div className="modal-heart-icon" aria-hidden="true">💌</div>
            <h3 id="info-dialog-title">Hey {gfName}! 🥰</h3>
            <p>
              I made this game just for you. You can tap on me, tease me, poke me,
              blow kisses, hug, cuddle, and blush whenever you miss me!
            </p>
            <p className="modal-subtext">
              ✨ <strong>Tip:</strong> Tap the microphone tab to talk to me and hear me repeat in funny voices,
              or tap ⚙️ settings to customize names and dates!
            </p>
            <button
              type="button"
              className="modal-action-btn"
              onClick={() => {
                soundManager.playChime();
                setShowInfo(false);
              }}
            >
              Play With {ayushName}! 💕
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
