import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 3D Cartoon Character - Ayush
 * Stylized, expressive, cute chibi/cartoon design with idle breathing,
 * blinking eyelids, and interactive tap reactions.
 */
export default function AyushCharacter({ 
  currentAction = 'idle', 
  onTapPart = () => {},
  isHovered = false,
  setIsHovered = () => {}
}) {
  const groupRef = useRef();
  const headRef = useRef();
  const bodyRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const mouthRef = useRef();
  const leftEyelidRef = useRef();
  const rightEyelidRef = useRef();

  // Internal blink timer (ref based for 60fps performance)
  const isBlinkingRef = useRef(false);
  const blinkTimerRef = useRef(0);
  const nextBlinkRef = useRef(3);

  // Reaction bounce animation reference
  const reactionTimeRef = useRef(0);
  const bounceIntensityRef = useRef(0);

  // Trigger bounce effect on action change
  useEffect(() => {
    if (currentAction !== 'idle') {
      bounceIntensityRef.current = 1.0;
      reactionTimeRef.current = 0;
    }
  }, [currentAction]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Blinking cycle
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > nextBlinkRef.current) {
      isBlinkingRef.current = true;
      if (blinkTimerRef.current > nextBlinkRef.current + 0.14) {
        isBlinkingRef.current = false;
        blinkTimerRef.current = 0;
        nextBlinkRef.current = 2.5 + Math.random() * 3.5;
      }
    }

    // Smooth eyelid scaling
    if (leftEyelidRef.current && rightEyelidRef.current) {
      const targetScaleY = isBlinkingRef.current ? 1.0 : 0.05;
      leftEyelidRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyelidRef.current.scale.y,
        targetScaleY,
        0.35
      );
      rightEyelidRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyelidRef.current.scale.y,
        targetScaleY,
        0.35
      );
    }

    // 2. Idle breathing & sway
    const breathe = Math.sin(t * 2.2) * 0.035;
    const sway = Math.sin(t * 1.1) * 0.02;

    if (bodyRef.current) {
      bodyRef.current.position.y = 0.95 + breathe;
      bodyRef.current.rotation.z = sway * 0.4;
    }

    if (headRef.current) {
      // Gentle head bob + tilt
      headRef.current.position.y = 1.95 + breathe * 1.2;
      headRef.current.rotation.z = -sway * 0.7;
      headRef.current.rotation.x = Math.sin(t * 1.5) * 0.025;
    }

    // 3. Natural arm idle swing
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(t * 1.8) * 0.06;
      rightArmRef.current.rotation.x = -Math.sin(t * 1.8) * 0.06;
      leftArmRef.current.rotation.z = 0.2 + Math.cos(t * 2) * 0.03;
      rightArmRef.current.rotation.z = -0.2 - Math.cos(t * 2) * 0.03;
    }

    // 4. Action-specific animation modifiers
    if (bounceIntensityRef.current > 0) {
      reactionTimeRef.current += delta;
      // Damped bounce oscillation
      const bounce = Math.sin(reactionTimeRef.current * 16) * Math.exp(-reactionTimeRef.current * 4) * bounceIntensityRef.current;
      if (groupRef.current) {
        groupRef.current.position.y = Math.max(0, bounce * 0.4);
        groupRef.current.scale.set(
          1 + bounce * 0.15,
          1 - bounce * 0.12,
          1 + bounce * 0.15
        );
      }
      if (reactionTimeRef.current > 1.2) {
        bounceIntensityRef.current = 0;
        if (groupRef.current) {
          groupRef.current.scale.set(1, 1, 1);
          groupRef.current.position.y = 0;
        }
      }
    }

    // Subtle curious tilt when hovered
    if (isHovered && headRef.current && currentAction === 'idle') {
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0.08, 0.1);
    }

    // Special pose adjustments for actions
    if (currentAction === 'wave' && rightArmRef.current) {
      rightArmRef.current.rotation.z = -2.2;
      rightArmRef.current.rotation.x = Math.sin(t * 12) * 0.35;
    } else if (currentAction === 'kiss' && headRef.current && mouthRef.current) {
      headRef.current.rotation.x = 0.12;
      mouthRef.current.scale.set(0.6, 0.6, 1.4);
    } else if (mouthRef.current) {
      mouthRef.current.scale.set(1, 1, 1);
    }
  });

  // Materials
  const skinColor = '#ffdbac';
  const blushColor = '#ff8fa3';
  const hairColor = '#241c19';
  const hoodieColor = '#b39ddb'; // cozy soft pastel lavender
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
      {/* 1. HEAD & FACE GROUP */}
      <group 
        ref={headRef} 
        position={[0, 1.95, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onTapPart('head');
        }}
        cursor="pointer"
      >
        {/* Main Head Base */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.54, 32, 32]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>

        {/* Hair - Stylish Messy Layered Quiff */}
        <group position={[0, 0.22, 0.05]}>
          {/* Main Hair Volume */}
          <mesh castShadow position={[0, 0.22, -0.06]}>
            <sphereGeometry args={[0.56, 24, 24]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          {/* Top Front Pompadour / Quiff Bangs */}
          <mesh castShadow position={[0.08, 0.32, 0.32]} rotation={[-0.2, 0.1, -0.05]}>
            <capsuleGeometry args={[0.18, 0.36, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[-0.14, 0.3, 0.3]} rotation={[-0.25, -0.15, 0.1]}>
            <capsuleGeometry args={[0.16, 0.32, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          {/* Sideburns */}
          <mesh castShadow position={[-0.51, -0.08, 0.02]} rotation={[0, 0, 0.15]}>
            <capsuleGeometry args={[0.08, 0.28, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0.51, -0.08, 0.02]} rotation={[0, 0, -0.15]}>
            <capsuleGeometry args={[0.08, 0.28, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.8} />
          </mesh>
        </group>

        {/* Left Eye */}
        <group position={[-0.18, 0.05, 0.46]}>
          <mesh castShadow>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          {/* Iris & Pupil */}
          <mesh position={[0, 0, 0.06]}>
            <circleGeometry args={[0.058, 24]} />
            <meshBasicMaterial color="#1a1412" />
          </mesh>
          {/* Anime Specular Highlight */}
          <mesh position={[0.022, 0.025, 0.065]}>
            <circleGeometry args={[0.02, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.02, -0.02, 0.065]}>
            <circleGeometry args={[0.01, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Eyelid for Blinking */}
          <mesh ref={leftEyelidRef} position={[0, 0.04, 0.07]}>
            <sphereGeometry args={[0.095, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Right Eye */}
        <group position={[0.18, 0.05, 0.46]}>
          <mesh castShadow>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          {/* Iris & Pupil */}
          <mesh position={[0, 0, 0.06]}>
            <circleGeometry args={[0.058, 24]} />
            <meshBasicMaterial color="#1a1412" />
          </mesh>
          {/* Anime Specular Highlight */}
          <mesh position={[0.022, 0.025, 0.065]}>
            <circleGeometry args={[0.02, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.02, -0.02, 0.065]}>
            <circleGeometry args={[0.01, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Eyelid for Blinking */}
          <mesh ref={rightEyelidRef} position={[0, 0.04, 0.07]}>
            <sphereGeometry args={[0.095, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Eyebrows */}
        <mesh position={[-0.18, 0.19, 0.49]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.13, 0.03, 0.03]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>
        <mesh position={[0.18, 0.19, 0.49]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.13, 0.03, 0.03]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>

        {/* Cute Button Nose */}
        <mesh position={[0, -0.03, 0.53]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#f0c299" roughness={0.6} />
        </mesh>

        {/* Blushing Cheeks */}
        <mesh position={[-0.32, -0.06, 0.42]} rotation={[0, -0.4, 0]}>
          <circleGeometry args={[0.075, 16]} />
          <meshBasicMaterial color={blushColor} transparent opacity={0.65} />
        </mesh>
        <mesh position={[0.32, -0.06, 0.42]} rotation={[0, 0.4, 0]}>
          <circleGeometry args={[0.075, 16]} />
          <meshBasicMaterial color={blushColor} transparent opacity={0.65} />
        </mesh>

        {/* Cute Smile / Mouth */}
        <group ref={mouthRef} position={[0, -0.17, 0.49]} rotation={[0.05, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.07, 0.02, 12, 16, Math.PI]} rotation={[0, 0, Math.PI]} />
            <meshStandardMaterial color="#b71c1c" roughness={0.5} />
          </mesh>
        </group>

        {/* Cute Ears */}
        <mesh position={[-0.53, 0.02, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.08, 0.14, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
        <mesh position={[0.53, 0.02, 0]} rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.08, 0.14, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>
      </group>

      {/* 2. BODY & HOODIE GROUP */}
      <group 
        ref={bodyRef} 
        position={[0, 0.95, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onTapPart('body');
        }}
        cursor="pointer"
      >
        {/* Main Torso (Hoodie) */}
        <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.38, 0.44, 0.78, 24]} />
          <meshStandardMaterial color={hoodieColor} roughness={0.7} />
        </mesh>

        {/* Hoodie Neck Collar */}
        <mesh position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.08, 16, 24]} />
          <meshStandardMaterial color={hoodiePocketColor} roughness={0.75} />
        </mesh>

        {/* Kangaroo Pocket */}
        <mesh position={[0, 0.02, 0.38]}>
          <boxGeometry args={[0.38, 0.22, 0.08]} />
          <meshStandardMaterial color={hoodiePocketColor} roughness={0.75} />
        </mesh>

        {/* Cute Heart Badge on Chest */}
        <mesh position={[0.16, 0.32, 0.38]} rotation={[0, 0, -0.15]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#ff4081" roughness={0.3} />
        </mesh>

        {/* Hoodie Drawstrings */}
        <mesh position={[-0.08, 0.36, 0.42]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.08, 0.36, 0.42]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.46, 0.42, 0]}>
          <mesh castShadow position={[0, -0.26, 0]} rotation={[0, 0, 0.12]}>
            <capsuleGeometry args={[0.11, 0.42, 16, 16]} />
            <meshStandardMaterial color={hoodieColor} roughness={0.7} />
          </mesh>
          {/* Left Hand */}
          <mesh castShadow position={[-0.05, -0.56, 0.02]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.46, 0.42, 0]}>
          <mesh castShadow position={[0, -0.26, 0]} rotation={[0, 0, -0.12]}>
            <capsuleGeometry args={[0.11, 0.42, 16, 16]} />
            <meshStandardMaterial color={hoodieColor} roughness={0.7} />
          </mesh>
          {/* Right Hand */}
          <mesh castShadow position={[0.05, -0.56, 0.02]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
        </group>
      </group>

      {/* 3. LEGS & SNEAKERS */}
      <group position={[0, 0, 0]}>
        {/* Left Leg */}
        <mesh castShadow receiveShadow position={[-0.2, 0.48, 0]}>
          <capsuleGeometry args={[0.13, 0.48, 16, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Left Sneaker */}
        <group position={[-0.2, 0.12, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.16, 0.38]} />
            <meshStandardMaterial color={shoeWhite} roughness={0.4} />
          </mesh>
          {/* Sneaker Accent Stripe */}
          <mesh position={[0, 0.02, 0.02]}>
            <boxGeometry args={[0.23, 0.05, 0.28]} />
            <meshStandardMaterial color={shoeAccent} roughness={0.5} />
          </mesh>
          {/* Sole */}
          <mesh position={[0, -0.07, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.4]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
          </mesh>
        </group>

        {/* Right Leg */}
        <mesh castShadow receiveShadow position={[0.2, 0.48, 0]}>
          <capsuleGeometry args={[0.13, 0.48, 16, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        {/* Right Sneaker */}
        <group position={[0.2, 0.12, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.16, 0.38]} />
            <meshStandardMaterial color={shoeWhite} roughness={0.4} />
          </mesh>
          {/* Sneaker Accent Stripe */}
          <mesh position={[0, 0.02, 0.02]}>
            <boxGeometry args={[0.23, 0.05, 0.28]} />
            <meshStandardMaterial color={shoeAccent} roughness={0.5} />
          </mesh>
          {/* Sole */}
          <mesh position={[0, -0.07, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.4]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
