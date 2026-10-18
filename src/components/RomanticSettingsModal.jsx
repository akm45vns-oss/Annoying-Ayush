import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Mic,
  Globe
} from 'lucide-react';
import { DEFAULT_SETTINGS, calculateDaysTogether } from '../utils/romanticSettings';
import { soundManager } from '../utils/audioEffects';
import { ayushVoicePack, VOICE_ACTIONS } from '../utils/ayushVoicePack';

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
  const activeBlobUrlRef = useRef(null);


  // Ayush Real Voice Pack local state
  const [recordingAction, setRecordingAction] = useState(null);
  const [playingAction, setPlayingAction] = useState(null);
  const [voicePackRecordings, setVoicePackRecordings] = useState(() => {
    const map = {};
    VOICE_ACTIONS.forEach((a) => {
      map[a.id] = ayushVoicePack.hasCustomVoice(a.id);
    });
    return map;
  });
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startVoiceRecording = async (actionId) => {
    try {
      soundManager.playPop();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      setRecordingAction(actionId);

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        await ayushVoicePack.saveActionVoiceBlob(actionId, blob);
        setVoicePackRecordings((prev) => ({ ...prev, [actionId]: true }));
        setRecordingAction(null);
        soundManager.playSparkle();
      };

      mr.start();
    } catch (err) {
      console.warn('Could not record voice note:', err);
      setRecordingAction(null);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleAudioUpload = async (actionId, file) => {
    if (!file) return;
    try {
      await ayushVoicePack.saveActionVoiceBlob(actionId, file);
      setVoicePackRecordings((prev) => ({ ...prev, [actionId]: true }));
      soundManager.playSparkle();
    } catch (err) {
      console.warn('Audio upload failed:', err);
    }
  };

  const previewVoiceAction = (actionId) => {
    soundManager.playPop();
    setPlayingAction(actionId);
    ayushVoicePack.playActionVoice(actionId, {
      onEnded: () => setPlayingAction(null)
    }).then((played) => {
      if (!played) setPlayingAction(null);
    });
  };

  const deleteVoiceAction = (actionId) => {
    soundManager.playPop();
    ayushVoicePack.deleteActionVoice(actionId);
    setVoicePackRecordings((prev) => ({ ...prev, [actionId]: false }));
  };


  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

          {/* 3. Speech & Language Recognition */}
          <section className="settings-section">
            <h3 className="section-label">
              <Globe size={14} className="label-icon text-purple" />
              <span>Speech & Language Recognition</span>
            </h3>
            <p className="settings-hint-text">Choose your spoken language for hands-free listening:</p>
            <div className="voice-style-options">
              <button
                type="button"
                className={`voice-style-btn ${(formData.recognitionLanguage || 'auto') === 'auto' ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playPop();
                  handleChange('recognitionLanguage', 'auto');
                }}
              >
                <span className="voice-style-emoji">🌐</span>
                <div className="voice-style-text">
                  <span className="voice-style-name">Auto / Multilingual</span>
                  <span className="voice-style-desc">Adapts dynamically to Hindi & Indian English</span>
                </div>
              </button>

              <button
                type="button"
                className={`voice-style-btn ${formData.recognitionLanguage === 'hi-IN' ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playPop();
                  handleChange('recognitionLanguage', 'hi-IN');
                }}
              >
                <span className="voice-style-emoji">🇮🇳</span>
                <div className="voice-style-text">
                  <span className="voice-style-name">Hindi (हिन्दी)</span>
                  <span className="voice-style-desc">Native Devanagari recognition (hi-IN)</span>
                </div>
              </button>

              <button
                type="button"
                className={`voice-style-btn ${formData.recognitionLanguage === 'hinglish' ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playPop();
                  handleChange('recognitionLanguage', 'hinglish');
                }}
              >
                <span className="voice-style-emoji">✨</span>
                <div className="voice-style-text">
                  <span className="voice-style-name">Hinglish</span>
                  <span className="voice-style-desc">Bilingual mixed Hindi & English code-switching</span>
                </div>
              </button>

              <button
                type="button"
                className={`voice-style-btn ${formData.recognitionLanguage === 'en-IN' ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playPop();
                  handleChange('recognitionLanguage', 'en-IN');
                }}
              >
                <span className="voice-style-emoji">🗣️</span>
                <div className="voice-style-text">
                  <span className="voice-style-name">Indian English</span>
                  <span className="voice-style-desc">Optimized for Indian accents & idioms (en-IN)</span>
                </div>
              </button>

              <button
                type="button"
                className={`voice-style-btn ${formData.recognitionLanguage === 'bho-IN' ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playPop();
                  handleChange('recognitionLanguage', 'bho-IN');
                }}
              >
                <span className="voice-style-emoji">🌾</span>
                <div className="voice-style-text">
                  <span className="voice-style-name">Bhojpuri (भोजपुरी)</span>
                  <span className="voice-style-desc">Native Bhojpuri (with graceful Hindi fallback)</span>
                </div>
              </button>
            </div>
            <p className="model-path-note" style={{ marginTop: '8px' }}>
              ⚡ <strong>Recognition Engine:</strong> Browser Web Speech API active. Hindi and Indian English are natively recognized. Bhojpuri uses native browser dialect recognition or falls back gracefully to Hindi.
            </p>
          </section>

          {/* 4. Voice Repetition Engine */}
          <section className="settings-section">
            <h3 className="section-label">
              <Volume2 size={14} className="label-icon text-purple" />
              <span>Voice Repetition Engine</span>
            </h3>
            <div className="active-voice-engine-banner">
              <span className="voice-engine-emoji">🇮🇳</span>
              <div className="voice-engine-details">
                <div className="voice-engine-title-row">
                  <span className="voice-engine-title">Free Indian Male Voice Engine</span>
                  <span className="badge-recorded">✓ Active & Free</span>
                </div>
                <p className="voice-engine-desc">
                  Voice repetition uses high-quality Indian Male speech synthesis (Madhur / Prabhat / Google Indian Male). Zero latency, zero cost, and 100% private offline playback.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Ayush Real Voice Pack (100% Free & Personal) */}
          <section className="settings-section">
            <h3 className="section-label">
              <Mic size={14} className="label-icon text-pink" />
              <span>Ayush's Real Voice Notes (100% Free)</span>
            </h3>
            <p className="settings-hint-text">
              Record short, affectionate voice messages on your phone! When {formData.gfName || 'she'} taps romantic interactions, your real voice will speak to her:
            </p>

            <div className="voice-pack-list">
              {VOICE_ACTIONS.map((action) => {
                const isRecorded = voicePackRecordings[action.id];
                const isRecordingThis = recordingAction === action.id;
                const isPlayingThis = playingAction === action.id;

                return (
                  <div key={action.id} className="voice-pack-item">
                    <div className="voice-pack-header">
                      <div className="voice-pack-title">
                        <span className="voice-pack-emoji">{action.emoji}</span>
                        <div>
                          <strong className="voice-pack-name">{action.label}</strong>
                          <span className="voice-pack-hint">{action.hint}</span>
                        </div>
                      </div>
                      <div className="voice-pack-status-badge">
                        {isRecorded ? (
                          <span className="badge-recorded">✨ Voice Saved</span>
                        ) : (
                          <span className="badge-default">Chime / Default</span>
                        )}
                      </div>
                    </div>

                    <div className="voice-pack-actions">
                      {isRecordingThis ? (
                        <button
                          type="button"
                          className="voice-pack-btn recording"
                          onClick={stopVoiceRecording}
                        >
                          ⏹️ Stop Recording
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="voice-pack-btn"
                          onClick={() => startVoiceRecording(action.id)}
                        >
                          🎙️ {isRecorded ? 'Re-record' : 'Record Voice'}
                        </button>
                      )}

                      <label className="voice-pack-btn secondary" title="Upload audio file (mp3/wav/m4a)">
                        <span>📁 Upload</span>
                        <input
                          type="file"
                          accept="audio/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAudioUpload(action.id, file);
                          }}
                        />
                      </label>

                      {isRecorded && (
                        <>
                          <button
                            type="button"
                            className="voice-pack-btn secondary"
                            onClick={() => previewVoiceAction(action.id)}
                            disabled={isPlayingThis}
                          >
                            {isPlayingThis ? '🔊 Playing...' : '▶️ Test'}
                          </button>
                          <button
                            type="button"
                            className="voice-pack-btn danger"
                            onClick={() => deleteVoiceAction(action.id)}
                            title="Remove custom recording"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="model-path-note" style={{ marginTop: '8px' }}>
              💡 <strong>Zero Cost Forever:</strong> Voice notes are saved directly in browser storage on your device. You can also place <code>kiss.mp3</code>, <code>hug.mp3</code>, etc., into <code>public/audio/ayush/</code> in your repository!
            </p>
          </section>

          {/* 4. 3D Avatar Model Section */}
          <section className="settings-section">
            <h3 className="section-title">
              <Sparkles size={15} className="title-icon" />
              <span>3D Character Avatar</span>
            </h3>

            <div className="avatar-model-config">
              <p className="model-config-hint">
                Active: <strong>{formData.customModelUrl ? 'Custom Model (Previewing)' : 'Standard Chibi Avatar'}</strong>
              </p>
              <div className="model-file-controls">
                <label className="model-upload-btn" title="Select a .glb file to preview in game">
                  <span>📁 Preview .GLB File</span>
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
                          try { URL.revokeObjectURL(activeBlobUrlRef.current); } catch {}
                        }
                        const url = URL.createObjectURL(file);
                        activeBlobUrlRef.current = url;
                        handleChange('customModelUrl', url);
                      }
                    }}
                  />
                </label>
                {formData.customModelUrl && (
                  <button
                    type="button"
                    className="model-reset-btn"
                    onClick={() => {
                      if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
                        try { URL.revokeObjectURL(activeBlobUrlRef.current); } catch {}
                        activeBlobUrlRef.current = null;
                      }
                      handleChange('customModelUrl', '');
                    }}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
              <p className="model-path-note">
                To set your permanent avatar: place your rigged model in <code>public/models/ayush.glb</code>.
              </p>
            </div>
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
