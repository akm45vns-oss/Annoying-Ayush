import React from 'react';
import { X } from 'lucide-react';

/**
 * Compact, unobtrusive Speech Bubble / Toast
 * Positioned cleanly near the top edge without obstructing the 3D character.
 * Automatically dismissible, lightweight, and touch-transparent for surrounding areas.
 */
export default function SpeechBubble({ text, onDismiss, onClickBubble }) {
  if (!text) return null;

  return (
    <div className="speech-bubble-wrapper">
      <div 
        className="speech-bubble-pill"
        onClick={onClickBubble}
        role="status"
        aria-live="polite"
      >
        <span className="bubble-message">{text}</span>
        {onDismiss && (
          <button 
            type="button"
            className="bubble-dismiss-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="Dismiss message"
            title="Dismiss"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
