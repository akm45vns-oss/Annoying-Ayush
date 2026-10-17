import React, { useEffect } from 'react';
import { X, Heart, Sparkles, RotateCcw } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { calculateDaysTogether } from '../utils/romanticSettings';

export default function SecretLetterModal({
  isOpen,
  onClose,
  gfName = 'Babe',
  ayushName = 'Ayush',
  anniversaryDate = '',
  unlockReason = 'secretHeart', // 'secretHeart' | 'combo'
  onResetUnlocks
}) {
  // Close letter on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const daysTogether = calculateDaysTogether(anniversaryDate);

  return (
    <div className="romantic-modal-backdrop letter-backdrop" onClick={onClose}>
      <div 
        className="secret-letter-card" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-title"
      >
        {/* Envelope stamp seal */}
        <div className="letter-wax-seal">
          <Heart size={20} className="seal-heart" />
        </div>

        <button 
          type="button" 
          className="modal-close-icon-btn letter-close" 
          onClick={() => {
            soundManager.playPop();
            onClose();
          }}
          aria-label="Close letter"
        >
          <X size={18} />
        </button>

        <div className="letter-header">
          <div className="letter-badge">
            <Sparkles size={13} />
            <span>
              {unlockReason === 'combo' 
                ? 'Secret Combo Discovered! 🌟' 
                : 'Heart Tap Secret Unlocked! 💌'}
            </span>
          </div>
          <h2 id="letter-title" className="letter-title">
            For My Sweetest {gfName} ❤️
          </h2>
          {daysTogether !== null && (
            <p className="letter-subtitle">Day {daysTogether} of our beautiful story 💕</p>
          )}
        </div>

        <div className="letter-content-body">
          <p className="letter-salutation">My dearest {gfName},</p>
          
          <p>
            If you're reading this, you solved my secret! You really know the way 
            right into my heart. 🥰
          </p>
          
          <p>
            I made this little interactive world just for you. Whenever you're having 
            a busy day, feeling tired, or missing me, you can open this pocket version 
            of me to get warm hugs, silly laughs, and infinite kisses.
          </p>

          <p>
            Out of everyone on this planet, you are the sweetest, kindest, most gorgeous 
            girl, and my favorite person in the whole universe.
          </p>

          <p className="letter-closing">
            Forever yours,<br />
            <strong>{ayushName}</strong> 💖
          </p>
        </div>

        <div className="letter-footer">
          {onResetUnlocks && (
            <button
              type="button"
              className="letter-reset-btn"
              onClick={() => {
                soundManager.playPop();
                onResetUnlocks();
                onClose();
              }}
              title="Reset secret unlocks (for testing)"
            >
              <RotateCcw size={12} />
              <span>Reset Secret</span>
            </button>
          )}

          <button 
            type="button" 
            className="letter-action-btn"
            onClick={() => {
              soundManager.playKiss();
              onClose();
            }}
          >
            I Love You Too! 💋
          </button>
        </div>
      </div>
    </div>
  );
}
