import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural 3D Cartoon Ayush Character
 * Supports Idle, Blinking, Gaze wandering, Surprised, Annoyed, Laugh, Dance, Kiss, Happy, Hug, and Tap reactions.
 */
export default function AyushCharacter({ 
  currentAction = 'idle', 
  onTapPart = () => {},
  isHovered = false,
  setIsHovered = () => {},
  talkingVolume = 0
}) {
  const groupRef = useRef();
  const headRef = useRef();
  const bodyRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const mouthRef = useRef();
  const leftEyeIrisRef = useRef();
  const rightEyeIrisRef = useRef();
  const leftEyelidRef = useRef();
  const rightEyelidRef = useRef();
  const leftEyebrowRef = useRef();
  const rightEyebrowRef = useRef();
  const leftBlushRef = useRef();
  const rightBlushRef = useRef();
  const noseRef = useRef();

  // Natural Blinking Timer (Ref based for 60fps performance)
  const isBlinkingRef = useRef(false);
  const blinkTimerRef = useRef(0);
  const nextBlinkRef = useRef(3.0);

  // Natural Eye Gaze Saccades (shifts eyes looking left, center, right periodically)
  const gazeTimerRef = useRef(0);
  const nextGazeRef = useRef(2.5);
  const gazeTargetRef = useRef({ x: 0, y: 0 });
  const currentGazeRef = useRef({ x: 0, y: 0 });

  // Reaction spring physics
  const reactionTimeRef = useRef(0);
  const bounceIntensityRef = useRef(0);
  const tapPartRef = useRef('body');

  // Long press timer tracking
  const pointerDownTimerRef = useRef(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    if (currentAction !== 'idle') {
      bounceIntensityRef.current = 1.0;
      reactionTimeRef.current = 0;
    }
  }, [currentAction]);

  // Pointer event handlers with long press detection
  const handlePointerDown = (e, part) => {
    e.stopPropagation();
    isLongPressRef.current = false;
    tapPartRef.current = part;

    // Start 500ms long press timer for hug reaction
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
    // If it was not a long press, trigger tap
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

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Natural Blinking Cycle
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > nextBlinkRef.current) {
      isBlinkingRef.current = true;
      if (blinkTimerRef.current > nextBlinkRef.current + 0.13) {
        isBlinkingRef.current = false;
        blinkTimerRef.current = 0;
        nextBlinkRef.current = 2.4 + Math.random() * 3.6;
      }
    }

    // 2. Eye Gaze Wander (Saccades)
    gazeTimerRef.current += delta;
    if (gazeTimerRef.current > nextGazeRef.current) {
      gazeTimerRef.current = 0;
      nextGazeRef.current = 2.0 + Math.random() * 3.0;
      // 60% chance look forward, 40% chance slight glance left/right/up
      if (Math.random() < 0.6) {
        gazeTargetRef.current = { x: 0, y: 0 };
      } else {
        gazeTargetRef.current = {
          x: (Math.random() - 0.5) * 0.025,
          y: (Math.random() - 0.5) * 0.015
        };
      }
    }

    currentGazeRef.current.x = THREE.MathUtils.damp(
      currentGazeRef.current.x,
      gazeTargetRef.current.x,
      6,
      delta
    );
    currentGazeRef.current.y = THREE.MathUtils.damp(
      currentGazeRef.current.y,
      gazeTargetRef.current.y,
      6,
      delta
    );

    if (leftEyeIrisRef.current && rightEyeIrisRef.current) {
      leftEyeIrisRef.current.position.x = currentGazeRef.current.x;
      leftEyeIrisRef.current.position.y = currentGazeRef.current.y;
      rightEyeIrisRef.current.position.x = currentGazeRef.current.x;
      rightEyeIrisRef.current.position.y = currentGazeRef.current.y;
    }

    // Eyelid targets based on action
    let targetEyelid = isBlinkingRef.current ? 1.0 : 0.05;
    if (currentAction === 'kiss' || currentAction === 'hug' || currentAction === 'cuddle') {
      targetEyelid = 0.85; // gently closed / dreamy eyes
    } else if (currentAction === 'blush') {
      targetEyelid = 0.65; // shy bashful eyes
    } else if (currentAction === 'surprised') {
      targetEyelid = 0.0; // wide open
    } else if (currentAction === 'laugh') {
      targetEyelid = 0.55; // happy anime smiling crescents
    }

    if (leftEyelidRef.current && rightEyelidRef.current) {
      leftEyelidRef.current.scale.y = THREE.MathUtils.damp(
        leftEyelidRef.current.scale.y,
        targetEyelid,
        14,
        delta
      );
      rightEyelidRef.current.scale.y = THREE.MathUtils.damp(
        rightEyelidRef.current.scale.y,
        targetEyelid,
        14,
        delta
      );
    }

    // 3. Eyebrows & Mouth Targets based on Action
    let targetEyebrowY = 0.19;
    let targetEyebrowRot = 0.08;
    let targetMouthScaleX = 1.0;
    let targetMouthScaleY = 1.0;
    let targetMouthScaleZ = 1.0;
    let targetBlushOpacity = 0.65;

    // Real-time audio lip synchronization from talking voice
    if (talkingVolume > 0.05) {
      targetMouthScaleY = 1.0 + talkingVolume * 2.2;
      targetMouthScaleX = 1.0 + talkingVolume * 0.4;
      targetMouthScaleZ = 1.0 + talkingVolume * 0.8;
      targetEyebrowY = 0.22 + talkingVolume * 0.04;
    } else if (currentAction === 'surprised') {
      targetEyebrowY = 0.24;
      targetEyebrowRot = 0.22;
      targetMouthScaleX = 0.8;
      targetMouthScaleY = 1.5;
    } else if (currentAction === 'annoyed') {
      targetEyebrowY = 0.15;
      targetEyebrowRot = -0.22; // furrowed brows
      targetMouthScaleX = 1.1;
      targetMouthScaleY = 0.4; // pouty line
    } else if (currentAction === 'laugh') {
      targetEyebrowY = 0.21;
      targetEyebrowRot = 0.12;
      targetMouthScaleX = 1.35;
      targetMouthScaleY = 1.45;
    } else if (currentAction === 'kiss' || currentAction === 'hug') {
      targetBlushOpacity = 0.95; // extra blush
      targetMouthScaleX = 0.6;
      targetMouthScaleY = 0.7;
      targetMouthScaleZ = 1.5; // pucker
    } else if (currentAction === 'blush') {
      targetBlushOpacity = 1.0;
      targetEyebrowY = 0.17;
      targetEyebrowRot = 0.04;
      targetMouthScaleX = 0.85;
      targetMouthScaleY = 0.75;
    } else if (currentAction === 'cuddle') {
      targetBlushOpacity = 0.9;
      targetEyebrowY = 0.19;
      targetMouthScaleX = 0.95;
      targetMouthScaleY = 0.9;
    } else if (currentAction === 'boop') {
      targetBlushOpacity = 0.9;
      targetEyebrowY = 0.22;
    }

    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      leftEyebrowRef.current.position.y = THREE.MathUtils.damp(leftEyebrowRef.current.position.y, targetEyebrowY, 10, delta);
      rightEyebrowRef.current.position.y = THREE.MathUtils.damp(rightEyebrowRef.current.position.y, targetEyebrowY, 10, delta);
      leftEyebrowRef.current.rotation.z = THREE.MathUtils.damp(leftEyebrowRef.current.rotation.z, -targetEyebrowRot, 10, delta);
      rightEyebrowRef.current.rotation.z = THREE.MathUtils.damp(rightEyebrowRef.current.rotation.z, targetEyebrowRot, 10, delta);
    }

    if (mouthRef.current) {
      mouthRef.current.scale.x = THREE.MathUtils.damp(mouthRef.current.scale.x, targetMouthScaleX, 10, delta);
      mouthRef.current.scale.y = THREE.MathUtils.damp(mouthRef.current.scale.y, targetMouthScaleY, 10, delta);
      mouthRef.current.scale.z = THREE.MathUtils.damp(mouthRef.current.scale.z, targetMouthScaleZ, 10, delta);
    }

    if (leftBlushRef.current && rightBlushRef.current) {
      leftBlushRef.current.material.opacity = THREE.MathUtils.damp(leftBlushRef.current.material.opacity, targetBlushOpacity, 8, delta);
      rightBlushRef.current.material.opacity = THREE.MathUtils.damp(rightBlushRef.current.material.opacity, targetBlushOpacity, 8, delta);
    }

    // 4. Base Idle Breathing & Sway
    const breathe = Math.sin(t * 2.2) * 0.035;
    const sway = Math.sin(t * 1.1) * 0.02;

    let targetBodyY = 0.95 + breathe;
    let targetBodyRotZ = sway * 0.4;
    let targetHeadY = 1.95 + breathe * 1.2;
    let targetHeadRotZ = -sway * 0.7;
    let targetHeadRotX = Math.sin(t * 1.5) * 0.025;
    let targetHeadRotY = 0;

    let targetLeftArmRotX = Math.sin(t * 1.8) * 0.06;
    let targetLeftArmRotZ = 0.2 + Math.cos(t * 2) * 0.03;
    let targetRightArmRotX = -Math.sin(t * 1.8) * 0.06;
    let targetRightArmRotZ = -0.2 - Math.cos(t * 2) * 0.03;

    // Expressive head gesture while talking
    if (talkingVolume > 0.05) {
      targetHeadRotX += Math.sin(t * 12) * talkingVolume * 0.07;
      targetHeadRotZ += Math.cos(t * 8) * talkingVolume * 0.04;
      targetLeftArmRotZ += talkingVolume * 0.12;
      targetRightArmRotZ -= talkingVolume * 0.12;
    }

    let targetGroupZ = 0;

    // 5. Rich Procedural Animation States
    if (currentAction === 'dance') {
      // Rhythmic cartoon groove
      const danceCycle = t * 6.5;
      targetBodyY = 0.95 + Math.abs(Math.sin(danceCycle)) * 0.12;
      targetBodyRotZ = Math.sin(danceCycle) * 0.16;
      targetHeadRotZ = -Math.sin(danceCycle) * 0.22;
      targetHeadRotY = Math.sin(danceCycle * 0.5) * 0.15;
      
      // Arms pumping in rhythm
      targetLeftArmRotZ = 1.6 + Math.sin(danceCycle) * 0.5;
      targetLeftArmRotX = Math.cos(danceCycle) * 0.4;
      targetRightArmRotZ = -1.6 - Math.cos(danceCycle) * 0.5;
      targetRightArmRotX = Math.sin(danceCycle) * 0.4;
    } else if (currentAction === 'laugh') {
      // Bouncy chuckling shake
      const laughCycle = t * 20;
      targetBodyY = 0.95 + Math.sin(laughCycle) * 0.045;
      targetHeadRotX = -0.16 + Math.sin(laughCycle) * 0.06;
      targetHeadRotZ = Math.sin(laughCycle * 0.5) * 0.04;
      // Hands near belly/chest
      targetLeftArmRotZ = 0.9;
      targetLeftArmRotX = -0.5 + Math.sin(laughCycle) * 0.1;
      targetRightArmRotZ = -0.9;
      targetRightArmRotX = -0.5 - Math.sin(laughCycle) * 0.1;
    } else if (currentAction === 'annoyed') {
      // Head shake back and forth
      targetHeadRotY = Math.sin(t * 15) * 0.28;
      targetHeadRotX = 0.05;
      // Arms crossed / hands on waist
      targetLeftArmRotZ = 0.95;
      targetLeftArmRotX = -0.4;
      targetRightArmRotZ = -0.95;
      targetRightArmRotX = -0.4;
    } else if (currentAction === 'kiss') {
      // Lean forward towards camera
      targetGroupZ = 0.22;
      targetHeadRotX = 0.14;
      targetBodyY = 0.97;
      // Right hand blowing kiss forward
      targetRightArmRotZ = -1.8;
      targetRightArmRotX = -0.9;
    } else if (currentAction === 'hug') {
      // Both arms wrapping forward in a warm hug
      targetGroupZ = 0.25;
      targetBodyY = 0.96;
      targetHeadRotX = 0.08;
      targetLeftArmRotZ = 1.4;
      targetLeftArmRotX = -1.1;
      targetRightArmRotZ = -1.4;
      targetRightArmRotX = -1.1;
    } else if (currentAction === 'blush') {
      // Shy bashful tilt, bashful hands brought gently up
      targetHeadRotX = 0.14;
      targetHeadRotZ = 0.14;
      targetBodyY = 0.93;
      targetLeftArmRotZ = 0.65;
      targetLeftArmRotX = -0.35;
      targetRightArmRotZ = -0.65;
      targetRightArmRotX = -0.35;
    } else if (currentAction === 'cuddle') {
      // Cozy lean forward, arms wrapped in an affectionate cuddle
      targetGroupZ = 0.22;
      targetBodyY = 0.93;
      targetHeadRotZ = 0.16 + Math.sin(t * 1.5) * 0.04;
      targetHeadRotX = 0.1;
      targetLeftArmRotZ = 1.25;
      targetLeftArmRotX = -0.8;
      targetRightArmRotZ = -1.25;
      targetRightArmRotX = -0.8;
    } else if (currentAction === 'surprised') {
      // Recoil back in surprise
      targetHeadRotX = -0.22;
      targetBodyY = 0.98;
      targetLeftArmRotZ = 0.6;
      targetLeftArmRotX = 0.3;
      targetRightArmRotZ = -0.6;
      targetRightArmRotX = 0.3;
    } else if (currentAction === 'wave') {
      // Right arm waving high
      targetRightArmRotZ = -2.3;
      targetRightArmRotX = Math.sin(t * 12) * 0.4;
      targetHeadRotZ = -0.12;
    } else if (currentAction === 'boop') {
      // Nose squished, head pulls back briefly
      targetHeadRotX = -0.12;
      if (noseRef.current) {
        noseRef.current.scale.set(0.6, 0.6, 0.4);
      }
    } else if (noseRef.current) {
      noseRef.current.scale.set(1, 1, 1);
    }

    // Hover curious glance
    if (isHovered && currentAction === 'idle') {
      targetHeadRotZ += 0.08;
    }

    // 6. Smooth Damped Transforms (Zero jitter, guaranteed return to idle)
    if (bodyRef.current) {
      bodyRef.current.position.y = THREE.MathUtils.damp(bodyRef.current.position.y, targetBodyY, 8, delta);
      bodyRef.current.rotation.z = THREE.MathUtils.damp(bodyRef.current.rotation.z, targetBodyRotZ, 8, delta);
    }

    if (headRef.current) {
      headRef.current.position.y = THREE.MathUtils.damp(headRef.current.position.y, targetHeadY, 8, delta);
      headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, targetHeadRotX, 9, delta);
      headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, targetHeadRotY, 10, delta);
      headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, targetHeadRotZ, 8, delta);
    }

    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, targetLeftArmRotX, 8, delta);
      leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, targetLeftArmRotZ, 8, delta);
      rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, targetRightArmRotX, 8, delta);
      rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, targetRightArmRotZ, 8, delta);
    }

    // 7. Tap Bounce Spring Modifiers (Strictly relative to ground BASE_Y = -0.9)
    const BASE_Y = -0.9;
    if (bounceIntensityRef.current > 0) {
      reactionTimeRef.current += delta;
      const bounce = Math.sin(reactionTimeRef.current * 16) * Math.exp(-reactionTimeRef.current * 4) * bounceIntensityRef.current;
      
      if (groupRef.current) {
        groupRef.current.position.y = BASE_Y + Math.max(0, bounce * 0.35);
        groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetGroupZ, 8, delta);
        groupRef.current.scale.set(
          1 + bounce * 0.12,
          1 - bounce * 0.1,
          1 + bounce * 0.12
        );
      }
      if (reactionTimeRef.current > 1.2) {
        bounceIntensityRef.current = 0;
        if (groupRef.current) {
          groupRef.current.scale.set(1, 1, 1);
          groupRef.current.position.y = BASE_Y;
        }
      }
    } else if (groupRef.current) {
      groupRef.current.position.y = BASE_Y;
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetGroupZ, 8, delta);
    }
  });

  // Color Palette
  const skinColor = '#ffdbac';
  const blushColor = '#ff7597';
  const hairColor = '#241c19';
  const hoodieColor = '#b39ddb';
  const hoodiePocketColor = '#9575cd';
  const pantsColor = '#37474f';
  const shoeWhite = '#fdfdfd';
  const shoeAccent = '#ff4081';

  return (
    <group 
      ref={groupRef} 
      position={[0, -0.9, 0]}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      {/* 1. HEAD & INTERACTIVE FACE ZONES */}
      <group 
        ref={headRef} 
        position={[0, 1.95, 0]}
      >
        {/* Main Head Base & Tap Zone */}
        <mesh 
          castShadow 
          receiveShadow
          onPointerDown={(e) => handlePointerDown(e, 'head')}
          onPointerUp={(e) => handlePointerUp(e, 'head')}
          onPointerCancel={handlePointerCancel}
        >
          <sphereGeometry args={[0.54, 32, 32]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>

        {/* Hair - Stylish Messy Layered Quiff */}
        <group position={[0, 0.22, 0.05]}>
          <mesh castShadow position={[0, 0.22, -0.06]}>
            <sphereGeometry args={[0.56, 24, 24]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0.08, 0.32, 0.32]} rotation={[-0.2, 0.1, -0.05]}>
            <capsuleGeometry args={[0.18, 0.36, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[-0.14, 0.3, 0.3]} rotation={[-0.25, -0.15, 0.1]}>
            <capsuleGeometry args={[0.16, 0.32, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[-0.51, -0.08, 0.02]} rotation={[0, 0, 0.15]}>
            <capsuleGeometry args={[0.08, 0.28, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0.51, -0.08, 0.02]} rotation={[0, 0, -0.15]}>
            <capsuleGeometry args={[0.08, 0.28, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Left Eye & Wandering Iris */}
        <group position={[-0.18, 0.05, 0.46]}>
          <mesh castShadow>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <group ref={leftEyeIrisRef}>
            <mesh position={[0, 0, 0.06]}>
              <circleGeometry args={[0.058, 24]} />
              <meshBasicMaterial color="#1a1412" />
            </mesh>
            <mesh position={[0.022, 0.025, 0.065]}>
              <circleGeometry args={[0.02, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.02, -0.02, 0.065]}>
              <circleGeometry args={[0.01, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          {/* Eyelid */}
          <mesh ref={leftEyelidRef} position={[0, 0.04, 0.07]}>
            <sphereGeometry args={[0.095, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Right Eye & Wandering Iris */}
        <group position={[0.18, 0.05, 0.46]}>
          <mesh castShadow>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <group ref={rightEyeIrisRef}>
            <mesh position={[0, 0, 0.06]}>
              <circleGeometry args={[0.058, 24]} />
              <meshBasicMaterial color="#1a1412" />
            </mesh>
            <mesh position={[0.022, 0.025, 0.065]}>
              <circleGeometry args={[0.02, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.02, -0.02, 0.065]}>
              <circleGeometry args={[0.01, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          {/* Eyelid */}
          <mesh ref={rightEyelidRef} position={[0, 0.04, 0.07]}>
            <sphereGeometry args={[0.095, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Expressive Eyebrows */}
        <mesh ref={leftEyebrowRef} position={[-0.18, 0.19, 0.49]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.13, 0.03, 0.03]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>
        <mesh ref={rightEyebrowRef} position={[0.18, 0.19, 0.49]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.13, 0.03, 0.03]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>

        {/* Interactive Nose (Boop Zone) */}
        <mesh 
          ref={noseRef} 
          position={[0, -0.03, 0.53]}
          onPointerDown={(e) => handlePointerDown(e, 'nose')}
          onPointerUp={(e) => handlePointerUp(e, 'nose')}
          onPointerCancel={handlePointerCancel}
        >
          <sphereGeometry args={[0.048, 16, 16]} />
          <meshStandardMaterial color="#f0bda2" roughness={0.5} />
        </mesh>

        {/* Left Cheek (Poke Zone) */}
        <mesh 
          ref={leftBlushRef} 
          position={[-0.32, -0.06, 0.42]} 
          rotation={[0, -0.4, 0]}
          onPointerDown={(e) => handlePointerDown(e, 'cheek')}
          onPointerUp={(e) => handlePointerUp(e, 'cheek')}
          onPointerCancel={handlePointerCancel}
        >
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color={blushColor} transparent opacity={0.65} />
        </mesh>

        {/* Right Cheek (Poke Zone) */}
        <mesh 
          ref={rightBlushRef} 
          position={[0.32, -0.06, 0.42]} 
          rotation={[0, 0.4, 0]}
          onPointerDown={(e) => handlePointerDown(e, 'cheek')}
          onPointerUp={(e) => handlePointerUp(e, 'cheek')}
          onPointerCancel={handlePointerCancel}
        >
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial color={blushColor} transparent opacity={0.65} />
        </mesh>

        {/* Expressive Mouth */}
        <group ref={mouthRef} position={[0, -0.17, 0.49]} rotation={[0.05, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.07, 0.02, 12, 16, Math.PI]} rotation={[0, 0, Math.PI]} />
            <meshStandardMaterial color="#b71c1c" roughness={0.5} />
          </mesh>
        </group>

        {/* Ears */}
        <mesh position={[-0.53, 0.02, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.08, 0.14, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
        <mesh position={[0.53, 0.02, 0]} rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.08, 0.14, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
      </group>

      {/* 2. BODY & HOODIE (TAP ZONE) */}
      <group 
        ref={bodyRef} 
        position={[0, 0.95, 0]}
        onPointerDown={(e) => handlePointerDown(e, 'body')}
        onPointerUp={(e) => handlePointerUp(e, 'body')}
        onPointerCancel={handlePointerCancel}
      >
        {/* Main Torso */}
        <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.38, 0.44, 0.78, 24]} />
          <meshStandardMaterial color={hoodieColor} roughness={0.7} />
        </mesh>

        {/* Collar */}
        <mesh position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.08, 16, 24]} />
          <meshStandardMaterial color={hoodiePocketColor} roughness={0.75} />
        </mesh>

        {/* Pocket */}
        <mesh position={[0, 0.02, 0.38]}>
          <boxGeometry args={[0.38, 0.22, 0.08]} />
          <meshStandardMaterial color={hoodiePocketColor} roughness={0.75} />
        </mesh>

        {/* Heart Emblem */}
        <mesh position={[0.16, 0.32, 0.38]} rotation={[0, 0, -0.15]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#ff4081" roughness={0.3} />
        </mesh>

        {/* Drawstrings */}
        <mesh position={[-0.08, 0.36, 0.42]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.08, 0.36, 0.42]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Left Arm Pivot */}
        <group ref={leftArmRef} position={[-0.46, 0.42, 0]}>
          <mesh castShadow position={[0, -0.26, 0]} rotation={[0, 0, 0.12]}>
            <capsuleGeometry args={[0.11, 0.42, 16, 16]} />
            <meshStandardMaterial color={hoodieColor} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[-0.05, -0.56, 0.02]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Right Arm Pivot */}
        <group ref={rightArmRef} position={[0.46, 0.42, 0]}>
          <mesh castShadow position={[0, -0.26, 0]} rotation={[0, 0, -0.12]}>
            <capsuleGeometry args={[0.11, 0.42, 16, 16]} />
            <meshStandardMaterial color={hoodieColor} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0.05, -0.56, 0.02]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>
      </group>

      {/* 3. LEGS & SNEAKERS */}
      <group position={[0, 0, 0]}>
        <mesh castShadow receiveShadow position={[-0.2, 0.48, 0]}>
          <capsuleGeometry args={[0.13, 0.48, 16, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        <group position={[-0.2, 0.12, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.16, 0.38]} />
            <meshStandardMaterial color={shoeWhite} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.02, 0.02]}>
            <boxGeometry args={[0.23, 0.05, 0.28]} />
            <meshStandardMaterial color={shoeAccent} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.4]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
          </mesh>
        </group>

        <mesh castShadow receiveShadow position={[0.2, 0.48, 0]}>
          <capsuleGeometry args={[0.13, 0.48, 16, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        <group position={[0.2, 0.12, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.16, 0.38]} />
            <meshStandardMaterial color={shoeWhite} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.02, 0.02]}>
            <boxGeometry args={[0.23, 0.05, 0.28]} />
            <meshStandardMaterial color={shoeAccent} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.4]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
