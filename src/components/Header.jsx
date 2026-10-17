import React, { useState } from 'react';
import { Heart, Info, X } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function Header() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="game-header">
      <div className="header-content">
        <div className="title-group">
          <div className="title-row">
            <h1 className="game-title">
              Annoying Ayush <span className="heart-pulse">💗</span>
            </h1>
            <button 
              className="info-toggle-btn" 
              onClick={() => {
                soundManager.playPop();
                setShowInfo(!showInfo);
              }}
              title="About this game"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="game-subtitle">Your personal pocket cutie • Always ready to annoy you!</p>
        </div>

        <div className="status-pill">
          <Heart size={14} className="status-heart" />
          <span>Love Level: 100% 💕</span>
        </div>
      </div>

      {showInfo && (
        <div className="info-modal-backdrop" onClick={() => setShowInfo(false)}>
          <div className="info-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowInfo(false)}>
              <X size={18} />
            </button>
            <div className="modal-heart-icon">💖</div>
            <h3>Hey Beautiful! 🥰</h3>
            <p>
              I made this game just for you. You can tap on me, tease me, poke me, 
              or make me blow kisses whenever you miss me!
            </p>
            <p className="modal-subtext">
              P.S. In upcoming milestones, you can talk to me and I will repeat your words in funny voices! 🎙️
            </p>
            <button 
              className="modal-action-btn"
              onClick={() => {
                soundManager.playChime();
                setShowInfo(false);
              }}
            >
              Play With Ayush! 💕
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
