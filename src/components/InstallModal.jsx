import React, { useState } from 'react';
import { X, Smartphone, Share, MoreVertical, PlusSquare, Laptop, Download, Check, Sparkles, FolderArchive, ArrowUpRight } from 'lucide-react';
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
  const [showGuideNotice, setShowGuideNotice] = useState(false);

  if (!isOpen) return null;

  const currentPrompt = deferredPrompt || (typeof window !== 'undefined' ? window.__deferredPrompt : null);
  const isAlreadyInstalled = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  );

  const handleNativeInstall = async () => {
    if (currentPrompt) {
      soundManager.playSparkle();
      currentPrompt.prompt();
      try {
        const choice = await currentPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          if (onPromptSuccess) onPromptSuccess();
          onClose();
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      soundManager.playPop();
      setShowGuideNotice(true);
    }
  };

  const handleDownloadZip = () => {
    soundManager.playSparkle();
    window.open('https://github.com/akm45vns-oss/Annoying-Ayush/archive/refs/heads/main.zip', '_blank');
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
            <h2 className="sheet-title">Install & Download 📲</h2>
            <p className="sheet-subtitle">Add Ayush to your home screen or download offline package</p>
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

        {/* Status / Install Banner */}
        {isAlreadyInstalled ? (
          <div className="install-instant-banner installed">
            <div className="instant-banner-text">
              <Sparkles size={18} className="instant-sparkle" />
              <div>
                <strong>App is Already Installed! 🎉</strong>
                <p>Ayush is running in standalone full-screen mode on your device.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="install-instant-banner">
            <div className="instant-banner-text">
              <Sparkles size={18} className="instant-sparkle" />
              <div>
                <strong>{currentPrompt ? 'One-Click Install Ready!' : 'Fast App Install'}</strong>
                <p>
                  {currentPrompt 
                    ? 'Tap below to add Ayush directly to your device home screen.' 
                    : 'Add Ayush to your home screen or install directly from browser.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="instant-install-btn"
              onClick={handleNativeInstall}
            >
              <Download size={16} />
              <span>{currentPrompt ? 'Install to Home Screen Now' : 'Tap for Install Steps'}</span>
            </button>
            {showGuideNotice && !currentPrompt && (
              <p className="install-guide-notice">
                👉 Follow the quick steps below for your {platform === 'desktop' ? 'browser' : 'device'}!
              </p>
            )}
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
            <span>PC / Mac / Brave</span>
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="install-steps-container">
          {platform === 'android' && (
            <div className="install-step-list">
              <div className="install-step-item">
                <div className="step-number">1</div>
                <div className="step-desc">
                  Open this page in <strong>Google Chrome</strong> or your default mobile browser.
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
                  Tap <strong>"Install"</strong> — Ayush is now saved on your home screen! 💕
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
                  Scroll down the share sheet and tap <strong>"Add to Home Screen"</strong> (<PlusSquare size={14} className="inline-icon" />).
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">4</div>
                <div className="step-desc">
                  Tap <strong>"Add"</strong> in top right — launch full-screen anytime from your home screen!
                </div>
              </div>
            </div>
          )}

          {platform === 'desktop' && (
            <div className="install-step-list">
              <div className="install-step-item">
                <div className="step-number">1</div>
                <div className="step-desc">
                  In <strong>Chrome, Edge, or Brave</strong>, look at the right side of the address bar above.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">2</div>
                <div className="step-desc">
                  Click the <strong>Install App (<Download size={14} className="inline-icon" />)</strong> icon in the address bar.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">3</div>
                <div className="step-desc">
                  Alternatively: Click browser menu (<strong>⋮</strong> or <strong>≡</strong>) ➔ <strong>"Install Annoying Ayush..."</strong>.
                </div>
              </div>
              <div className="install-step-item">
                <div className="step-number">4</div>
                <div className="step-desc">
                  Click <strong>Install</strong> to launch Ayush in a dedicated standalone app window!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: Download Offline ZIP & Copy Link */}
        <div className="install-footer">
          <button
            type="button"
            className="copy-link-btn"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={15} /> : <Share size={15} />}
            <span>{copied ? 'Link Copied! 💖' : 'Copy Game Link for Phone'}</span>
          </button>

          <button
            type="button"
            className="copy-link-btn zip-download-btn"
            onClick={handleDownloadZip}
            title="Download full project ZIP archive"
          >
            <FolderArchive size={15} />
            <span>Download Offline ZIP</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
