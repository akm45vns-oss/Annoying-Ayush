import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

/**
 * CustomAyushModel
 * 
 * High-performance, mobile-optimized loader for personalized rigged 3D models (GLB/GLTF).
 * 
 * Features:
 * - Proper SkinnedMesh cloning with SkeletonUtils to ensure skeleton bone bindings deform meshes.
 * - Auto-scaling & Auto-centering: Fits model proportionately onto the cozy studio podium at y = -0.88.
 * - Morph Target / Jaw Lip-Sync: Modulates mouth/jaw opening with talkingVolume & audio energy.
 * - Skeletal Animation Integration: Auto-detects and plays bundled animation clips (e.g. WalkAndTalk).
 * - Head & Face Secondary Motion: Conversational nods, smiling, blushing, and physics bounce.
 * - Multi-Zone Touch Hitboxes: Retains touch reactions for head, cheeks, and body.
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

  // Clone scene with SkeletonUtils so SkinnedMesh bones are bound to the cloned skeleton
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    // Compute accurate bounding box from mesh geometries
    let box = new THREE.Box3();
    let hasGeometry = false;

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry) {
          child.geometry.computeBoundingBox();
          const geomBox = child.geometry.boundingBox.clone();
          child.updateWorldMatrix(true, false);
          geomBox.applyMatrix4(child.matrixWorld);
          box.union(geomBox);
          hasGeometry = true;
        }
      }
    });

    if (!hasGeometry || box.isEmpty()) {
      box.setFromObject(clone);
    }

    const size = box.getSize(new THREE.Vector3());
    const rawHeight = size.y > 0.05 ? size.y : 1;

    // Prominent, mobile-friendly height (~2.18 units tall)
    const targetHeight = 2.18;
    const scaleFactor = targetHeight / rawHeight;
    clone.scale.setScalar(scaleFactor);

    // Recompute bounding box after scaling
    box = new THREE.Box3();
    hasGeometry = false;
    clone.updateMatrixWorld(true);

    clone.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geomBox = child.geometry.boundingBox.clone();
        geomBox.applyMatrix4(child.matrixWorld);
        box.union(geomBox);
        hasGeometry = true;
      }
    });

    if (!hasGeometry || box.isEmpty()) {
      box.setFromObject(clone);
    }

    const center = box.getCenter(new THREE.Vector3());
    const bottomY = box.min.y;

    // Anchor feet directly at podium surface (y = -0.88)
    clone.position.x = -center.x;
    clone.position.z = -center.z;
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
        if (name === 'Head' || name.toLowerCase().includes('head')) bones.head = child;
        else if (name === 'Jaw' || name.toLowerCase().includes('jaw')) bones.jaw = child;
        else if (name === 'Neck' || name.toLowerCase().includes('neck')) bones.neck = child;
        else if (name.includes('Spine') || name === 'Chest' || name.toLowerCase().includes('chest')) bones.spine = child;
        else if (name === 'LeftShoulder' || name.toLowerCase().includes('leftshoulder')) bones.leftShoulder = child;
        else if (name === 'RightShoulder' || name.toLowerCase().includes('rightshoulder')) bones.rightShoulder = child;
        else if (name === 'LeftArm' || name.toLowerCase().includes('leftarm')) bones.leftArm = child;
        else if (name === 'RightArm' || name.toLowerCase().includes('rightarm')) bones.rightArm = child;
        else if (name === 'LeftForeArm' || name === 'LeftElbow' || name.toLowerCase().includes('leftforearm')) bones.leftForeArm = child;
        else if (name === 'RightForeArm' || name === 'RightElbow' || name.toLowerCase().includes('rightforearm')) bones.rightForeArm = child;
        else if (name === 'LeftHand' || name === 'LeftWrist' || name.toLowerCase().includes('lefthand')) bones.leftHand = child;
        else if (name === 'RightHand' || name === 'RightWrist' || name.toLowerCase().includes('righthand')) bones.rightHand = child;
        else if (name === 'Hips' || name.toLowerCase().includes('hips')) bones.hips = child;
      }
    });

    // Establish known natural resting pose immediately on load (arms hanging beside torso, relaxed elbows and shoulders)
    if (bones.leftShoulder) bones.leftShoulder.rotation.set(0, 0, 0);
    if (bones.rightShoulder) bones.rightShoulder.rotation.set(0, 0, 0);
    if (bones.leftArm) bones.leftArm.rotation.set(1.32, 0, 0.05);
    if (bones.rightArm) bones.rightArm.rotation.set(1.32, 0, -0.05);
    if (bones.leftForeArm) bones.leftForeArm.rotation.set(0.25, 0, 0);
    if (bones.rightForeArm) bones.rightForeArm.rotation.set(0.25, 0, 0);

    morphMeshesRef.current = morphs;
    bonesRef.current = bones;
  }, [clonedScene]);

  // Setup animations if present
  const { actions, names } = useAnimations(animations, groupRef);

  // Play animation clips: only play true standing idle clip if bundled;
  // otherwise stop walking/running clips during idle so the character stands naturally!
  useEffect(() => {
    if (!actions || names.length === 0) return;

    // Detect true idle clip if bundled (e.g. idle, stand, breath, waiting)
    const idleClipName = names.find(n => /^(idle|stand|breath|waiting)$/i.test(n) || /(idle|standing)/i.test(n));
    // Detect energetic or walking clip for game events (dance, walk)
    const walkClipName = names.find(n => /walk|talk/i.test(n)) || names[0];

    if (currentAction === 'dance') {
      const activeClip = actions[walkClipName] || (idleClipName ? actions[idleClipName] : null);
      if (activeClip) {
        activeClip.setEffectiveTimeScale(1.4);
        activeClip.reset().fadeIn(0.25).play();
      }
      return () => {
        if (activeClip) activeClip.fadeOut(0.25);
      };
    }

    if (currentAction === 'idle') {
      // If a dedicated idle clip exists, play it gently
      if (idleClipName && actions[idleClipName]) {
        const idleAction = actions[idleClipName];
        idleAction.setEffectiveTimeScale(1.0);
        idleAction.reset().fadeIn(0.3).play();
        return () => {
          idleAction.fadeOut(0.3);
        };
      } else {
        // If no idle clip exists (e.g. only WalkAndTalk is bundled), stop all clips immediately so character stands naturally!
        Object.values(actions).forEach(act => {
          if (act) {
            act.stop();
          }
        });
      }
    } else {
      // For other interactions (kiss, hug, laugh, etc.), stop any background walking clip
      Object.values(actions).forEach(act => {
        if (act && act.isRunning()) {
          act.stop();
        }
      });
    }
  }, [currentAction, actions, names]);

  // Long press timer tracking for tap vs hug
  const pointerDownTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pointerDownTimerRef.current) {
        clearTimeout(pointerDownTimerRef.current);
      }
    };
  }, []);

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

    // 3. Humanoid Armature Animation (Head, Jaw & Procedural Arms/Body)
    const bones = bonesRef.current;
    const isClipRunning = actions && Object.values(actions).some(act => act && act.isRunning());

    // Head nods & emotional tilt (always active, as WalkAndTalk has no head track)
    if (bones.head) {
      let targetHeadRotX = 0;
      let targetHeadRotY = 0;
      let targetHeadRotZ = 0;

      const idleHeadSway = Math.sin(t * 1.5) * 0.03;
      const breatheHead = Math.sin(t * 2.2) * 0.025;

      targetHeadRotX = breatheHead;
      targetHeadRotY = idleHeadSway;

      if (talkingVolume > 0.05 || currentAction === 'talking') {
        const speechBeat = Math.sin(t * 12);
        targetHeadRotX = speechBeat * 0.08 + (talkingVolume * 0.12);
        targetHeadRotY = Math.sin(t * 4) * 0.07;
      } else if (currentAction === 'kiss') {
        targetHeadRotX = -0.12;
      } else if (currentAction === 'laugh') {
        const giggle = Math.sin(t * 15) * 0.08;
        targetHeadRotX = -0.16 + giggle;
      } else if (currentAction === 'blush') {
        targetHeadRotX = 0.18;
        targetHeadRotZ = 0.1;
      } else if (currentAction === 'dance') {
        const danceStep = Math.sin(t * 8);
        targetHeadRotZ = danceStep * 0.14;
      } else if (currentAction === 'surprised') {
        targetHeadRotX = -0.22;
      } else if (currentAction === 'annoyed') {
        targetHeadRotY = 0.35;
        targetHeadRotX = -0.06;
      }

      bones.head.rotation.x = THREE.MathUtils.damp(bones.head.rotation.x, targetHeadRotX, 8, delta);
      bones.head.rotation.y = THREE.MathUtils.damp(bones.head.rotation.y, targetHeadRotY, 8, delta);
      bones.head.rotation.z = THREE.MathUtils.damp(bones.head.rotation.z, targetHeadRotZ, 8, delta);
    }

    // Jaw bone speech modulation
    if (bones.jaw && talkingVolume > 0.05) {
      const extraJaw = Math.min(0.22, talkingVolume * 0.38);
      bones.jaw.rotation.x = THREE.MathUtils.damp(bones.jaw.rotation.x, extraJaw, 15, delta);
    }

    // Procedural Arms/Body when no baked animation clip is actively playing (natural relaxed standing idle)
    if (!isClipRunning && bones.leftArm && bones.rightArm) {
      // Baseline natural resting arm pose:
      // Rotating X by 1.32 lowers arms from horizontal T-pose down beside hips.
      // Rotating ForeArm X by 0.25 provides a natural subtle elbow bend.
      // Rotating Z by +/-0.05 rests hands naturally with slight hip clearance.
      let targetLeftArmX = 1.32;
      let targetRightArmX = 1.32;
      let targetLeftArmZ = 0.05;
      let targetRightArmZ = -0.05;
      let targetLeftArmY = 0;
      let targetRightArmY = 0;
      let targetLeftForeArmX = 0.25;
      let targetRightForeArmX = 0.25;

      const idleArmSway = Math.sin(t * 1.2) * 0.02;
      const breathe = Math.sin(t * 2.2) * 0.035;

      targetLeftArmX += breathe * 0.15 + idleArmSway;
      targetRightArmX += breathe * 0.15 - idleArmSway;

      if (talkingVolume > 0.05 || currentAction === 'talking') {
        const speechBeat = Math.sin(t * 12);
        targetRightArmX = 1.05 + speechBeat * 0.08;
        targetRightArmZ = -0.15;
        targetRightForeArmX = 0.55 + speechBeat * 0.12;
      } else if (currentAction === 'kiss') {
        targetRightArmX = 0.55;
        targetRightArmZ = -0.25;
        targetRightForeArmX = 1.20;
      } else if (currentAction === 'hug') {
        targetLeftArmX = 0.55;
        targetRightArmX = 0.55;
        targetLeftArmZ = 0.35;
        targetRightArmZ = -0.35;
        targetLeftForeArmX = 0.45;
        targetRightForeArmX = 0.45;
      } else if (currentAction === 'laugh') {
        const giggle = Math.sin(t * 15) * 0.04;
        targetLeftArmX = 1.28 + giggle;
        targetRightArmX = 1.28 + giggle;
        targetLeftArmZ = 0.10;
        targetRightArmZ = -0.10;
        targetLeftForeArmX = 0.35;
        targetRightForeArmX = 0.35;
      } else if (currentAction === 'blush') {
        targetRightArmX = 0.65;
        targetRightArmZ = -0.20;
        targetRightForeArmX = 0.85;
      } else if (currentAction === 'dance') {
        const danceStep = Math.sin(t * 8);
        targetLeftArmX = 1.10 + danceStep * 0.3;
        targetRightArmX = 1.10 - danceStep * 0.3;
        targetLeftArmZ = 0.20 + danceStep * 0.15;
        targetRightArmZ = -0.20 - danceStep * 0.15;
        targetLeftForeArmX = 0.40;
        targetRightForeArmX = 0.40;
      } else if (currentAction === 'surprised') {
        targetLeftArmX = 1.10;
        targetRightArmX = 1.10;
        targetLeftArmZ = 0.25;
        targetRightArmZ = -0.25;
        targetLeftForeArmX = 0.45;
        targetRightForeArmX = 0.45;
      }

      bones.leftArm.rotation.x = THREE.MathUtils.damp(bones.leftArm.rotation.x, targetLeftArmX, 8, delta);
      bones.leftArm.rotation.y = THREE.MathUtils.damp(bones.leftArm.rotation.y, targetLeftArmY, 8, delta);
      bones.leftArm.rotation.z = THREE.MathUtils.damp(bones.leftArm.rotation.z, targetLeftArmZ, 8, delta);

      bones.rightArm.rotation.x = THREE.MathUtils.damp(bones.rightArm.rotation.x, targetRightArmX, 8, delta);
      bones.rightArm.rotation.y = THREE.MathUtils.damp(bones.rightArm.rotation.y, targetRightArmY, 8, delta);
      bones.rightArm.rotation.z = THREE.MathUtils.damp(bones.rightArm.rotation.z, targetRightArmZ, 8, delta);

      if (bones.leftForeArm) {
        bones.leftForeArm.rotation.x = THREE.MathUtils.damp(bones.leftForeArm.rotation.x, targetLeftForeArmX, 8, delta);
      }
      if (bones.rightForeArm) {
        bones.rightForeArm.rotation.x = THREE.MathUtils.damp(bones.rightForeArm.rotation.x, targetRightForeArmX, 8, delta);
      }
      if (bones.leftShoulder) {
        bones.leftShoulder.rotation.x = THREE.MathUtils.damp(bones.leftShoulder.rotation.x, 0, 8, delta);
        bones.leftShoulder.rotation.y = THREE.MathUtils.damp(bones.leftShoulder.rotation.y, 0, 8, delta);
        bones.leftShoulder.rotation.z = THREE.MathUtils.damp(bones.leftShoulder.rotation.z, 0, 8, delta);
      }
      if (bones.rightShoulder) {
        bones.rightShoulder.rotation.x = THREE.MathUtils.damp(bones.rightShoulder.rotation.x, 0, 8, delta);
        bones.rightShoulder.rotation.y = THREE.MathUtils.damp(bones.rightShoulder.rotation.y, 0, 8, delta);
        bones.rightShoulder.rotation.z = THREE.MathUtils.damp(bones.rightShoulder.rotation.z, 0, 8, delta);
      }
      if (bones.spine) {
        bones.spine.rotation.x = THREE.MathUtils.damp(bones.spine.rotation.x, breathe * 0.4, 6, delta);
      }
    }

    // 4. Subtle Base Stage Breathing (when standing idle)
    if (groupRef.current && !isClipRunning) {
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
        position={[0, 1.08, 0.04]}
        visible={false}
        onPointerDown={(e) => handlePointerDown(e, 'head')}
        onPointerUp={(e) => handlePointerUp(e, 'head')}
        onPointerCancel={handlePointerCancel}
      >
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Cheeks/Nose hitbox */}
      <mesh
        position={[0, 0.98, 0.16]}
        visible={false}
        onPointerDown={(e) => handlePointerDown(e, 'cheeks')}
        onPointerUp={(e) => handlePointerUp(e, 'cheeks')}
        onPointerCancel={handlePointerCancel}
      >
        <boxGeometry args={[0.3, 0.18, 0.18]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Torso / Body hitbox */}
      <mesh
        position={[0, 0.38, 0]}
        visible={false}
        onPointerDown={(e) => handlePointerDown(e, 'body')}
        onPointerUp={(e) => handlePointerUp(e, 'body')}
        onPointerCancel={handlePointerCancel}
      >
        <cylinderGeometry args={[0.32, 0.35, 0.75, 12]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// Pre-load default path if available
try {
  useGLTF.preload('/models/ayush.glb');
} catch {}
