import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import AyushCharacter from './AyushCharacter';

// Deterministic particle positions generated once
const PARTICLE_COUNT = 25;
const PARTICLE_POSITIONS = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  // Simple deterministic pseudo-spread
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
  const radius = 1.2 + ((i * 7) % 11) * 0.16;
  PARTICLE_POSITIONS[i * 3] = Math.cos(angle) * radius;
  PARTICLE_POSITIONS[i * 3 + 1] = ((i * 13) % 20) * 0.15 - 0.2;
  PARTICLE_POSITIONS[i * 3 + 2] = Math.sin(angle) * radius;
}

/**
 * Ambient floating pastel particles in the studio room
 */
function FloatingParticles() {
  const pointsRef = useRef();

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      pointsRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.1;
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
        size={0.08}
        color="#ffccd5"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Cozy Studio Room / Stage
 */
function StudioStage() {
  return (
    <group position={[0, -0.9, 0]}>
      {/* Main Cozy Rug / Podium */}
      <mesh receiveShadow position={[0, -0.02, 0]}>
        <cylinderGeometry args={[2.2, 2.3, 0.08, 48]} />
        <meshStandardMaterial color="#fff0f5" roughness={0.9} />
      </mesh>
      {/* Decorative Outer Ring */}
      <mesh receiveShadow position={[0, -0.015, 0]}>
        <ringGeometry args={[1.9, 2.1, 48]} rotation={[-Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#ffccd5" roughness={0.8} />
      </mesh>

      {/* Soft Contact Shadows beneath Ayush */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.65} 
        scale={4} 
        blur={2.2} 
        far={3} 
        color="#885b72" 
      />
    </group>
  );
}

export default function AyushScene({
  currentAction,
  onTapPart,
  isHovered,
  setIsHovered
}) {
  return (
    <div className={`scene-container ${isHovered ? 'cursor-grab' : ''}`}>
      <Canvas
        shadows
        camera={{ position: [0, 0.6, 3.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lights */}
        <ambientLight intensity={0.85} color="#fff8f0" />
        
        {/* Key Light with Soft Shadow */}
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
          color="#fff5eb"
        />

        {/* Soft Pink Rim / Fill Light */}
        <pointLight position={[-3, 2, -2]} intensity={0.7} color="#ffb3c6" />

        {/* Warm Bottom Bounce Light */}
        <pointLight position={[0, -1, 2]} intensity={0.4} color="#ffd1dc" />

        {/* 3D Studio Stage & Atmosphere */}
        <StudioStage />
        <FloatingParticles />

        {/* Central Cartoon Ayush Character */}
        <AyushCharacter
          currentAction={currentAction}
          onTapPart={onTapPart}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
        />

        {/* Constrained Camera Orbit Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2.6}
          maxDistance={5.2}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.95}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
