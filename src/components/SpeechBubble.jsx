import React from 'react';
import { Heart, Sparkles } from 'lucide-react';

/**
 * Romantic & Playful Floating Speech Bubble
 */
export default function SpeechBubble({ text, onClickBubble }) {
  return (
    <div 
      className="speech-bubble-container"
      onClick={onClickBubble}
      role="button"
      tabIndex={0}
      title="Tap me to change what Ayush says!"
    >
      <div className="speech-bubble-card">
        <div className="bubble-sparkle left">
          <Sparkles size={14} className="sparkle-icon" />
        </div>
        
        <p className="bubble-text">{text}</p>
        
        <div className="bubble-sparkle right">
          <Heart size={14} className="heart-icon" />
        </div>

        {/* Comic Tail */}
        <div className="bubble-tail" />
      </div>
      <span className="bubble-hint">Tap bubble for more cute lines ✨</span>
    </div>
  );
}
