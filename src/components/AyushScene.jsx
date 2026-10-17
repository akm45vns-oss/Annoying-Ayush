import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import AyushModelManager from './AyushModelManager';
import FloatingHearts from './FloatingHearts';

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

export default function AyushScene({
  customModelUrl,
  currentAction,
  onTapPart,
  isHovered,
  setIsHovered,
  heartBurst = 0,
  talkingVolume = 0,
  floatingEffectsEnabled = true
}) {
  return (
    <div className={`scene-container ${isHovered ? 'cursor-grab' : ''}`}>
      <Canvas
        shadows
        // Camera positioned and focused on Ayush's center for prominent, full-body framing
        camera={{ position: [0, 0.25, 2.75], fov: 44 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Ambient & Key Lighting */}
        <ambientLight intensity={0.9} color="#fff8f0" />
        
        <directionalLight
          position={[2.5, 4.5, 3.5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          color="#fff5eb"
        />

        {/* Soft Pink Rim / Fill Light */}
        <pointLight position={[-2.5, 2, -1.8]} intensity={0.65} color="#ffb3c6" />

        {/* Warm Bottom Bounce Light */}
        <pointLight position={[0, -0.8, 1.8]} intensity={0.35} color="#ffd1dc" />

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
        />

        {/* Constrained Camera Orbit Controls centered on character midpoint */}
        <OrbitControls
          target={[0, 0.2, 0]}
          enablePan={false}
          enableZoom={true}
          minDistance={1.8}
          maxDistance={3.8}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.95}
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
