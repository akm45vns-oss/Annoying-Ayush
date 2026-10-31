import React, { useState } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function OnboardingModal({
  isOpen,
  onClose,
  gfName = 'Babe',
  ayushName = 'Ayush'
}) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: `Welcome, ${gfName}! 💕`,
      desc: `Meet ${ayushName}, your personal 3D companion who is always here for you, ready to play, listen, repeat what you say, and chat!`,
      icon: '🥰',
      highlight: 'Meet Your Pocket Ayush'
    },
    {
      title: 'Touch & Play',
      desc: 'Tap his head, boop his nose, tickle his belly, or long-press for a warm, cozy hug!',
      icon: '👆',
      highlight: 'Multi-Zone 3D Touch'
    },
    {
      title: 'Voice Repeat (Talking Tom Style)',
      desc: 'Tap the microphone or enable Voice to hear Ayush repeat your speech in real-time in his funny, charming voice!',
      icon: '🎙️',
      highlight: 'Hands-Free Voice Echo'
    },
    {
      title: 'Play & Romance + AI Chat',
      desc: 'Use the two primary buttons to trigger kisses, hugs, cuddles, and love notes, or open AI Chat for witty conversations!',
      icon: '💬',
      highlight: 'Unlimited Fun & Love'
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    soundManager.playPop();
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      soundManager.playFanfare();
      onClose();
    }
  };

  const handleSkip = () => {
    soundManager.playPop();
    onClose();
  };

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div 
        className="bottom-sheet-card onboarding-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome Tutorial"
      >
        <button 
          type="button" 
          className="sheet-close-btn" 
          onClick={onClose}
          aria-label="Skip tutorial"
        >
          <X size={18} />
        </button>

        <div className="onboarding-step-content">
          <div className="onboarding-icon-avatar">{currentStep.icon}</div>
          <span className="onboarding-badge">{currentStep.highlight}</span>
          <h2 className="onboarding-title">{currentStep.title}</h2>
          <p className="onboarding-desc">{currentStep.desc}</p>
        </div>

        {/* Progress Dots */}
        <div className="onboarding-dots">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`dot ${idx === step ? 'active' : ''}`} 
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="onboarding-actions">
          {step < steps.length - 1 ? (
            <>
              <button 
                type="button" 
                className="onboarding-skip-btn" 
                onClick={handleSkip}
              >
                Skip
              </button>
              <button 
                type="button" 
                className="onboarding-next-btn" 
                onClick={handleNext}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <button 
              type="button" 
              className="onboarding-finish-btn" 
              onClick={handleNext}
            >
              <Sparkles size={18} />
              <span>Start Playing with {ayushName}!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
