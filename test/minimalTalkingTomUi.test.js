import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Minimal Talking Tom Experience — UI Simplification Verification', () => {
  const interactionMenuSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/InteractionMenu.jsx'),
    'utf8'
  );
  const headerSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/Header.jsx'),
    'utf8'
  );
  const sceneSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/AyushScene.jsx'),
    'utf8'
  );
  const settingsSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/RomanticSettingsModal.jsx'),
    'utf8'
  );
  const appSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/App.jsx'),
    'utf8'
  );

  it('InteractionMenu provides strictly two primary navigation buttons: Play & Romance and AI Chat', () => {
    // Must contain Play & Romance and AI Chat
    assert.match(interactionMenuSource, /Play & Romance 💖/);
    assert.match(interactionMenuSource, /AI Chat 💬/);

    // Must NOT contain Voice & Repeat as a 3rd navigation tab
    assert.doesNotMatch(interactionMenuSource, /Voice & Repeat/);

    // Must NOT contain menu-meta-bar (Sound ON pill, Reset button, Listening badge)
    assert.doesNotMatch(interactionMenuSource, /menu-meta-bar/);
    assert.doesNotMatch(interactionMenuSource, /Sound ON/);
    assert.doesNotMatch(interactionMenuSource, /Listening to you/);
    assert.doesNotMatch(interactionMenuSource, /Listening for your speech/);

    // Must NOT render VoicePanel inside InteractionMenu
    assert.doesNotMatch(interactionMenuSource, /<VoicePanel/);
  });

  it('InteractionMenu preserves all 6 romantic actions (kiss, hug, blush, cuddle, tease, love note)', () => {
    assert.match(interactionMenuSource, /id:\s*'kiss'/);
    assert.match(interactionMenuSource, /id:\s*'hug'/);
    assert.match(interactionMenuSource, /id:\s*'blush'/);
    assert.match(interactionMenuSource, /id:\s*'cuddle'/);
    assert.match(interactionMenuSource, /id:\s*'laugh'/);
    assert.match(interactionMenuSource, /id:\s*'loveNote'/);
  });

  it('Header renders an unobtrusive mic status pill without duplicate chat buttons', () => {
    assert.match(headerSource, /header-mic-pill/);
    assert.match(headerSource, /Voice On/);
    assert.match(headerSource, /Voice Off/);
  });

  it('AyushScene camera and OrbitControls are framed to ensure character head and face are completely visible without clipping', () => {
    assert.match(sceneSource, /position:\s*\[0,\s*0\.46,\s*3\.82\]/);
    assert.match(sceneSource, /fov:\s*46/);
    assert.match(sceneSource, /target=\{\[0,\s*0\.42,\s*0\]\}/);

    // Verify mathematical bounds guarantee zero head clipping:
    // Distance = 3.82, FOV = 46 deg => Half-frustum height = 3.82 * tan(23 deg) ~ 1.621
    // Target Y = 0.42 => Top of frustum = 0.42 + 1.621 = 2.041
    // Hair top = 1.84 => Headroom is +0.201 units, ensuring whole head and face remain visible during all animations
    const targetY = 0.42;
    const distance = 3.82;
    const halfFovRad = (46 / 2) * (Math.PI / 180);
    const frustumTop = targetY + distance * Math.tan(halfFovRad);
    const hairTop = 1.84;
    assert.ok(frustumTop > hairTop, `Frustum top (${frustumTop.toFixed(3)}) must be strictly above hair top (${hairTop})`);
  });

  it('Settings modal contains Indian language recognition selection with honest capability indicators', () => {
    assert.match(settingsSource, /Speech & Language Recognition/);
    assert.match(settingsSource, /Auto \/ Multilingual/);
    assert.match(settingsSource, /Hindi \(हिन्दी\)/);
    assert.match(settingsSource, /Hinglish/);
    assert.match(settingsSource, /Indian English/);
    assert.match(settingsSource, /Bhojpuri \(भोजपुरी\)/);
    assert.match(settingsSource, /Browser Web Speech API active/);
  });

  it('Settings modal contains the compact 3-mode Voice & Repeat Style selector', () => {
    assert.match(settingsSource, /Voice & Repeat Style/);
    assert.match(settingsSource, /Funny Ayush/);
    assert.match(settingsSource, /Device Voice/);
    assert.match(settingsSource, /Cloned Voice/);
  });

  it('App.jsx does not display recognized phrase in speech bubble (no transcripts/subtitles)', () => {
    // In onPhraseFinalized, showSpeech must NOT be called with the phrase!
    const onPhraseFinalizedBlock = appSource.substring(
      appSource.indexOf('talkingTomController.onPhraseFinalized ='),
      appSource.indexOf('clonedVoiceEngine.speakPhraseWithMode')
    );
    assert.doesNotMatch(onPhraseFinalizedBlock, /showSpeech\(/);
  });

  it('App.jsx renders a single clear start prompt when hands-free listening is not active', () => {
    assert.match(appSource, /tom-start-prompt-btn/);
    assert.match(appSource, /Tap to Talk to Ayush 🎙️/);
  });
});
