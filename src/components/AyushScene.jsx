import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import AyushModelManager from './AyushModelManager';
import FloatingHearts from './FloatingHearts';
import RoomEnvironment from './RoomEnvironment';
import { LIGHTING_PRESETS } from '../utils/roomSettings';

// Deterministic particle positions generated once
const PARTICLE_COUNT = 20;
const PARTICLE_POSITIONS = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
  const radius = 1.1 + ((i * 7) % 9) * 0.12;
  PARTICLE_POSITIONS[i * 3] = Math.cos(angle) * radius;
  PARTICLE_POSITIONS[i * 3 + 1] = ((i * 13) % 20) * 0.12 - 0.2;
  PARTICLE_POSITIONS[i * 3 + 2] = Math.sin(angle) * radius;
}

/**
 * Ambient floating pastel particles in the studio room
 */
function FloatingParticles() {
  const pointsRef = useRef();

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
      pointsRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.35) * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[PARTICLE_POSITIONS, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color="#ffccd5"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Compact, Tasteful Cozy Studio Podium Mat
 * Proportionate to Ayush, resting cleanly directly under his sneakers.
 */
function StudioStage() {
  return (
    <group position={[0, -0.88, 0]}>
      {/* Soft circular pastel mat */}
      <mesh receiveShadow position={[0, -0.015, 0]}>
        <cylinderGeometry args={[1.25, 1.3, 0.03, 48]} />
        <meshStandardMaterial color="#fff0f5" roughness={0.9} />
      </mesh>
      {/* Gentle blush ring accent lying flat on mat */}
      <mesh receiveShadow position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.2, 48]} />
        <meshStandardMaterial color="#ffccd5" roughness={0.8} />
      </mesh>

      {/* Realistic soft ground shadow anchoring Ayush's soles */}
      <ContactShadows 
        position={[0, 0.005, 0]} 
        opacity={0.65} 
        scale={2.6} 
        blur={1.5} 
        far={1.6} 
        color="#70485c" 
      />
    </group>
  );
}

/**
 * Dynamic Face-Focused Camera Controller
 * 
 * Coordinates smooth zoom transition:
 * - At wide zoom (distance >= 3.24): Target rests at y = 0.38 for full-body framing (shoes at -0.88, head at +1.30).
 * - When zooming in (distance down to 1.5): Target glides up to y = 0.98 (face center: eyes/nose/mouth).
 * - Adjusts camera.position.y alongside target.y by the exact same delta, ensuring spherical angles
 *   and distance remain invariant with OrbitControls (zero fighting, zero drift, zero jerking).
 */
function FaceFocusedCameraController({ controlsRef }) {
  useFrame((state) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const cam = state.camera;
    const distance = cam.position.distanceTo(controls.target);

    // Zoom interpolation: 0 at wide framing (3.24), 1 at close-up (1.5)
    const zoomProgress = THREE.MathUtils.clamp((3.24 - distance) / (3.24 - 1.5), 0, 1);
    const desiredTargetY = THREE.MathUtils.lerp(0.38, 0.98, zoomProgress);

    const diff = desiredTargetY - controls.target.y;
    if (Math.abs(diff) > 0.0005) {
      controls.target.y = desiredTargetY;
      cam.position.y += diff;
      controls.update();
    }
  });

  return null;
}

export default function AyushScene({
  customModelUrl,
  currentAction,
  onTapPart,
  isHovered,
  setIsHovered,
  heartBurst = 0,
  talkingVolume = 0,
  floatingEffectsEnabled = true,
  roomTheme = 'studio',
  lightingMode = 'day',
  equippedWardrobe = {},
  onSwipe = () => {},
  onDoubleTap = () => {}
}) {
  const controlsRef = useRef();
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapTimeRef = useRef(0);

  const handlePointerDown = (e) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // Check for double tap
    const now = Date.now();
    if (now - lastTapTimeRef.current < 320) {
      onDoubleTap();
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const handlePointerUp = (e) => {
    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;

    // Detect horizontal swipe (at least 60px distance within 450ms)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50 && duration < 450) {
      if (deltaX > 0) {
        onSwipe('right');
      } else {
        onSwipe('left');
      }
    }
  };

  const preset = LIGHTING_PRESETS[lightingMode] || LIGHTING_PRESETS.day;

  return (
    <div 
      className={`scene-container ${isHovered ? 'cursor-grab' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Canvas
        shadows
        // Camera positioned for prominent full-body framing (83% viewport height) with headroom above hair
        camera={{ position: [0, 0.38, 3.24], fov: 44 }}
        gl={{ antialias: true, alpha: true }}
      >
        <FaceFocusedCameraController controlsRef={controlsRef} />

        {/* Dynamic Atmosphere & Lighting Preset */}
        <ambientLight intensity={preset.ambientIntensity} color={preset.ambientColor} />
        
        <directionalLight
          position={preset.sunPosition}
          intensity={preset.sunIntensity}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          color={preset.sunColor}
        />

        {/* Soft Rim / Fill Light */}
        <pointLight position={[-2.5, 2, -1.8]} intensity={preset.rimIntensity} color={preset.rimColor} />

        {/* Warm Bottom Bounce Light */}
        <pointLight position={[0, -0.8, 1.8]} intensity={0.35} color={preset.bounceColor} />

        {/* Room Environment & Background */}
        <RoomEnvironment themeId={roomTheme} lightingMode={lightingMode} />

        {/* 3D Studio Stage & Atmosphere */}
        <StudioStage />
        {floatingEffectsEnabled && <FloatingParticles />}
        {floatingEffectsEnabled && <FloatingHearts burstTrigger={heartBurst} />}

        {/* Central Character (Custom Rigged GLB or Fallback Procedural Chibi) */}
        <AyushModelManager
          customModelUrl={customModelUrl}
          currentAction={currentAction}
          onTapPart={onTapPart}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
          talkingVolume={talkingVolume}
          equippedWardrobe={equippedWardrobe}
        />

        {/* Fixed Front-Facing Talking Tom Stage Camera — Room Rotation Locked */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 0.38, 0]}
          enableRotate={false}
          enablePan={false}
          enableZoom={false}
        />
      </Canvas>
    </div>
  );
}
