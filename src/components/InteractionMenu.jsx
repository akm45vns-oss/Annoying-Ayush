import React from 'react';
import { 
  Heart, 
  RotateCcw, 
  Smile, 
  Volume2, 
  VolumeX,
  Mail,
  Sparkles,
  Flame,
  Mic,
  HeartHandshake,
  Moon,
  MessageCircle
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import VoicePanel from './VoicePanel';
import ChatPanel from './ChatPanel';

export default function InteractionMenu({
  onTriggerAction,
  onReset,
  currentAction,
  isMuted,
  onToggleMute,
  annoyanceCount = 0,
  activeTab = 'play',
  setActiveTab = () => {},
  voiceMode,
  setVoiceMode,
  onPlaybackStart,
  onPlaybackEnd,
  onAmplitude,
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

  const getMoodLabel = () => {
    if (activeTab === 'chat') return '💬 Chatting with you';
    if (annoyanceCount >= 5) return '😤 Annoyance: High!';
    if (annoyanceCount >= 3) return '⚡ Teased!';
    if (currentAction === 'kiss') return '💋 Sending Kisses';
    if (currentAction === 'hug') return '🧸 Big Warm Hug';
    if (currentAction === 'blush') return '😳 Blushing Pink';
    if (currentAction === 'cuddle') return '🌸 Cozy Snuggles';
    if (currentAction === 'laugh') return '😆 Giggling!';
    if (currentAction === 'dance') return '🕺 Grooving!';
    if (currentAction === 'surprised') return '😲 Surprised!';
    if (currentAction === 'boop') return '👃 Booped!';
    if (currentAction === 'talking') return '🎙️ Speaking!';
    return '✨ Ready for love';
  };

  return (
    <div className={`interaction-menu-container ${activeTab === 'chat' ? 'chat-active' : ''}`}>
      {/* 1. Category Switcher Tabs: Play, Voice Repeat, AI Chat */}
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
          className={`nav-tab-btn ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playPop();
            setActiveTab('voice');
          }}
        >
          <Mic size={14} />
          <span>Voice & Repeat 🎙️</span>
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

      {/* 2. Secondary Meta Controls Bar (Hidden in chat tab to maximize message reading area) */}
      {activeTab !== 'chat' && (
        <div className="menu-meta-bar">
          <button 
            type="button" 
            className={`meta-button ${!isMuted ? 'sound-active' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? "Muted" : "Sound ON"}</span>
          </button>

          <span className={`meta-badge ${annoyanceCount >= 3 ? 'annoyed-badge' : ''}`}>
            {annoyanceCount >= 3 && <Flame size={12} className="flame-icon" />}
            {getMoodLabel()}
          </span>

          <button 
            type="button" 
            className="meta-button reset-btn"
            onClick={() => {
              soundManager.playPop();
              onReset();
            }}
            title="Reset to neutral idle"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* 3. Panel Content based on Active Tab */}
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

      {activeTab === 'voice' && (
        <VoicePanel
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
          onPlaybackStart={onPlaybackStart}
          onPlaybackEnd={onPlaybackEnd}
          onAmplitude={onAmplitude}
          isMuted={isMuted}
        />
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
