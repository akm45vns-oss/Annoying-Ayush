import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Dices } from 'lucide-react';
import { WARDROBE_CATEGORIES, WARDROBE_ITEMS } from '../utils/wardrobeData';
import { saveProgression } from '../utils/progressionStorage';
import { soundManager } from '../utils/audioEffects';

const ITEM_COMMENTS = {
  glasses_cool: "Lookin' cool with these shades! 😎",
  glasses_heart: "Everything looks lovely with heart shades! 💖",
  glasses_nerd: "Do I look smart and studious? 🤓",
  glasses_star: "Disco star! Ready for the spotlight! ⭐",
  glasses_visor: "Cyberpunk mode activated! 🥽",
  glasses_none: "Looking straight into your eyes! 👀",
  hat_crown: "All hail your pampered little prince! 👑",
  hat_flower: "Aw, this cherry blossom is so sweet! 🌸",
  hat_party: "Party time! Let's celebrate! 🎉",
  hat_cap: "Street style! Ready to roll! 🧢",
  hat_beanie: "Soft knit for cozy snuggles! 🧶",
  hat_none: "My signature hairstyle! 💇‍♂️",
  costume_tuxedo: "Ready for our romantic anniversary dinner! 🤵",
  costume_pajamas: "Star pajamas for cozy bedtime cuddles! ✨",
  costume_traditional: "Royal silk kurta for my favorite girl! 🥻",
  costume_none: "Cozy oversized pastel hoodie! 👕",
  accessory_bowtie: "Charming red bowtie on collar! 🎀",
  accessory_scarf: "Warm hugs in fluffy scarf form! 🧣",
  accessory_wings: "Cupid wings! Floating on love! 🪽",
  accessory_none: "Clean and neat! ✨"
};

export default function WardrobePanel({
  isOpen,
  onClose,
  progression,
  onUpdateProgression,
  onSpeechComment
}) {
  const [activeCategory, setActiveCategory] = useState('glasses');

  // Initial wardrobe greeting when opening
  useEffect(() => {
    if (isOpen && onSpeechComment) {
      const equippedGlasses = progression.wardrobe?.equipped?.glasses || 'glasses_cool';
      const initialComment = ITEM_COMMENTS[equippedGlasses] || "Lookin' cool with these shades! 😎";
      onSpeechComment(initialComment);
    }
  }, [isOpen, onSpeechComment, progression.wardrobe?.equipped?.glasses]);

  if (!isOpen) return null;

  const equipped = progression.wardrobe?.equipped || {};

  const currentCategoryKey = activeCategory === 'hats' ? 'hat' :
                            activeCategory === 'glasses' ? 'glasses' :
                            activeCategory === 'costumes' ? 'costume' : 'accessory';

  const items = WARDROBE_ITEMS[activeCategory] || [];

  const handleEquip = (categoryKey, itemId) => {
    soundManager.playPop();
    const currentEquipped = equipped[categoryKey];
    const defaultNoneId = `${categoryKey}_none`;
    const newEquipped = currentEquipped === itemId ? defaultNoneId : itemId;

    const updated = {
      ...progression,
      wardrobe: {
        ...progression.wardrobe,
        equipped: {
          ...equipped,
          [categoryKey]: newEquipped
        }
      }
    };
    saveProgression(updated);
    onUpdateProgression(updated);

    if (onSpeechComment) {
      const comment = ITEM_COMMENTS[newEquipped] || "How do I look? 🥰";
      onSpeechComment(comment);
    }
  };

  const handleRandomize = () => {
    soundManager.playPop();
    const categories = ['hats', 'glasses', 'costumes', 'accessories'];
    const newEquipped = { ...equipped };

    categories.forEach((cat) => {
      const catItems = WARDROBE_ITEMS[cat] || [];
      if (catItems.length > 0) {
        const randIndex = Math.floor(Math.random() * catItems.length);
        const randItem = catItems[randIndex];
        const key = cat === 'hats' ? 'hat' :
                    cat === 'glasses' ? 'glasses' :
                    cat === 'costumes' ? 'costume' : 'accessory';
        newEquipped[key] = randItem.id;
      }
    });

    const updated = {
      ...progression,
      wardrobe: {
        ...progression.wardrobe,
        equipped: newEquipped
      }
    };
    saveProgression(updated);
    onUpdateProgression(updated);

    if (onSpeechComment) {
      onSpeechComment("Ooh! Check out this brand new combo! 🎲✨");
    }
  };

  const handleSaveLook = () => {
    soundManager.playPop();
    if (onSpeechComment) {
      onSpeechComment("I look amazing! Look saved forever! 💖✨");
    }
    onClose();
  };

  const diamondCount = progression.lovePoints || 2450;

  return (
    <div className="wardrobe-backdrop-overlay">
      {/* Invisible dismiss area in top half so Ayush is completely interactive & visible */}
      <div 
        className="wardrobe-top-dismiss-area" 
        onClick={onClose} 
        aria-label="Close wardrobe backdrop" 
      />

      <div 
        className="wardrobe-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ayush's Wardrobe"
      >
        <div className="wardrobe-sheet-handle" />

        {/* Wardrobe Header */}
        <div className="wardrobe-header">
          <div className="wardrobe-title-wrap">
            <h2 className="wardrobe-title">Ayush's Wardrobe 👗</h2>
            <div className="wardrobe-unlocked-badge">
              <Sparkles size={13} className="sparkle-icon" />
              <span>100% Free & Unlocked</span>
            </div>
          </div>
          <button 
            type="button" 
            className="wardrobe-close-btn" 
            onClick={onClose}
            aria-label="Close wardrobe"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Pill Tabs */}
        <div className="wardrobe-tabs-bar">
          {WARDROBE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`wardrobe-category-pill ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                setActiveCategory(cat.id);
              }}
            >
              <span className="pill-icon">{cat.icon}</span>
              <span className="pill-label">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 3-Column Item Grid */}
        <div className="wardrobe-grid-container">
          <div className="wardrobe-items-3col">
            {items.map((item) => {
              const isEquipped = equipped[currentCategoryKey] === item.id;

              return (
                <div 
                  key={item.id} 
                  className={`wardrobe-card ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => handleEquip(currentCategoryKey, item.id)}
                >
                  {/* Top-Right Equipped Check Badge */}
                  {isEquipped && (
                    <div className="wardrobe-equipped-check" title="Equipped">
                      <Check size={11} strokeWidth={3.5} />
                    </div>
                  )}

                  <div className="wardrobe-icon-circle" style={{ backgroundColor: item.color ? item.color + '18' : '#f1f5f9' }}>
                    <span className="wardrobe-card-emoji">{item.icon}</span>
                  </div>

                  <div className="wardrobe-card-text">
                    <span className="wardrobe-item-title">{item.name}</span>
                    <span className="wardrobe-item-subtitle">{item.description}</span>
                  </div>

                  <button
                    type="button"
                    className={`wardrobe-action-btn ${isEquipped ? 'btn-equipped' : 'btn-wear'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquip(currentCategoryKey, item.id);
                    }}
                  >
                    {isEquipped ? 'EQUIPPED' : 'Wear'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action Footer Bar */}
        <div className="wardrobe-footer-bar">
          <div className="wardrobe-diamonds-pill" title="Love Points">
            <span className="diamonds-gem">💎</span>
            <span className="diamonds-value">{diamondCount.toLocaleString()}</span>
          </div>

          <button
            type="button"
            className="wardrobe-random-btn"
            onClick={handleRandomize}
            aria-label="Randomize Outfit"
          >
            <Dices size={16} />
            <span>Random</span>
          </button>

          <button
            type="button"
            className="wardrobe-save-btn"
            onClick={handleSaveLook}
            aria-label="Save Look"
          >
            <Sparkles size={15} />
            <span>Save Look</span>
          </button>
        </div>
      </div>
    </div>
  );
}
