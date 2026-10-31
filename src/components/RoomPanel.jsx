import React from 'react';
import { X, Check, Sun, Sunset, Moon, Sparkles } from 'lucide-react';
import { ROOM_THEMES } from '../utils/roomSettings';
import { saveProgression } from '../utils/progressionStorage';
import { soundManager } from '../utils/audioEffects';

export default function RoomPanel({
  isOpen,
  onClose,
  progression,
  onUpdateProgression
}) {
  if (!isOpen) return null;

  const currentTheme = progression.room?.currentTheme || 'studio';
  const currentLighting = progression.room?.currentLighting || 'day';

  const handleSelectTheme = (themeId) => {
    soundManager.playPop();
    const updated = {
      ...progression,
      room: {
        ...progression.room,
        currentTheme: themeId
      }
    };
    saveProgression(updated);
    onUpdateProgression(updated);
  };

  const handleSetLighting = (mode) => {
    soundManager.playPop();
    const updated = {
      ...progression,
      room: {
        ...progression.room,
        currentLighting: mode
      }
    };
    saveProgression(updated);
    onUpdateProgression(updated);
  };

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div 
        className="bottom-sheet-card room-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Room & Environment Customization"
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div className="sheet-title-group">
            <h2 className="sheet-title">Room & Atmosphere 🛋️</h2>
            <div className="sheet-free-badge">
              <Sparkles size={13} />
              <span>100% Free & Unlocked</span>
            </div>
          </div>
          <button 
            type="button" 
            className="sheet-close-btn" 
            onClick={onClose}
            aria-label="Close room settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lighting Mode Presets */}
        <div className="room-section">
          <h3 className="section-label">Atmosphere & Lighting</h3>
          <div className="lighting-preset-pills">
            <button
              type="button"
              className={`lighting-pill ${currentLighting === 'day' ? 'active' : ''}`}
              onClick={() => handleSetLighting('day')}
            >
              <Sun size={15} />
              <span>Daylight</span>
            </button>
            <button
              type="button"
              className={`lighting-pill ${currentLighting === 'sunset' ? 'active' : ''}`}
              onClick={() => handleSetLighting('sunset')}
            >
              <Sunset size={15} />
              <span>Sunset Glow</span>
            </button>
            <button
              type="button"
              className={`lighting-pill ${currentLighting === 'night' ? 'active' : ''}`}
              onClick={() => handleSetLighting('night')}
            >
              <Moon size={15} />
              <span>Starry Night</span>
            </button>
          </div>
        </div>

        {/* Room Themes Grid */}
        <div className="room-section">
          <h3 className="section-label">Room Themes</h3>
          <div className="room-themes-grid">
            {ROOM_THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;

              return (
                <div 
                  key={theme.id} 
                  className={`room-theme-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="theme-color-banner" style={{ background: theme.wallColor }}>
                    <span className="theme-icon">{theme.icon}</span>
                    {isSelected && (
                      <div className="theme-selected-badge">
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                  <div className="theme-info">
                    <h4 className="theme-name">{theme.name}</h4>
                    <p className="theme-desc">{theme.description}</p>
                  </div>

                  <div className="theme-actions">
                    <button
                      type="button"
                      className={`theme-btn ${isSelected ? 'btn-active' : 'btn-apply'}`}
                      onClick={() => handleSelectTheme(theme.id)}
                    >
                      {isSelected ? 'Active Room' : 'Apply'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
