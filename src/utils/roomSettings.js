/**
 * roomSettings.js
 * 
 * Room themes, ambient lighting presets, and 3D environment configurations.
 */

export const ROOM_THEMES = [
  {
    id: 'studio',
    name: 'Cozy Studio',
    price: 0,
    description: 'Charming pastel studio with soft pink ambient lighting and podium.',
    icon: '🛋️',
    wallColor: '#fff0f5',
    floorColor: '#ffe4e6',
    lighting: 'day'
  },
  {
    id: 'sunset',
    name: 'Sunset Balcony',
    price: 0,
    description: 'Golden hour twilight with warm amber hues and evening breeze.',
    icon: '🌇',
    wallColor: '#ffccbc',
    floorColor: '#d7ccc8',
    lighting: 'sunset'
  },
  {
    id: 'night',
    name: 'Starry Bedroom',
    price: 0,
    description: 'Magical midnight sky with glowing stars and crescent moon lamp.',
    icon: '🌌',
    wallColor: '#1a237e',
    floorColor: '#283593',
    lighting: 'night'
  },
  {
    id: 'garden',
    name: 'Sakura Terrace',
    price: 0,
    description: 'Spring blossom deck with gentle floating flower petals.',
    icon: '🌸',
    wallColor: '#fce4ec',
    floorColor: '#efebe9',
    lighting: 'day'
  }
];

export const LIGHTING_PRESETS = {
  day: {
    ambientColor: '#fff8f0',
    ambientIntensity: 0.9,
    sunColor: '#fff5eb',
    sunIntensity: 1.2,
    sunPosition: [2.5, 4.5, 3.5],
    rimColor: '#ffb3c6',
    rimIntensity: 0.65,
    bounceColor: '#ffd1dc'
  },
  sunset: {
    ambientColor: '#ffab91',
    ambientIntensity: 0.75,
    sunColor: '#ff7043',
    sunIntensity: 1.4,
    sunPosition: [3.5, 2.5, 2.0],
    rimColor: '#ff8a80',
    rimIntensity: 0.85,
    bounceColor: '#ffab91'
  },
  night: {
    ambientColor: '#283593',
    ambientIntensity: 0.45,
    sunColor: '#7986cb',
    sunIntensity: 0.65,
    sunPosition: [1.5, 4.0, 2.0],
    rimColor: '#80deea',
    rimIntensity: 0.9,
    bounceColor: '#5c6bc0'
  }
};

export function getRoomThemeById(themeId) {
  return ROOM_THEMES.find((t) => t.id === themeId) || ROOM_THEMES[0];
}
