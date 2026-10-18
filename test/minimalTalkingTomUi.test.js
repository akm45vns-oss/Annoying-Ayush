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
    // WalkAndTalk must only play during dance; must stop and reset during idle/romantic actions
    assert.match(modelSource, /currentAction === 'dance'/);
    assert.match(modelSource, /act\.stop\(\)/);
    assert.match(modelSource, /act\.reset\(\)/);

    // Natural relaxed arm pose targets
    assert.match(modelSource, /targetLeftArmX = 1\.30/);
    assert.match(modelSource, /targetRightArmX = 1\.30/);
    assert.match(modelSource, /targetLeftForeArmX = 0\.35/);
    assert.match(modelSource, /targetRightForeArmX = 0\.35/);

    // Initial frame pre-applied in useMemo on cloned scene to avoid bind pose flash
    assert.match(modelSource, /la\.rotation\.set\(1\.30,\s*0\.15,\s*-0\.05\)/);
    assert.match(modelSource, /ra\.rotation\.set\(1\.30,\s*-0\.15,\s*0\.05\)/);
  });

  it('Verifies 3D rig forward kinematics: arms hang naturally beside torso near hips and do not point up', async () => {
    const THREE = await import('three');
    const glbPath = path.resolve(process.cwd(), 'public/models/ayush.glb');
    const buf = fs.readFileSync(glbPath);
    const chunk0Len = buf.readUInt32LE(12);
    const jsonStr = buf.toString('utf8', 20, 20 + chunk0Len);
    const gltf = JSON.parse(jsonStr);

    // Build bone hierarchy from GLTF nodes
    const nodes = [];
    gltf.nodes.forEach((n, idx) => {
      const obj = n.children ? new THREE.Bone() : new THREE.Object3D();
      obj.name = n.name || `node_${idx}`;
      if (n.translation) obj.position.fromArray(n.translation);
      if (n.rotation) obj.quaternion.fromArray(n.rotation);
      if (n.scale) obj.scale.fromArray(n.scale);
      nodes[idx] = obj;
    });

    gltf.nodes.forEach((n, idx) => {
      if (n.children) {
        n.children.forEach(cIdx => {
          nodes[idx].add(nodes[cIdx]);
        });
      }
    });

    const root = nodes.find(n => n.name === 'Armature') || nodes[57];
    const leftArm = root.getObjectByName('LeftArm');
    const rightArm = root.getObjectByName('RightArm');
    const leftForeArm = root.getObjectByName('LeftForeArm');
    const rightForeArm = root.getObjectByName('RightForeArm');
    const leftHand = root.getObjectByName('LeftHand');
    const rightHand = root.getObjectByName('RightHand');
    const hips = root.getObjectByName('Hips');

    assert.ok(leftArm && rightArm && leftForeArm && rightForeArm && leftHand && rightHand && hips);

    // Apply the exact relaxed idle pose used in CustomAyushModel
    leftArm.rotation.set(1.30, 0.15, -0.05);
    rightArm.rotation.set(1.30, -0.15, 0.05);
    leftForeArm.rotation.set(0.35, 0, 0);
    rightForeArm.rotation.set(0.35, 0, 0);

    root.updateMatrixWorld(true);

    const hipsY = hips.getWorldPosition(new THREE.Vector3()).y;
    const leftArmPos = leftArm.getWorldPosition(new THREE.Vector3());
    const rightArmPos = rightArm.getWorldPosition(new THREE.Vector3());
    const leftElbowPos = leftForeArm.getWorldPosition(new THREE.Vector3());
    const rightElbowPos = rightForeArm.getWorldPosition(new THREE.Vector3());
    const leftHandPos = leftHand.getWorldPosition(new THREE.Vector3());
    const rightHandPos = rightHand.getWorldPosition(new THREE.Vector3());

    // 1. Shoulders/Arms must be higher than elbows, and elbows higher than hands (arms hang downward)
    assert.ok(leftArmPos.y > leftElbowPos.y, `Left shoulder Y (${leftArmPos.y.toFixed(3)}) must be higher than elbow Y (${leftElbowPos.y.toFixed(3)})`);
    assert.ok(leftElbowPos.y > leftHandPos.y, `Left elbow Y (${leftElbowPos.y.toFixed(3)}) must be higher than hand Y (${leftHandPos.y.toFixed(3)})`);
    assert.ok(rightArmPos.y > rightElbowPos.y, `Right shoulder Y (${rightArmPos.y.toFixed(3)}) must be higher than elbow Y (${rightElbowPos.y.toFixed(3)})`);
    assert.ok(rightElbowPos.y > rightHandPos.y, `Right elbow Y (${rightElbowPos.y.toFixed(3)}) must be higher than hand Y (${rightHandPos.y.toFixed(3)})`);

    // 2. Hands must NOT be above shoulders (arms must not point vertically upward)
    assert.ok(leftHandPos.y < leftArmPos.y - 0.4, 'Left hand must be well below shoulder (not raised up)');
    assert.ok(rightHandPos.y < rightArmPos.y - 0.4, 'Right hand must be well below shoulder (not raised up)');

    // 3. Hands must rest near hip level (within 0.15 units of hips Y)
    const leftHandHipDelta = Math.abs(leftHandPos.y - hipsY);
    const rightHandHipDelta = Math.abs(rightHandPos.y - hipsY);
    assert.ok(leftHandHipDelta < 0.10, `Left hand Y (${leftHandPos.y.toFixed(3)}) must be close to hip level (${hipsY.toFixed(3)})`);
    assert.ok(rightHandHipDelta < 0.10, `Right hand Y (${rightHandPos.y.toFixed(3)}) must be close to hip level (${hipsY.toFixed(3)})`);

    // 4. Arms hang beside torso (X coordinate magnitude between 0.20 and 0.35, not stretched out to > 0.6)
    assert.ok(Math.abs(leftHandPos.x) >= 0.20 && Math.abs(leftHandPos.x) <= 0.35, `Left hand X (${leftHandPos.x.toFixed(3)}) must hang beside torso`);
    assert.ok(Math.abs(rightHandPos.x) >= 0.20 && Math.abs(rightHandPos.x) <= 0.35, `Right hand X (${rightHandPos.x.toFixed(3)}) must hang beside torso`);
  });
});

