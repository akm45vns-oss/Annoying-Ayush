import React from 'react';
import { Home, Shirt, Gamepad2, Armchair, User } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

export default function BottomNavigation({
  activeNav = 'home',
  onSelectNav = () => {}
}) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
    { id: 'activities', label: 'Games', icon: Gamepad2 },
    { id: 'room', label: 'Room', icon: Armchair },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="bottom-nav-bar" aria-label="Main Navigation">
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                soundManager.playPop();
                onSelectNav(item.id);
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="nav-icon-wrapper">
                <Icon size={20} className="nav-icon" />
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
