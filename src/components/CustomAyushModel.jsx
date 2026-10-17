import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

/**
 * CustomAyushModel
 * 
 * High-performance, mobile-optimized loader for personalized rigged 3D models (GLB/GLTF).
 * 
 * Features:
 * - Auto-scaling & Auto-centering: Fits any external model (Blender, Ready Player Me, Mixamo)
 *   proportionately onto the cozy studio podium.
 * - Morph Target / Blend Shape Lip-Sync: Modulates mouthOpen, jawOpen, and viseme shapes with talkingVolume.
 * - Skeletal Animation Integration: Auto-detects and plays bundled animation clips (idle, dance, laugh, etc.).
 * - Procedural Secondary Motion: Natural breathing, head tilting, blinking, and physics bounce.
 * - Multi-Zone Touch Hitboxes: Retains touch reactions for head, cheeks, nose, and body.
 */
export default function CustomAyushModel({
  modelUrl = '/models/ayush.glb',
  currentAction = 'idle',
  onTapPart = () => {},
  setIsHovered = () => {},
  talkingVolume = 0
}) {
  const groupRef = useRef();
  const modelRef = useRef();
  const bonesRef = useRef({});
  const morphMeshesRef = useRef([]);
  const tapPartRef = useRef('body');

  // Load GLTF / GLB model
  const gltf = useGLTF(modelUrl);
  const { scene, animations } = gltf;

  // Clone scene and normalize scale/position
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Auto-normalize scale & position: target height ~1.82 units, base anchored at y = -0.88
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());

    const targetHeight = 1.82;
    const currentHeight = size.y || 1;
    const scaleFactor = targetHeight / currentHeight;

    clone.scale.setScalar(scaleFactor);

    // Recompute after scaling to align feet to y = -0.88
    box.setFromObject(clone);
    const scaledCenter = box.getCenter(new THREE.Vector3());
    const bottomY = box.min.y;

    clone.position.x = -scaledCenter.x;
    clone.position.z = -scaledCenter.z;
    clone.position.y = -0.88 - bottomY;

    return clone;
  }, [scene]);

  // Safely index morph targets & bones outside render
  useEffect(() => {
    if (!clonedScene) return;
    const morphs = [];
    const bones = {};

    clonedScene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        morphs.push(child);
      } else if (child.isBone) {
        const name = child.name;
        if (name === 'Head') bones.head = child;
        else if (name === 'Neck') bones.neck = child;
        else if (name === 'Spine' || name === 'Spine1' || name === 'Spine2') bones.spine = child;
        else if (name === 'LeftArm') bones.leftArm = child;
        else if (name === 'RightArm') bones.rightArm = child;
        else if (name === 'LeftForeArm') bones.leftForeArm = child;
        else if (name === 'RightForeArm') bones.rightForeArm = child;
        else if (name === 'LeftHand') bones.leftHand = child;
        else if (name === 'RightHand') bones.rightHand = child;
        else if (name === 'Hips') bones.hips = child;
      }
    });

    morphMeshesRef.current = morphs;
    bonesRef.current = bones;
  }, [clonedScene]);

  // Setup animations if present
  const { actions, names } = useAnimations(animations, groupRef);

  // Switch animation clips based on currentAction
  useEffect(() => {
    if (!actions || names.length === 0) return;

    // Match action name (case-insensitive substring)
    const findClip = (actionKey) => {
      return names.find((name) => name.toLowerCase().includes(actionKey.toLowerCase()));
    };

    let targetClipName = findClip(currentAction);

    // Fallbacks for common animation naming
    if (!targetClipName) {
      if (currentAction === 'talking') targetClipName = findClip('talk') || findClip('speak');
      else if (currentAction === 'laugh') targetClipName = findClip('laugh') || findClip('happy');
      else if (currentAction === 'kiss') targetClipName = findClip('kiss') || findClip('love');
      else if (currentAction === 'hug') targetClipName = findClip('hug') || findClip('cuddle');
      else if (currentAction === 'dance') targetClipName = findClip('dance') || findClip('jump');
    }

    // Default to idle if no specific clip matched
    if (!targetClipName) {
      targetClipName = findClip('idle') || names[0];
    }

    if (targetClipName && actions[targetClipName]) {
      // Fade out previous clips, fade in target
      Object.keys(actions).forEach((name) => {
        if (name !== targetClipName) {
          actions[name]?.fadeOut(0.3);
        }
      });
      actions[targetClipName]?.reset().fadeIn(0.3).play();
    }
  }, [currentAction, actions, names]);

  // Long press timer tracking for tap vs hug
  const pointerDownTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const handlePointerDown = (e, part) => {
    e.stopPropagation();
    isLongPressRef.current = false;
    tapPartRef.current = part;

    if (pointerDownTimerRef.current) clearTimeout(pointerDownTimerRef.current);
    pointerDownTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onTapPart('longpress');
    }, 520);
  };

  const handlePointerUp = (e, part) => {
    e.stopPropagation();
    if (pointerDownTimerRef.current) {
      clearTimeout(pointerDownTimerRef.current);
      pointerDownTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      onTapPart(part);
    }
    isLongPressRef.current = false;
  };

  const handlePointerCancel = () => {
    if (pointerDownTimerRef.current) {
      clearTimeout(pointerDownTimerRef.current);
      pointerDownTimerRef.current = null;
    }
    isLongPressRef.current = false;
  };

  // Blinking state for blend shapes
  const blinkTimerRef = useRef(0);
  const nextBlinkRef = useRef(3.0);
  const isBlinkingRef = useRef(false);

  // Per-frame procedural animation, lip-sync, and secondary physics
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Natural Blinking Cycle for Morph Targets
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > nextBlinkRef.current) {
      isBlinkingRef.current = true;
      if (blinkTimerRef.current > nextBlinkRef.current + 0.16) {
        isBlinkingRef.current = false;
        blinkTimerRef.current = 0;
        nextBlinkRef.current = 2.5 + Math.random() * 3.5;
      }
    }

    // 2. Drive Morph Targets (Blend Shapes)
    const morphMeshes = morphMeshesRef.current;
    if (morphMeshes.length > 0) {
      const blinkInfluence = isBlinkingRef.current ? 1.0 : 0.0;

      // Calculate speech mouth openness
      let speechMouthOpen = 0;
      if (talkingVolume > 0.05) {
        speechMouthOpen = Math.min(1.0, talkingVolume * 2.4);
      } else if (currentAction === 'talking') {
        speechMouthOpen = Math.abs(Math.sin(t * 16)) * 0.75;
      }

      morphMeshes.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;
        if (!dict || !influences) return;

        // Apply Blinking
        const blinkIndices = [
          dict['eyeBlinkLeft'], dict['eyeBlinkRight'],
          dict['eyesClosed'], dict['blink'], dict['Blink_Left'], dict['Blink_Right']
        ].filter((i) => i !== undefined);

        blinkIndices.forEach((idx) => {
          influences[idx] = THREE.MathUtils.damp(influences[idx], blinkInfluence, 18, delta);
        });

        // Apply Mouth Open / Jaw Open
        const mouthIndices = [
          dict['mouthOpen'], dict['jawOpen'], dict['viseme_aa'],
          dict['viseme_O'], dict['mouth_open'], dict['MouthOpen']
        ].filter((i) => i !== undefined);

        mouthIndices.forEach((idx) => {
          influences[idx] = THREE.MathUtils.damp(influences[idx], speechMouthOpen, 15, delta);
        });

        // Apply Smile for laugh/kiss/happy
        const isSmiling = (currentAction === 'laugh' || currentAction === 'kiss' || currentAction === 'happy') ? 0.85 : 0.0;
        const smileIndices = [
          dict['mouthSmileLeft'], dict['mouthSmileRight'],
          dict['smile'], dict['Smile']
        ].filter((i) => i !== undefined);

        smileIndices.forEach((idx) => {
          influences[idx] = THREE.MathUtils.damp(influences[idx], isSmiling, 10, delta);
        });
      });
    }

    // 3. Procedural Humanoid Armature Animation (Avaturn / Mixamo)
    const bones = bonesRef.current;
    if (bones.leftArm && bones.rightArm && (!names || names.length === 0)) {
      let targetLeftArmZ = 1.15;
      let targetRightArmZ = -1.15;
      let targetLeftArmY = 0;
      let targetRightArmY = 0;
      let targetLeftArmX = 0;
      let targetRightArmX = 0;
      let targetLeftForeArmX = 0.22;
      let targetRightForeArmX = 0.22;
      let targetHeadRotX = 0;
      let targetHeadRotY = 0;
      let targetHeadRotZ = 0;

      // Natural idle sway & breath
      const idleSway = Math.sin(t * 1.2) * 0.04;
      const breathe = Math.sin(t * 2.2) * 0.035;

      targetLeftArmZ += idleSway * 0.5;
      targetRightArmZ += idleSway * 0.5;
      targetHeadRotX = breathe;
      targetHeadRotY = idleSway;

      if (talkingVolume > 0.05 || currentAction === 'talking') {
        // Conversational gestures while speaking
        const speechBeat = Math.sin(t * 12);
        targetHeadRotX = speechBeat * 0.08 + (talkingVolume * 0.1);
        targetHeadRotY = Math.sin(t * 4) * 0.06;
        targetRightArmZ = -0.7 + speechBeat * 0.1;
        targetRightArmX = 0.35;
        targetRightForeArmX = 0.75 + speechBeat * 0.15;
      } else if (currentAction === 'kiss') {
        // Blowing a sweet kiss
        targetHeadRotX = -0.12;
        targetHeadRotY = 0;
        targetRightArmZ = -0.55;
        targetRightArmX = 0.5;
        targetRightArmY = -0.3;
        targetRightForeArmX = 1.25;
      } else if (currentAction === 'hug') {
        // Open arms embrace
        targetLeftArmZ = 0.5;
        targetRightArmZ = -0.5;
        targetLeftArmY = 0.45;
        targetRightArmY = -0.45;
        targetLeftForeArmX = 0.4;
        targetRightForeArmX = 0.4;
      } else if (currentAction === 'laugh') {
        // Giggling shoulder & head bounce
        const giggle = Math.sin(t * 15) * 0.07;
        targetHeadRotX = -0.18 + giggle;
        targetLeftArmZ = 1.05 + giggle;
        targetRightArmZ = -1.05 - giggle;
      } else if (currentAction === 'blush') {
        // Shy head duck
        targetHeadRotX = 0.18;
        targetHeadRotZ = 0.1;
        targetRightArmZ = -0.85;
        targetRightForeArmX = 0.55;
      } else if (currentAction === 'dance') {
        // Bouncy rhythmic dance groove
        const danceStep = Math.sin(t * 8);
        targetHeadRotZ = danceStep * 0.15;
        targetLeftArmZ = 0.8 + danceStep * 0.4;
        targetRightArmZ = -0.8 + danceStep * 0.4;
      } else if (currentAction === 'surprised') {
        targetHeadRotX = -0.22;
        targetLeftArmZ = 0.85;
        targetRightArmZ = -0.85;
      } else if (currentAction === 'annoyed') {
        targetHeadRotY = 0.35;
        targetHeadRotX = -0.06;
      }

      // Smooth bone rotations
      bones.leftArm.rotation.z = THREE.MathUtils.damp(bones.leftArm.rotation.z, targetLeftArmZ, 8, delta);
      bones.rightArm.rotation.z = THREE.MathUtils.damp(bones.rightArm.rotation.z, targetRightArmZ, 8, delta);
      bones.leftArm.rotation.y = THREE.MathUtils.damp(bones.leftArm.rotation.y, targetLeftArmY, 8, delta);
      bones.rightArm.rotation.y = THREE.MathUtils.damp(bones.rightArm.rotation.y, targetRightArmY, 8, delta);
      bones.leftArm.rotation.x = THREE.MathUtils.damp(bones.leftArm.rotation.x, targetLeftArmX, 8, delta);
      bones.rightArm.rotation.x = THREE.MathUtils.damp(bones.rightArm.rotation.x, targetRightArmX, 8, delta);

      if (bones.leftForeArm) {
        bones.leftForeArm.rotation.x = THREE.MathUtils.damp(bones.leftForeArm.rotation.x, targetLeftForeArmX, 8, delta);
      }
      if (bones.rightForeArm) {
        bones.rightForeArm.rotation.x = THREE.MathUtils.damp(bones.rightForeArm.rotation.x, targetRightForeArmX, 8, delta);
      }

      if (bones.head) {
        bones.head.rotation.x = THREE.MathUtils.damp(bones.head.rotation.x, targetHeadRotX, 8, delta);
        bones.head.rotation.y = THREE.MathUtils.damp(bones.head.rotation.y, targetHeadRotY, 8, delta);
        bones.head.rotation.z = THREE.MathUtils.damp(bones.head.rotation.z, targetHeadRotZ, 8, delta);
      }

      if (bones.spine) {
        bones.spine.rotation.x = THREE.MathUtils.damp(bones.spine.rotation.x, breathe * 0.4, 6, delta);
      }
    }

    // 4. Subtle Base Stage Breathing
    if (groupRef.current && (!names || names.length === 0)) {
      const breathe = Math.sin(t * 2.2) * 0.015;
      groupRef.current.position.y = breathe;
    }
  });

  return (
    <group 
      ref={groupRef}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      {/* The Rigged 3D Cloned Model */}
      <primitive ref={modelRef} object={clonedScene} />

      {/* Invisible Interactive Hitboxes covering Head, Cheeks/Face, and Torso */}
      {/* Head hitbox */}
      <mesh
        position={[0, 0.72, 0]}
        visible={false}
        onPointerDown={(e) => handlePointerDown(e, 'head')}
        onPointerUp={(e) => handlePointerUp(e, 'head')}
        onPointerCancel={handlePointerCancel}
      >
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Cheeks/Nose hitbox */}
      <mesh
        position={[0, 0.62, 0.22]}
        visible={false}
        onPointerDown={(e) => handlePointerDown(e, 'cheeks')}
        onPointerUp={(e) => handlePointerUp(e, 'cheeks')}
        onPointerCancel={handlePointerCancel}
      >
        <boxGeometry args={[0.42, 0.24, 0.25]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Torso / Body hitbox */}
      <mesh
        position={[0, 0.05, 0]}
        visible={false}
        onPointerDown={(e) => handlePointerDown(e, 'body')}
        onPointerUp={(e) => handlePointerUp(e, 'body')}
        onPointerCancel={handlePointerCancel}
      >
        <cylinderGeometry args={[0.35, 0.38, 0.85, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// Pre-load default path if available
try {
  useGLTF.preload('/models/ayush.glb');
} catch {}
