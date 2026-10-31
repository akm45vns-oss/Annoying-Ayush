import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WARDROBE_CATEGORIES, WARDROBE_ITEMS } from '../src/utils/wardrobeData.js';
import { ROOM_THEMES, LIGHTING_PRESETS, getRoomThemeById } from '../src/utils/roomSettings.js';

describe('Complete Companion Features & 8 Mini-Games Verification', () => {
  it('verifies that all 8 mini-games are registered in ActivityHub.jsx', () => {
    const hubSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ActivityHub.jsx'),
      'utf8'
    );
    const requiredGames = [
      'tap_challenge',
      'memory_match',
      'reaction_test',
      'dance_copy',
      'bubble_pop',
      'rps',
      'guess_sound',
      'quick_quiz'
    ];

    for (const gameId of requiredGames) {
      assert.ok(
        hubSource.includes(`id: '${gameId}'`),
        `ActivityHub should register mini-game '${gameId}'`
      );
    }
  });

  it('verifies that each mini-game component file exists and is imported', () => {
    const activityFiles = [
      'TapChallengeGame.jsx',
      'MemoryMatchGame.jsx',
      'ReactionTestGame.jsx',
      'DanceCopyGame.jsx',
      'BubblePopGame.jsx',
      'RockPaperScissorsGame.jsx',
      'GuessTheSoundGame.jsx',
      'QuickQuizGame.jsx'
    ];

    for (const fileName of activityFiles) {
      const filePath = path.resolve(process.cwd(), 'src/components/activities', fileName);
      assert.ok(fs.existsSync(filePath), `Mini-game component ${fileName} must exist`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('onFinish'), `${fileName} must accept onFinish callback`);
      assert.ok(content.includes('onClose'), `${fileName} must accept onClose callback`);
    }
  });

  it('verifies wardrobe categories and data completeness', () => {
    assert.equal(WARDROBE_CATEGORIES.length, 4);
    assert.deepEqual(
      WARDROBE_CATEGORIES.map((c) => c.id),
      ['hats', 'glasses', 'costumes', 'accessories']
    );

    // Hats check
    assert.ok(WARDROBE_ITEMS.hats.length >= 4);
    assert.ok(WARDROBE_ITEMS.hats.some((h) => h.id === 'hat_crown'));
    assert.ok(WARDROBE_ITEMS.hats.some((h) => h.id === 'hat_flower'));

    // Glasses check
    assert.ok(WARDROBE_ITEMS.glasses.length >= 3);
    assert.ok(WARDROBE_ITEMS.glasses.some((g) => g.id === 'glasses_heart'));

    // Costumes and Accessories
    assert.ok(WARDROBE_ITEMS.costumes.length >= 3);
    assert.ok(WARDROBE_ITEMS.accessories.length >= 3);
  });

  it('verifies room themes and lighting presets', () => {
    assert.ok(ROOM_THEMES.length >= 4);
    assert.ok(ROOM_THEMES.some((t) => t.id === 'studio'));
    assert.ok(ROOM_THEMES.some((t) => t.id === 'sunset'));
    assert.ok(ROOM_THEMES.some((t) => t.id === 'night'));

    const theme = getRoomThemeById('studio');
    assert.equal(theme.id, 'studio');
    assert.ok(theme.wallColor);
    assert.ok(theme.floorColor);

    assert.ok(LIGHTING_PRESETS.day);
    assert.ok(LIGHTING_PRESETS.sunset);
    assert.ok(LIGHTING_PRESETS.night);
  });

  it('verifies that both 3D models implement complete multi-zone hitboxes', () => {
    const glbSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/CustomAyushModel.jsx'),
      'utf8'
    );
    const chibiSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/AyushCharacter.jsx'),
      'utf8'
    );

    const touchZones = ['head', 'body', 'belly', 'hand', 'feet'];

    for (const zone of touchZones) {
      assert.ok(
        glbSource.includes(`'${zone}'`),
        `CustomAyushModel must implement touch hitbox for '${zone}'`
      );
      assert.ok(
        chibiSource.includes(`'${zone}'`),
        `AyushCharacter must implement touch hitbox for '${zone}'`
      );
    }

    // Cheek zone
    assert.ok(
      glbSource.includes("'cheeks'") || glbSource.includes("'cheek'"),
      "CustomAyushModel must implement touch hitbox for cheek"
    );
    assert.ok(
      chibiSource.includes("'cheeks'") || chibiSource.includes("'cheek'"),
      "AyushCharacter must implement touch hitbox for cheek"
    );
  });

  it('verifies that 3D character controllers support all required character action states', () => {
    const glbSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/CustomAyushModel.jsx'),
      'utf8'
    );
    const chibiSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/AyushCharacter.jsx'),
      'utf8'
    );

    const states = [
      'idle',
      'talking',
      'kiss',
      'hug',
      'blush',
      'laugh',
      'surprised',
      'annoyed',
      'dance',
      'sleeping',
      'celebrating',
      'thinking',
      'sad',
      'listening',
      'eating',
      'hurt_comical'
    ];

    for (const action of states) {
      assert.ok(
        glbSource.includes(`'${action}'`),
        `CustomAyushModel must handle '${action}' state`
      );
      assert.ok(
        chibiSource.includes(`'${action}'`),
        `AyushCharacter must handle '${action}' state`
      );
    }
  });

  it('verifies bottom navigation and header progression elements in App.jsx', () => {
    const appSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/App.jsx'),
      'utf8'
    );

    assert.ok(appSource.includes('<BottomNavigation'), 'App.jsx must render BottomNavigation');
    assert.ok(appSource.includes('<WardrobePanel'), 'App.jsx must render WardrobePanel');
    assert.ok(appSource.includes('<ActivityHub'), 'App.jsx must render ActivityHub');
    assert.ok(appSource.includes('<RoomPanel'), 'App.jsx must render RoomPanel');
    assert.ok(appSource.includes('<ProfilePanel'), 'App.jsx must render ProfilePanel');
    assert.ok(appSource.includes('<DailyRewardModal'), 'App.jsx must render DailyRewardModal');
    assert.ok(appSource.includes('<OnboardingModal'), 'App.jsx must render OnboardingModal');
  });
});
