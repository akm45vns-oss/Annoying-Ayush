import React, { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { WARDROBE_CATEGORIES, WARDROBE_ITEMS } from '../utils/wardrobeData';
import { saveProgression } from '../utils/progressionStorage';
import { soundManager } from '../utils/audioEffects';

export default function WardrobePanel({
  isOpen,
  onClose,
  progression,
  onUpdateProgression
}) {
  const [activeCategory, setActiveCategory] = useState('hats');

  if (!isOpen) return null;

  const equipped = progression.wardrobe?.equipped || {};

  const handleEquip = (categoryKey, itemId) => {
    soundManager.playPop();
    const currentEquipped = equipped[categoryKey];
    const newEquipped = currentEquipped === itemId ? (categoryKey === 'hats' ? 'hat_none' : `${categoryKey}_none`) : itemId;

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
  };

  const currentCategoryKey = activeCategory === 'hats' ? 'hat' :
                            activeCategory === 'glasses' ? 'glasses' :
                            activeCategory === 'costumes' ? 'costume' : 'accessory';

  const items = WARDROBE_ITEMS[activeCategory] || [];

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose}>
      <div 
        className="bottom-sheet-card wardrobe-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wardrobe & Customization"
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div className="sheet-title-group">
            <h2 className="sheet-title">Ayush's Wardrobe 👗</h2>
            <div className="sheet-coin-badge free-badge">
              <Sparkles size={13} />
              <span>100% Free & Unlocked</span>
            </div>
          </div>
          <button 
            type="button" 
            className="sheet-close-btn" 
            onClick={onClose}
            aria-label="Close wardrobe"
          >
            <X size={20} />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="wardrobe-tabs">
          {WARDROBE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`wardrobe-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                setActiveCategory(cat.id);
              }}
            >
              <span className="tab-icon">{cat.icon}</span>
              <span className="tab-label">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Item Grid */}
        <div className="wardrobe-grid">
          {items.map((item) => {
            const isEquipped = equipped[currentCategoryKey] === item.id;

            return (
              <div 
                key={item.id} 
                className={`wardrobe-item-card ${isEquipped ? 'equipped' : ''}`}
              >
                <div className="item-icon-wrap" style={{ backgroundColor: item.color + '22' }}>
                  <span className="item-emoji">{item.icon}</span>
                  {isEquipped && (
                    <div className="equipped-badge" title="Currently equipped">
                      <Check size={14} />
                    </div>
                  )}
                </div>

                <div className="item-info">
                  <h4 className="item-name">{item.name}</h4>
                  <p className="item-desc">{item.description}</p>
                </div>

                <div className="item-actions">
                  <button
                    type="button"
                    className={`item-action-btn ${isEquipped ? 'btn-equipped' : 'btn-equip'}`}
                    onClick={() => handleEquip(currentCategoryKey, item.id)}
                  >
                    {isEquipped ? 'Equipped' : 'Wear'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
