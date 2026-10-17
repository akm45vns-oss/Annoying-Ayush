import React from 'react';
import { 
  Heart, 
  Smile, 
  Mail,
  Sparkles,
  HeartHandshake,
  Moon,
  MessageCircle
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import ChatPanel from './ChatPanel';

export default function InteractionMenu({
  onTriggerAction,
  _onReset,
  currentAction,
  _isMuted,
  _onToggleMute,
  _annoyanceCount = 0,
  activeTab = 'play',
  setActiveTab = () => {},
  gfName = 'Babe',
  ayushName = 'Ayush',
  onAyushReply = () => {}
}) {
  const actions = [
    {
      id: 'kiss',
      label: 'Kiss',
      sublabel: 'Mwah! 💋',
      icon: Heart,
      color: '#e91e63',
      sound: () => soundManager.playKiss(),
    },
    {
      id: 'hug',
      label: 'Hug',
      sublabel: 'Warm embrace',
      icon: HeartHandshake,
      color: '#ff6b8b',
      sound: () => soundManager.playHug(),
    },
    {
      id: 'blush',
      label: 'Blush',
      sublabel: 'Rosy cheeks',
      icon: Sparkles,
      color: '#f06292',
      sound: () => soundManager.playShyChime(),
    },
    {
      id: 'cuddle',
      label: 'Cuddle',
      sublabel: 'Cozy snuggles',
      icon: Moon,
      color: '#ba68c8',
      sound: () => soundManager.playCuddleHum(),
    },
    {
      id: 'laugh',
      label: 'Tease',
      sublabel: 'Giggles & fun',
      icon: Smile,
      color: '#ffa000',
      sound: () => soundManager.playLaugh(),
    },
    {
      id: 'loveNote',
      label: 'Love Note',
      sublabel: 'Sweet words',
      icon: Mail,
      color: '#00acc1',
      sound: () => soundManager.playChime(),
    },
  ];

  return (
    <div className={`interaction-menu-container ${activeTab === 'chat' ? 'chat-active' : ''}`}>
      {/* 1. Strictly Two Primary Navigation Buttons */}
      <div className="menu-nav-tabs">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'play' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('play');
          }}
        >
          <Sparkles size={14} />
          <span>Play & Romance 💖</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('chat');
          }}
        >
          <MessageCircle size={14} />
          <span>AI Chat 💬</span>
        </button>
      </div>

      {/* 2. Panel Content: Play & Romance actions or AI Chat */}
      {activeTab === 'play' && (
        <div className="action-buttons-grid action-buttons-6">
          {actions.map((act) => {
            const Icon = act.icon;
            const isActive = currentAction === act.id;
            return (
              <button
                key={act.id}
                type="button"
                className={`action-btn ${isActive ? 'active' : ''}`}
                style={{ '--btn-accent': act.color }}
                onClick={() => {
                  act.sound();
                  onTriggerAction(act.id);
                }}
              >
                <div className="btn-icon-wrapper">
                  <Icon size={19} className="btn-icon" />
                </div>
                <div className="btn-label-group">
                  <span className="btn-label">{act.label}</span>
                  <span className="btn-sublabel">{act.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'chat' && (
        <ChatPanel
          isOpen={true}
          onClose={() => setActiveTab('play')}
          gfName={gfName}
          ayushName={ayushName}
          onAyushReply={onAyushReply}
        />
      )}
    </div>
  );
}
