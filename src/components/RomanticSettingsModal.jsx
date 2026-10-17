import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Heart, 
  User, 
  Calendar, 
  Volume2, 
  Sparkles, 
  MessageCircleHeart, 
  RotateCcw,
  Check
} from 'lucide-react';
import { DEFAULT_SETTINGS, calculateDaysTogether } from '../utils/romanticSettings';
import { soundManager } from '../utils/audioEffects';

export default function RomanticSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings
}) {
  const [formData, setFormData] = useState(settings);
  const [prevSettings, setPrevSettings] = useState(settings);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Sync internal state if settings prop changes without cascading effect renders
  if (prevSettings !== settings) {
    setPrevSettings(settings);
    setFormData(settings);
  }

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    soundManager.playPop();
    onSaveSettings(formData);
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    soundManager.playPop();
    setFormData(DEFAULT_SETTINGS);
    onResetSettings();
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 1200);
  };

  const daysTogether = calculateDaysTogether(formData.anniversaryDate);

  return (
    <div className="romantic-modal-backdrop" onClick={onClose}>
      <div 
        className="romantic-modal-card" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="modal-top-bar">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge settings-badge">
              <Settings size={18} />
            </div>
            <div>
              <h2 id="settings-modal-title" className="modal-heading">Personalize Settings</h2>
              <p className="modal-subheading">Customize names, romance & features</p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-icon-btn" 
            onClick={() => {
              soundManager.playPop();
              onClose();
            }}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings Body */}
        <div className="settings-body-scroll">
          {/* 1. Name Personalization */}
          <section className="settings-section">
            <h3 className="section-label">Names & Relationship</h3>

            <div className="input-group">
              <label htmlFor="gf-name-input" className="input-label">
                <Heart size={14} className="label-icon text-pink" />
                <span>Her Name / Nickname</span>
              </label>
              <input
                id="gf-name-input"
                type="text"
                maxLength={24}
                className="romantic-text-input"
                value={formData.gfName}
                onChange={(e) => handleChange('gfName', e.target.value)}
                placeholder="e.g. Babe, My Queen, Jaanu"
              />
            </div>

            <div className="input-group">
              <label htmlFor="ayush-name-input" className="input-label">
                <User size={14} className="label-icon text-purple" />
                <span>Ayush's Display Name</span>
              </label>
              <input
                id="ayush-name-input"
                type="text"
                maxLength={24}
                className="romantic-text-input"
                value={formData.ayushName}
                onChange={(e) => handleChange('ayushName', e.target.value)}
                placeholder="Ayush"
              />
            </div>

            <div className="input-group">
              <label htmlFor="anniversary-date-input" className="input-label">
                <Calendar size={14} className="label-icon text-rose" />
                <span>Anniversary / Special Date (Optional)</span>
              </label>
              <input
                id="anniversary-date-input"
                type="date"
                className="romantic-text-input"
                value={formData.anniversaryDate || ''}
                onChange={(e) => handleChange('anniversaryDate', e.target.value)}
              />
              {daysTogether !== null && (
                <div className="days-counter-pill">
                  💕 Day <strong>{daysTogether}</strong> of our love story!
                </div>
              )}
            </div>
          </section>

          {/* 2. Toggles & Preferences */}
          <section className="settings-section">
            <h3 className="section-label">Preferences & Experience</h3>

            <label className="toggle-row">
              <div className="toggle-info">
                <Volume2 size={16} className="toggle-icon text-green" />
                <div>
                  <span className="toggle-title">Sound Effects</span>
                  <span className="toggle-desc">Cute audio reactions & chimes</span>
                </div>
              </div>
              <input
                type="checkbox"
                className="romantic-checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
              />
            </label>

            <label className="toggle-row">
              <div className="toggle-info">
                <MessageCircleHeart size={16} className="toggle-icon text-pink" />
                <div>
                  <span className="toggle-title">Romantic Messages</span>
                  <span className="toggle-desc">Affectionate dialogues & love notes</span>
                </div>
              </div>
              <input
                type="checkbox"
                className="romantic-checkbox"
                checked={formData.romanticMessagesEnabled}
                onChange={(e) => handleChange('romanticMessagesEnabled', e.target.checked)}
              />
            </label>

            <label className="toggle-row">
              <div className="toggle-info">
                <Sparkles size={16} className="toggle-icon text-yellow" />
                <div>
                  <span className="toggle-title">Floating Visual Effects</span>
                  <span className="toggle-desc">Hearts & ambient studio sparkles</span>
                </div>
              </div>
              <input
                type="checkbox"
                className="romantic-checkbox"
                checked={formData.floatingEffectsEnabled}
                onChange={(e) => handleChange('floatingEffectsEnabled', e.target.checked)}
              />
            </label>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleReset}
            title="Reset to default settings"
          >
            <RotateCcw size={14} />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            className="primary-save-btn"
            onClick={handleSave}
          >
            {showSavedNotification ? (
              <>
                <Check size={16} />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Changes 💕</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
