import React, { useState, useRef } from 'react';
import { Heart, Info, X, Settings, MessageCircle } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function Header({
  onOpenSettings,
  onOpenChat,
  onUnlockSecretHeart,
  daysTogether = null,
  gfName = 'Babe',
  ayushName = 'Ayush'
}) {
  const [showInfo, setShowInfo] = useState(false);
  const heartTapsRef = useRef(0);
  const heartResetTimerRef = useRef(null);
  const [heartBounce, setHeartBounce] = useState(false);

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

            <div className="header-actions">
              <button 
                type="button"
                className="icon-action-btn chat-toggle-btn" 
                onClick={() => {
                  soundManager.playPop();
                  if (onOpenChat) onOpenChat();
                }}
                title="Chat with Ayush 💬"
                aria-label="Open chat"
              >
                <MessageCircle size={18} />
              </button>

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
                <Settings size={18} />
              </button>

              <button 
                type="button"
                className="icon-action-btn info-toggle-btn" 
                onClick={() => {
                  soundManager.playPop();
                  setShowInfo(!showInfo);
                }}
                title="About this game"
                aria-label="About this game"
              >
                <Info size={18} />
              </button>
            </div>
          </div>
          <p className="game-subtitle">
            {ayushName}'s pocket avatar • Dedicated to {gfName} 💕
          </p>
        </div>

        <div className="status-pill" onClick={handleHeartClick} style={{ cursor: 'pointer' }}>
          <Heart size={14} className="status-heart" />
          <span>
            {daysTogether !== null 
              ? `Day ${daysTogether} Together 💕` 
              : 'Love Level: 100% 💕'}
          </span>
        </div>
      </div>

      {showInfo && (
        <div className="info-modal-backdrop" onClick={() => setShowInfo(false)}>
          <div className="info-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={() => setShowInfo(false)}
              aria-label="Close info"
            >
              <X size={18} />
            </button>
            <div className="modal-heart-icon">💖</div>
            <h3>Hey {gfName}! 🥰</h3>
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
