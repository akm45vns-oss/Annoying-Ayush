import React from 'react';
import { 
  Heart, 
  RotateCcw, 
  Smile, 
  Volume2, 
  VolumeX,
  Music,
  Mail,
  Sparkles,
  Flame,
  Mic
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import VoicePanel from './VoicePanel';

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
  onAmplitude
}) {
  const actions = [
    {
      id: 'boop',
      label: 'Boop!',
      sublabel: 'Nose tap',
      icon: Sparkles,
      color: '#ff6b8b',
      sound: () => soundManager.playBoop(),
    },
    {
      id: 'kiss',
      label: 'Blow Kiss',
      sublabel: 'Mwah! 💋',
      icon: Heart,
      color: '#e91e63',
      sound: () => soundManager.playKiss(),
    },
    {
      id: 'dance',
      label: 'Dance',
      sublabel: 'Groove!',
      icon: Music,
      color: '#8e24aa',
      sound: () => soundManager.playDanceBeat(),
    },
    {
      id: 'laugh',
      label: 'Make Laugh',
      sublabel: 'Giggles',
      icon: Smile,
      color: '#ffa000',
      sound: () => soundManager.playLaugh(),
    },
    {
      id: 'loveNote',
      label: 'Love Note',
      sublabel: 'Affection',
      icon: Mail,
      color: '#00acc1',
      sound: () => soundManager.playChime(),
    },
  ];

  const getMoodLabel = () => {
    if (annoyanceCount >= 5) return '😤 Annoyance: High!';
    if (annoyanceCount >= 3) return '⚡ Teased!';
    if (currentAction === 'dance') return '🕺 Grooving!';
    if (currentAction === 'kiss') return '💋 Sending Love';
    if (currentAction === 'laugh') return '😆 Laughing!';
    if (currentAction === 'hug') return '🧸 Cuddling!';
    if (currentAction === 'surprised') return '😲 Surprised!';
    if (currentAction === 'boop') return '👃 Booped!';
    if (currentAction === 'talking') return '🎙️ Repeating!';
    return '✨ Ready for love';
  };

  return (
    <div className="interaction-menu-container">
      {/* 1. Category Switcher Tabs: Play Actions vs Voice Repeat */}
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
          <span>Play & Tease</span>
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
      </div>

      {/* 2. Secondary Meta Controls Bar */}
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

      {/* 3. Panel Content based on Active Tab */}
      {activeTab === 'play' ? (
        <div className="action-buttons-grid action-buttons-5">
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
                  <Icon size={20} className="btn-icon" />
                </div>
                <div className="btn-label-group">
                  <span className="btn-label">{act.label}</span>
                  <span className="btn-sublabel">{act.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <VoicePanel
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
          onPlaybackStart={onPlaybackStart}
          onPlaybackEnd={onPlaybackEnd}
          onAmplitude={onAmplitude}
          isMuted={isMuted}
        />
      )}
    </div>
  );
}
