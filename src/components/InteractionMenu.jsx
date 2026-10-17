import React from 'react';
import { 
  Hand, 
  Sparkles, 
  Heart, 
  RotateCcw, 
  Smile, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function InteractionMenu({
  onTriggerAction,
  onReset,
  currentAction,
  isMuted,
  onToggleMute
}) {
  const actions = [
    {
      id: 'poke',
      label: 'Poke Me',
      sublabel: 'Tickle!',
      icon: Hand,
      color: '#ff6b8b',
      sound: () => soundManager.playBoing(),
    },
    {
      id: 'wave',
      label: 'Wave',
      sublabel: 'Say Hi',
      icon: Smile,
      color: '#ffa726',
      sound: () => soundManager.playPop(),
    },
    {
      id: 'kiss',
      label: 'Blow Kiss',
      sublabel: 'Mwah!',
      icon: Heart,
      color: '#e91e63',
      sound: () => soundManager.playChime(),
    },
    {
      id: 'compliment',
      label: 'Sweet Talk',
      sublabel: 'Romance',
      icon: Sparkles,
      color: '#ab47bc',
      sound: () => soundManager.playGiggle(),
    },
  ];

  return (
    <div className="interaction-menu-container">
      {/* Secondary Controls Bar */}
      <div className="menu-meta-bar">
        <button 
          className="meta-button"
          onClick={onToggleMute}
          title={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>{isMuted ? "Unmute" : "Sound ON"}</span>
        </button>

        <span className="meta-badge">
          {currentAction === 'idle' ? '✨ Ready for attention' : `✨ Action: ${currentAction}`}
        </span>

        <button 
          className="meta-button"
          onClick={() => {
            soundManager.playPop();
            onReset();
          }}
          title="Reset to idle pose"
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="action-buttons-grid">
        {actions.map((act) => {
          const Icon = act.icon;
          const isActive = currentAction === act.id;
          return (
            <button
              key={act.id}
              className={`action-btn ${isActive ? 'active' : ''}`}
              style={{ '--btn-accent': act.color }}
              onClick={() => {
                act.sound();
                onTriggerAction(act.id);
              }}
            >
              <div className="btn-icon-wrapper">
                <Icon size={22} className="btn-icon" />
              </div>
              <div className="btn-label-group">
                <span className="btn-label">{act.label}</span>
                <span className="btn-sublabel">{act.sublabel}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
