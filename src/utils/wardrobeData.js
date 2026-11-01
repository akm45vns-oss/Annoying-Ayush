/**
 * wardrobeData.js
 * 
 * Catalog of cosmetic items, accessories, hats, glasses, and costumes.
 * Compatible with both the 3D GLB character and procedural chibi.
 */

export const WARDROBE_CATEGORIES = [
  { id: 'hats', label: 'Hats & Hair', icon: '👑' },
  { id: 'glasses', label: 'Glasses', icon: '🕶️' },
  { id: 'costumes', label: 'Outfits', icon: '👔' },
  { id: 'accessories', label: 'Accessories', icon: '🎀' }
];

export const WARDROBE_ITEMS = {
  hats: [
    {
      id: 'hat_none',
      name: 'Default Hair',
      category: 'hats',
      price: 0,
      description: 'Natural style',
      icon: '💇‍♂️',
      color: '#3e2723'
    },
    {
      id: 'hat_flower',
      name: 'Blossom Clip',
      category: 'hats',
      price: 0,
      description: 'Pink petal',
      icon: '🌸',
      color: '#ff80ab'
    },
    {
      id: 'hat_crown',
      name: 'Golden Crown',
      category: 'hats',
      price: 0,
      description: 'Little prince',
      icon: '👑',
      color: '#ffd700'
    },
    {
      id: 'hat_party',
      name: 'Party Cone',
      category: 'hats',
      price: 0,
      description: 'Celebration',
      icon: '🎉',
      color: '#ff4081'
    },
    {
      id: 'hat_cap',
      name: 'Backward Cap',
      category: 'hats',
      price: 0,
      description: 'Street style',
      icon: '🧢',
      color: '#29b6f6'
    },
    {
      id: 'hat_beanie',
      name: 'Winter Beanie',
      category: 'hats',
      price: 0,
      description: 'Cozy knit',
      icon: '🧶',
      color: '#ab47bc'
    }
  ],

  glasses: [
    {
      id: 'glasses_none',
      name: 'No Glasses',
      category: 'glasses',
      price: 0,
      description: 'Clear gaze',
      icon: '👀',
      color: 'transparent'
    },
    {
      id: 'glasses_heart',
      name: 'Heart Shades',
      category: 'glasses',
      price: 0,
      description: 'Rose tint',
      icon: '💖',
      color: '#ff4081'
    },
    {
      id: 'glasses_cool',
      name: 'Wayfarer',
      category: 'glasses',
      price: 0,
      description: 'Classic cool',
      icon: '🕶️',
      color: '#212121'
    },
    {
      id: 'glasses_nerd',
      name: 'Round Specs',
      category: 'glasses',
      price: 0,
      description: 'Gold wire',
      icon: '👓',
      color: '#d4af37'
    },
    {
      id: 'glasses_star',
      name: 'Star Shades',
      category: 'glasses',
      price: 0,
      description: 'Disco star',
      icon: '⭐',
      color: '#ffeb3b'
    },
    {
      id: 'glasses_visor',
      name: 'Cyber Visor',
      category: 'glasses',
      price: 0,
      description: 'Neon glow',
      icon: '🥽',
      color: '#00e5ff'
    }
  ],

  costumes: [
    {
      id: 'costume_none',
      name: 'Pastel Hoodie',
      category: 'costumes',
      price: 0,
      description: 'Cozy oversized',
      icon: '👕',
      color: '#f8bbd0'
    },
    {
      id: 'costume_tuxedo',
      name: 'Date Night Tux',
      category: 'costumes',
      price: 0,
      description: 'Dapper dinner',
      icon: '🤵',
      color: '#1a1a24'
    },
    {
      id: 'costume_pajamas',
      name: 'Star Pajamas',
      category: 'costumes',
      price: 0,
      description: 'Midnight silk',
      icon: '✨',
      color: '#3949ab'
    },
    {
      id: 'costume_traditional',
      name: 'Royal Kurta',
      category: 'costumes',
      price: 0,
      description: 'Gold collar',
      icon: '🥻',
      color: '#c2185b'
    }
  ],

  accessories: [
    {
      id: 'accessory_none',
      name: 'None',
      category: 'accessories',
      price: 0,
      description: 'Clean style',
      icon: '✨',
      color: 'transparent'
    },
    {
      id: 'accessory_bowtie',
      name: 'Satin Bowtie',
      category: 'accessories',
      price: 0,
      description: 'Charming red',
      icon: '🎀',
      color: '#e53935'
    },
    {
      id: 'accessory_scarf',
      name: 'Cozy Scarf',
      category: 'accessories',
      price: 0,
      description: 'Fluffy warmth',
      icon: '🧣',
      color: '#ec407a'
    },
    {
      id: 'accessory_wings',
      name: 'Cupid Wings',
      category: 'accessories',
      price: 0,
      description: 'Flutter magic',
      icon: '🪽',
      color: '#ffffff'
    }
  ]
};

export function getWardrobeItemById(itemId) {
  for (const cat of Object.keys(WARDROBE_ITEMS)) {
    const item = WARDROBE_ITEMS[cat].find((i) => i.id === itemId);
    if (item) return item;
  }
  return null;
}
