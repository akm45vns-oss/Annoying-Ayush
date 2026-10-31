import React, { useState } from 'react';
import { X, Smartphone, Share, MoreVertical, PlusSquare, Laptop, Download, Check, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function InstallModal({
  isOpen,
  onClose,
  deferredPrompt,
  onPromptSuccess
}) {
  const [platform, setPlatform] = useState(() => {
    if (typeof window === 'undefined') return 'android';
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      return 'ios';
    } else if (/Android/.test(ua)) {
      return 'android';
    }
    return 'desktop';
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    soundManager.playSparkle();
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        if (onPromptSuccess) onPromptSuccess();
        onClose();
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  const handleCopyLink = () => {
    soundManager.playPop();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div 
        className="bottom-sheet-card install-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Install Annoying Ayush App"
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div className="sheet-title-group">
            <h2 className="sheet-title">Install Annoying Ayush 📲</h2>
            <p className="sheet-subtitle">Add to your home screen for full-screen mode & quick access</p>
          </div>
          <button 
            type="button" 
            className="sheet-close-btn" 
            onClick={onClose}
            aria-label="Close install modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* If Chrome beforeinstallprompt is ready, provide direct 1-click install */}
        {deferredPrompt && (
          <div className="install-instant-banner">
            <div className="instant-banner-text">
              <Sparkles size={18} className="instant-sparkle" />
              <div>
                <strong>One-Click Install Ready!</strong>
                <p>Tap below to add Ayush directly to your home screen.</p>
              </div>
            </div>
            <button
              type="button"
              className="instant-install-btn"
              onClick={handleNativeInstall}
            >
              <Download size={16} />
              <span>Install to Home Screen</span>
            </button>
          </div>
        )}

        {/* Platform Selector Tabs */}
        <div className="install-tabs">
          <button
            type="button"
            className={`install-tab-btn ${platform === 'android' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setPlatform('android');
            }}
          >
            <Smartphone size={15} />
            <span>Android</span>
          </button>

          <button
            type="button"
            className={`install-tab-btn ${platform === 'ios' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setPlatform('ios');
            }}
          >
            <Share size={15} />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            className={`install-tab-btn ${platform === 'desktop' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playPop();
              setPlatform('desktop');
            }}
          >
            <Laptop size={15} />
            <span>PC / Mac</span>
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="install-steps-container">
          {platform === 'android' && (
            <div className="install-step-list">
              <div className="install-step-item">
                <div className="step-number">1</div>
                <div className="step-desc">
                  Open this page in <strong>Google Chrome</strong> or your default browser.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">2</div>
                <div className="step-desc">
                  Tap the three dots menu (<MoreVertical size={14} className="inline-icon" />) in the top-right corner.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">3</div>
                <div className="step-desc">
                  Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">4</div>
                <div className="step-desc">
                  Tap <strong>"Install"</strong> — Ayush is now on your home screen! 💕
                </div>
              </div>
            </div>
          )}

          {platform === 'ios' && (
            <div className="install-step-list">
              <div className="install-step-item">
                <div className="step-number">1</div>
                <div className="step-desc">
                  Open this website in <strong>Safari</strong> on your iPhone or iPad.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">2</div>
                <div className="step-desc">
                  Tap the <strong>Share</strong> button (<Share size={14} className="inline-icon" />) in the Safari bottom bar.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">3</div>
                <div className="step-desc">
                  Scroll down the menu and tap <strong>"Add to Home Screen"</strong> (<PlusSquare size={14} className="inline-icon" />).
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">4</div>
                <div className="step-desc">
                  Tap <strong>"Add"</strong> in the top right — launch anytime from your home screen!
                </div>
              </div>
            </div>
          )}

          {platform === 'desktop' && (
            <div className="install-step-list">
              <div className="install-step-item">
                <div className="step-number">1</div>
                <div className="step-desc">
                  Open this page in <strong>Google Chrome</strong>, <strong>Edge</strong>, or <strong>Brave</strong>.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">2</div>
                <div className="step-desc">
                  Look at the right side of your browser's address (URL) bar for the <strong>Install (<Download size={14} className="inline-icon" />)</strong> icon.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">3</div>
                <div className="step-desc">
                  Click <strong>Install</strong> to open Ayush in a dedicated distraction-free window!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Copy Shareable Link Action */}
        <div className="install-footer">
          <button
            type="button"
            className="copy-link-btn"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={15} /> : <Share size={15} />}
            <span>{copied ? 'Link Copied! 💖' : 'Copy Game Link for Phone'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
