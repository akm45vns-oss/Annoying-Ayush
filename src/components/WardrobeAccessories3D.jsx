import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Procedural Wardrobe Accessories
 * Renders dynamically equipped hats, glasses, and accessories.
 * Calibrated precisely to character head (y=1.00 pivot, eyes at y=1.085, top of hair at y=1.30).
 */
export default function WardrobeAccessories3D({ equipped = {}, headRef }) {
  const wingsRef = useRef();

  useFrame((state) => {
    if (wingsRef.current && wingsRef.current.children.length >= 2) {
      const flutter = Math.sin(state.clock.getElapsedTime() * 6) * 0.15;
      wingsRef.current.children[0].rotation.y = flutter + 0.3;
      wingsRef.current.children[1].rotation.y = -flutter - 0.3;
    }
  });

  const { hat, glasses, accessory } = equipped;

  return (
    <group name="wardrobe-accessories">
      {/* Head Anchored Accessories (Pivot at neck/head base: y=1.00, z=0.02) */}
      <group ref={headRef} position={[0, 1.00, 0.02]}>
        {/* 1. HATS (Hair top at y = +0.29 relative to pivot) */}
        {hat === 'hat_flower' && (
          <group position={[0.07, 0.22, 0.05]} rotation={[0.15, 0.35, -0.15]} scale={0.65}>
            {/* Flower Center */}
            <mesh castShadow>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#ffd54f" roughness={0.4} />
            </mesh>
            {/* 5 Petals */}
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * Math.PI * 2) / 5;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * 0.035, Math.sin(angle) * 0.035, 0]}
                  rotation={[0, 0, angle]}
                >
                  <sphereGeometry args={[0.022, 10, 10]} />
                  <meshStandardMaterial color="#ff80ab" roughness={0.5} />
                </mesh>
              );
            })}
          </group>
        )}

        {hat === 'hat_crown' && (
          <group position={[0, 0.29, 0.01]} rotation={[-0.05, 0, 0]} scale={0.70}>
            {/* Crown Base Ring - Proportionate to head width */}
            <mesh castShadow position={[0, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.085, 0.032, 24]} />
              <meshStandardMaterial color="#ffd700" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* 5 Crown Spikes */}
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * Math.PI * 2) / 5;
              const r = 0.085;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * r, 0.04, Math.sin(angle) * r]}
                  rotation={[0, -angle, 0]}
                >
                  <coneGeometry args={[0.022, 0.065, 8]} />
                  <meshStandardMaterial color="#ffd700" metalness={0.88} roughness={0.2} />
                </mesh>
              );
            })}
            {/* Ruby Gem in center point */}
            <mesh position={[0, 0.025, 0.09]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#e91e63" roughness={0.1} />
            </mesh>
          </group>
        )}

        {hat === 'hat_party' && (
          <group position={[0.01, 0.29, 0]} rotation={[0.05, 0, 0.12]} scale={0.72}>
            {/* Party Cone */}
            <mesh castShadow position={[0, 0.10, 0]}>
              <coneGeometry args={[0.09, 0.22, 18]} />
              <meshStandardMaterial color="#ff4081" roughness={0.3} />
            </mesh>
            {/* Striped Ring */}
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.085, 0.09, 0.025, 18]} />
              <meshStandardMaterial color="#ffeb3b" roughness={0.4} />
            </mesh>
            {/* Top Fluffy Pompom */}
            <mesh position={[0, 0.21, 0]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#00e5ff" roughness={0.6} />
            </mesh>
          </group>
        )}

        {hat === 'hat_cap' && (
          <group position={[0, 0.26, -0.01]} rotation={[-0.06, 0, 0]} scale={0.74}>
            {/* Cap Dome */}
            <mesh castShadow position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.11, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#0288d1" roughness={0.5} />
            </mesh>
            {/* Backward Visor */}
            <mesh castShadow position={[0, 0.01, -0.11]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.13, 0.015, 0.08]} />
              <meshStandardMaterial color="#01579b" roughness={0.4} />
            </mesh>
          </group>
        )}

        {hat === 'hat_beanie' && (
          <group position={[0, 0.25, 0]} rotation={[-0.04, 0, 0]} scale={0.74}>
            <mesh castShadow position={[0, 0.03, 0]}>
              <sphereGeometry args={[0.115, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
              <meshStandardMaterial color="#8e24aa" roughness={0.7} />
            </mesh>
            {/* Beanie Rim */}
            <mesh position={[0, -0.01, 0]}>
              <torusGeometry args={[0.11, 0.02, 12, 24]} />
              <meshStandardMaterial color="#7b1fa2" roughness={0.8} />
            </mesh>
            {/* Beanie Pompom */}
            <mesh position={[0, 0.16, 0]}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshStandardMaterial color="#e1bee7" roughness={0.9} />
            </mesh>
          </group>
        )}

        {/* 2. GLASSES (Positioned accurately at eye level: y = +0.085, z = +0.125) */}
        {glasses === 'glasses_heart' && (
          <group position={[0, 0.085, 0.125]} scale={0.65}>
            {/* Left Heart Lens */}
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0, 0.1]}>
              <cylinderGeometry args={[0.038, 0.038, 0.01, 16]} />
              <meshStandardMaterial color="#ff4081" transparent opacity={0.8} roughness={0.1} />
            </mesh>
            {/* Right Heart Lens */}
            <mesh position={[0.05, 0, 0]} rotation={[0, 0, -0.1]}>
              <cylinderGeometry args={[0.038, 0.038, 0.01, 16]} />
              <meshStandardMaterial color="#ff4081" transparent opacity={0.8} roughness={0.1} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[0.038, 0.008, 0.008]} />
              <meshStandardMaterial color="#c2185b" roughness={0.3} />
            </mesh>
            {/* Left Temple Arm */}
            <mesh position={[-0.082, 0, -0.06]} rotation={[0, 0.1, 0]}>
              <boxGeometry args={[0.005, 0.006, 0.12]} />
              <meshStandardMaterial color="#c2185b" />
            </mesh>
            {/* Right Temple Arm */}
            <mesh position={[0.082, 0, -0.06]} rotation={[0, -0.1, 0]}>
              <boxGeometry args={[0.005, 0.006, 0.12]} />
              <meshStandardMaterial color="#c2185b" />
            </mesh>
          </group>
        )}

        {glasses === 'glasses_cool' && (
          <group position={[0, 0.085, 0.125]} scale={0.65}>
            {/* Left Lens & Frame */}
            <mesh position={[-0.052, 0, 0]}>
              <boxGeometry args={[0.065, 0.042, 0.012]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.2} />
            </mesh>
            {/* Right Lens & Frame */}
            <mesh position={[0.052, 0, 0]}>
              <boxGeometry args={[0.065, 0.042, 0.012]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.2} />
            </mesh>
            {/* Center Bridge across nose */}
            <mesh position={[0, 0.008, 0]}>
              <boxGeometry args={[0.04, 0.008, 0.01]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Left Temple Arm going back to ear */}
            <mesh position={[-0.084, 0, -0.06]} rotation={[0, 0.1, 0]}>
              <boxGeometry args={[0.006, 0.008, 0.12]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            {/* Right Temple Arm going back to ear */}
            <mesh position={[0.084, 0, -0.06]} rotation={[0, -0.1, 0]}>
              <boxGeometry args={[0.006, 0.008, 0.12]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        )}

        {glasses === 'glasses_nerd' && (
          <group position={[0, 0.085, 0.125]} scale={0.65}>
            {/* Left Round Wire */}
            <mesh position={[-0.05, 0, 0]}>
              <torusGeometry args={[0.034, 0.004, 8, 20]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Right Round Wire */}
            <mesh position={[0.05, 0, 0]}>
              <torusGeometry args={[0.034, 0.004, 8, 20]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 0.008, 0]}>
              <boxGeometry args={[0.038, 0.005, 0.005]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} />
            </mesh>
            {/* Left Temple Arm */}
            <mesh position={[-0.08, 0, -0.06]} rotation={[0, 0.1, 0]}>
              <boxGeometry args={[0.004, 0.004, 0.12]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} />
            </mesh>
            {/* Right Temple Arm */}
            <mesh position={[0.08, 0, -0.06]} rotation={[0, -0.1, 0]}>
              <boxGeometry args={[0.004, 0.004, 0.12]} />
              <meshStandardMaterial color="#d4af37" metalness={0.85} />
            </mesh>
          </group>
        )}

        {glasses === 'glasses_star' && (
          <group position={[0, 0.085, 0.125]} scale={0.65}>
            {/* Left Star */}
            <mesh position={[-0.05, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 5]} />
              <meshStandardMaterial color="#ffd600" transparent opacity={0.85} roughness={0.2} />
            </mesh>
            {/* Right Star */}
            <mesh position={[0.05, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 5]} />
              <meshStandardMaterial color="#ffd600" transparent opacity={0.85} roughness={0.2} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 0.006, 0]}>
              <boxGeometry args={[0.038, 0.008, 0.008]} />
              <meshStandardMaterial color="#ffab00" />
            </mesh>
          </group>
        )}
      </group>

      {/* 3. BODY & NECK ACCESSORIES */}
      {accessory === 'accessory_bowtie' && (
        <group position={[0, 0.80, 0.11]} scale={0.85}>
          <mesh castShadow>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshStandardMaterial color="#d32f2f" roughness={0.4} />
          </mesh>
          <mesh position={[-0.032, 0, 0]} rotation={[0, 0, 0.15]}>
            <coneGeometry args={[0.024, 0.05, 10]} />
            <meshStandardMaterial color="#e53935" roughness={0.4} />
          </mesh>
          <mesh position={[0.032, 0, 0]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.024, 0.05, 10]} />
            <meshStandardMaterial color="#e53935" roughness={0.4} />
          </mesh>
        </group>
      )}

      {accessory === 'accessory_scarf' && (
        <group position={[0, 0.81, 0.08]} rotation={[0.05, 0, 0]} scale={0.82}>
          <mesh castShadow>
            <torusGeometry args={[0.13, 0.032, 12, 24]} />
            <meshStandardMaterial color="#ec407a" roughness={0.7} />
          </mesh>
          <mesh position={[0.07, -0.09, 0.08]} rotation={[0.1, 0, -0.1]}>
            <boxGeometry args={[0.05, 0.14, 0.022]} />
            <meshStandardMaterial color="#f06292" roughness={0.7} />
          </mesh>
        </group>
      )}

      {accessory === 'accessory_wings' && (
        <group ref={wingsRef} position={[0, 0.65, -0.15]} scale={0.85}>
          <group position={[-0.06, 0, 0]}>
            <mesh castShadow position={[-0.12, 0.07, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.22, 0.15, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
          <group position={[0.06, 0, 0]}>
            <mesh castShadow position={[0.13, 0.07, 0]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.22, 0.15, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
