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
  Globe,
  Sliders,
  Shield,
  HelpCircle,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DEFAULT_SETTINGS, calculateDaysTogether } from '../utils/romanticSettings';
import { soundManager } from '../utils/audioEffects';
import { ayushVoicePack, VOICE_ACTIONS } from '../utils/ayushVoicePack';

export default function RomanticSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings,
  onReplayTutorial = () => {},
  onClearChat = () => {},
  canInstall = false,
  onInstallApp = () => {}
}) {
  const [activeTab, setActiveTab] = useState('couple'); // 'couple' | 'audio' | 'more'
  const [showVoicePack, setShowVoicePack] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);

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

        {/* Clean 3-Tab Switcher */}
        <div className="settings-nav-tabs">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'couple' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('couple');
            }}
          >
            <Heart size={14} />
            <span>Couple 💕</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('audio');
            }}
          >
            <Mic size={14} />
            <span>Sound & Voice 🎙️</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'more' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setActiveTab('more');
            }}
          >
            <Settings size={14} />
            <span>App & More ⚙️</span>
          </button>
        </div>

        {/* Settings Body */}
        <div className="settings-body-scroll">
          {/* TAB 1: COUPLE & NAMES */}
          {activeTab === 'couple' && (
            <div className="settings-tab-content">
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

              <section className="settings-section">
                <h3 className="section-label">Romance Messages</h3>
                <label className="toggle-row">
                  <div className="toggle-info">
                    <MessageCircleHeart size={16} className="toggle-icon text-pink" />
                    <div>
                      <span className="toggle-title">Romantic Dialogues</span>
                      <span className="toggle-desc">Affectionate sweet dialogues & love toasts</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="romantic-checkbox"
                    checked={formData.romanticMessagesEnabled}
                    onChange={(e) => handleChange('romanticMessagesEnabled', e.target.checked)}
                  />
                </label>
              </section>
            </div>
          )}

          {/* TAB 2: SOUND & VOICE */}
          {activeTab === 'audio' && (
            <div className="settings-tab-content">
              {/* Audio Levels & Sound Toggle */}
              <section className="settings-section">
                <h3 className="section-label">Sound & Volume</h3>

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

                <div className="settings-subsection">
                  <span className="subsection-title">
                    <Sliders size={14} className="label-icon text-green" />
                    <span>Audio Levels</span>
                  </span>

                  <div className="slider-row">
                    <div className="slider-label-group">
                      <span>Master Volume</span>
                      <span className="slider-val">{Math.round((formData.masterVolume ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      className="volume-slider"
                      value={formData.masterVolume ?? 1.0}
                      onChange={(e) => handleChange('masterVolume', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="slider-row">
                    <div className="slider-label-group">
                      <span>Character Voice</span>
                      <span className="slider-val">{Math.round((formData.voiceVolume ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      className="volume-slider"
                      value={formData.voiceVolume ?? 1.0}
                      onChange={(e) => handleChange('voiceVolume', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="slider-row">
                    <div className="slider-label-group">
                      <span>Sound Effects</span>
                      <span className="slider-val">{Math.round((formData.sfxVolume ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      className="volume-slider"
                      value={formData.sfxVolume ?? 1.0}
                      onChange={(e) => handleChange('sfxVolume', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </section>

              {/* Speech Recognition */}
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

              {/* Voice Repetition Engine */}
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

              {/* Collapsible: Ayush Real Voice Pack */}
              <div className="settings-accordion-card">
                <button
                  type="button"
                  className="settings-accordion-trigger"
                  onClick={() => setShowVoicePack(!showVoicePack)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mic size={15} className="text-pink" />
                    <span>Ayush's Real Voice Notes (Optional)</span>
                  </div>
                  {showVoicePack ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showVoicePack && (
                  <div className="settings-accordion-content">
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APP & MORE */}
          {activeTab === 'more' && (
            <div className="settings-tab-content">
              {/* Visuals & Graphics */}
              <section className="settings-section">
                <h3 className="section-label">Visuals & Performance</h3>

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

                <label className="toggle-row">
                  <div className="toggle-info">
                    <div>
                      <span className="toggle-title">Captions</span>
                      <span className="toggle-desc">Show speech subtitles during voice repeat</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="romantic-checkbox"
                    checked={!!formData.captionsEnabled}
                    onChange={(e) => handleChange('captionsEnabled', e.target.checked)}
                  />
                </label>

                <label className="toggle-row">
                  <div className="toggle-info">
                    <div>
                      <span className="toggle-title">Reduced Motion</span>
                      <span className="toggle-desc">Minimizes spring bouncing & camera motion</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="romantic-checkbox"
                    checked={!!formData.reducedMotion}
                    onChange={(e) => handleChange('reducedMotion', e.target.checked)}
                  />
                </label>

                <div className="settings-subsection">
                  <span className="subsection-title">Graphics Quality</span>
                  <div className="graphics-presets-row">
                    {['low', 'balanced', 'high'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={`quality-btn ${(formData.graphicsQuality || 'high') === q ? 'active' : ''}`}
                        onClick={() => {
                          soundManager.playPop();
                          handleChange('graphicsQuality', q);
                        }}
                      >
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Privacy & App Actions */}
              <section className="settings-section">
                <h3 className="section-title">
                  <Shield size={15} className="title-icon text-green" />
                  <span>Privacy & App Actions</span>
                </h3>

                <div className="privacy-info-card">
                  <p className="privacy-text">
                    🔒 <strong>100% Client-Side Privacy:</strong> Microphone speech recognition is processed locally in real-time. No recordings are ever sent to remote servers.
                  </p>
                </div>

                <div className="data-actions-row">
                  {canInstall && (
                    <button
                      type="button"
                      className="action-pill-btn install-app-btn"
                      onClick={() => {
                        soundManager.playSparkle();
                        onInstallApp();
                      }}
                      title="Install Annoying Ayush to phone home screen"
                    >
                      <Download size={14} />
                      <span>Install App 📲</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="action-pill-btn tutorial-btn"
                    onClick={() => {
                      soundManager.playPop();
                      onReplayTutorial();
                      onClose();
                    }}
                  >
                    <HelpCircle size={14} />
                    <span>Replay Tutorial</span>
                  </button>

                  <button
                    type="button"
                    className="action-pill-btn clear-chat-btn"
                    onClick={() => {
                      soundManager.playPop();
                      onClearChat();
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Clear Chat History</span>
                  </button>
                </div>
              </section>

              {/* Collapsible: Custom 3D Model (.glb) */}
              <div className="settings-accordion-card">
                <button
                  type="button"
                  className="settings-accordion-trigger"
                  onClick={() => setShowCustomModel(!showCustomModel)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={15} className="title-icon text-purple" />
                    <span>Custom 3D Model File (Advanced)</span>
                  </div>
                  {showCustomModel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showCustomModel && (
                  <div className="settings-accordion-content">
                    <div className="avatar-model-config">
                      <p className="model-config-hint">
                        Active: <strong>{formData.customModelUrl ? 'Custom Model (Previewing)' : 'Standard Rigged Model'}</strong>
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
                        Permanent custom model file: place in <code>public/models/ayush.glb</code>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
