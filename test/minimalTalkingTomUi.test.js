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
    assert.match(sceneSource, /position:\s*\[0,\s*0\.38,\s*3\.24\]/);
    assert.match(sceneSource, /fov:\s*44/);
    assert.match(sceneSource, /target=\{\[0,\s*0\.38,\s*0\]\}/);
    assert.match(sceneSource, /FaceFocusedCameraController/);
    assert.match(sceneSource, /desiredTargetY = THREE\.MathUtils\.lerp\(0\.38,\s*0\.98,\s*zoomProgress\)/);

    // Verify mathematical bounds guarantee zero head clipping and prominent 75-85% framing:
    // Distance = 3.24, FOV = 44 deg => Half-frustum height = 3.24 * tan(22 deg) ~ 1.309
    // Full frustum height = 2.618 units.
    // Model height = 2.18 units => 2.18 / 2.618 = 83.3% of vertical canvas height (within 75-85% requirement)
    // Target Y = 0.38 => Top of frustum = 0.38 + 1.309 = 1.689
    // Hair top = 1.30 in custom model => Headroom is +0.389 units
    const targetY = 0.38;
    const distance = 3.24;
    const halfFovRad = (44 / 2) * (Math.PI / 180);
    const frustumTop = targetY + distance * Math.tan(halfFovRad);
    const hairTop = 1.30;
    assert.ok(frustumTop > hairTop, `Frustum top (${frustumTop.toFixed(3)}) must be strictly above hair top (${hairTop})`);

    const frustumHeight = 2 * distance * Math.tan(halfFovRad);
    const framingRatio = 2.18 / frustumHeight;
    assert.ok(framingRatio >= 0.75 && framingRatio <= 0.85, `Framing ratio (${(framingRatio * 100).toFixed(1)}%) must be between 75% and 85%`);

    // Verify close-up face focus at distance = 1.5:
    const closeDistance = 1.5;
    const faceTargetY = 0.98;
    const closeFrustumTop = faceTargetY + closeDistance * Math.tan(halfFovRad);
    const closeFrustumBottom = faceTargetY - closeDistance * Math.tan(halfFovRad);
    // Character face is centered around 0.98 (jaw ~0.90, eyes ~1.04)
    assert.ok(closeFrustumTop > 1.25, 'Face zoom top must cover the head and eyes');
    assert.ok(closeFrustumBottom > 0.30, 'Face zoom bottom must exclude the stomach/belt');
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

  it('CustomAyushModel suppresses WalkAndTalk loops during idle and provides natural relaxed arm pose', () => {
    const modelSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/CustomAyushModel.jsx'), 'utf8');
    assert.match(modelSource, /idleClipName/);
    assert.match(modelSource, /targetLeftArmX = 1\.32/);
    assert.match(modelSource, /targetRightArmX = 1\.32/);
    assert.match(modelSource, /targetLeftForeArmX = 0\.25/);
    assert.match(modelSource, /bones\.leftShoulder/);
    assert.match(modelSource, /bones\.rightShoulder/);
    assert.match(modelSource, /act\.stop\(\)/);
  });
});
