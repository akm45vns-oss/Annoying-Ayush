import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Procedural Wardrobe Accessories
 * Renders dynamically equipped hats, glasses, and accessories directly in the 3D scene.
 */
export default function WardrobeAccessories3D({ equipped = {} }) {
  const wingsRef = useRef();

  useFrame((state) => {
    if (wingsRef.current) {
      const flutter = Math.sin(state.clock.getElapsedTime() * 6) * 0.15;
      wingsRef.current.children[0].rotation.y = flutter + 0.3;
      wingsRef.current.children[1].rotation.y = -flutter - 0.3;
    }
  });

  const { hat, glasses, accessory } = equipped;

  return (
    <group name="wardrobe-accessories">
      {/* 1. HATS */}
      {hat === 'hat_flower' && (
        <group position={[0.18, 1.24, 0.12]} rotation={[0.2, 0.3, -0.2]}>
          {/* Flower Center */}
          <mesh castShadow>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#ffd54f" roughness={0.4} />
          </mesh>
          {/* 5 Petals */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * Math.PI * 2) / 5;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.055, Math.sin(angle) * 0.055, 0]}
                rotation={[0, 0, angle]}
              >
                <sphereGeometry args={[0.038, 10, 10]} />
                <meshStandardMaterial color="#ff80ab" roughness={0.5} />
              </mesh>
            );
          })}
        </group>
      )}

      {hat === 'hat_crown' && (
        <group position={[0, 1.30, 0.02]} rotation={[-0.05, 0, 0]}>
          {/* Crown Base Ring */}
          <mesh castShadow position={[0, 0, 0]}>
            <cylinderGeometry args={[0.19, 0.18, 0.06, 24]} />
            <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Crown Spikes */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * Math.PI * 2) / 5;
            const r = 0.185;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * r, 0.07, Math.sin(angle) * r]}
                rotation={[0, -angle, 0]}
              >
                <coneGeometry args={[0.04, 0.10, 8]} />
                <meshStandardMaterial color="#ffd700" metalness={0.85} roughness={0.2} />
              </mesh>
            );
          })}
          {/* Ruby Gem in center point */}
          <mesh position={[0, 0.05, 0.19]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#e91e63" roughness={0.1} />
          </mesh>
        </group>
      )}

      {hat === 'hat_party' && (
        <group position={[0.02, 1.32, 0.02]} rotation={[0.05, 0, 0.15]}>
          {/* Party Cone */}
          <mesh castShadow position={[0, 0.12, 0]}>
            <coneGeometry args={[0.16, 0.32, 18]} />
            <meshStandardMaterial color="#ff4081" roughness={0.3} />
          </mesh>
          {/* Striped Ring */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.125, 0.13, 0.04, 18]} />
            <meshStandardMaterial color="#ffeb3b" roughness={0.4} />
          </mesh>
          {/* Top Fluffy Pompom */}
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#00e5ff" roughness={0.6} />
          </mesh>
        </group>
      )}

      {hat === 'hat_cap' && (
        <group position={[0, 1.25, -0.02]} rotation={[-0.08, 0, 0]}>
          {/* Cap Dome */}
          <mesh castShadow position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.22, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#0288d1" roughness={0.5} />
          </mesh>
          {/* Backward Visor */}
          <mesh castShadow position={[0, 0.01, -0.22]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.26, 0.02, 0.14]} />
            <meshStandardMaterial color="#01579b" roughness={0.4} />
          </mesh>
        </group>
      )}

      {hat === 'hat_beanie' && (
        <group position={[0, 1.24, 0.01]} rotation={[-0.05, 0, 0]}>
          <mesh castShadow position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.23, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            <meshStandardMaterial color="#8e24aa" roughness={0.7} />
          </mesh>
          {/* Beanie Rim */}
          <mesh position={[0, -0.02, 0]}>
            <torusGeometry args={[0.22, 0.035, 12, 24]} />
            <meshStandardMaterial color="#7b1fa2" roughness={0.8} />
          </mesh>
          {/* Beanie Pompom */}
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color="#e1bee7" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* 2. GLASSES */}
      {glasses === 'glasses_heart' && (
        <group position={[0, 1.04, 0.22]}>
          {/* Left Heart Lens */}
          <mesh position={[-0.09, 0, 0]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.065, 0.065, 0.015, 16]} />
            <meshStandardMaterial color="#ff4081" transparent opacity={0.75} roughness={0.1} />
          </mesh>
          {/* Right Heart Lens */}
          <mesh position={[0.09, 0, 0]} rotation={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.065, 0.065, 0.015, 16]} />
            <meshStandardMaterial color="#ff4081" transparent opacity={0.75} roughness={0.1} />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.06, 0.015, 0.01]} />
            <meshStandardMaterial color="#c2185b" roughness={0.3} />
          </mesh>
        </group>
      )}

      {glasses === 'glasses_cool' && (
        <group position={[0, 1.04, 0.22]}>
          {/* Left Frame */}
          <mesh position={[-0.09, 0, 0]}>
            <boxGeometry args={[0.13, 0.075, 0.015]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.2} />
          </mesh>
          {/* Right Frame */}
          <mesh position={[0.09, 0, 0]}>
            <boxGeometry args={[0.13, 0.075, 0.015]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.2} />
          </mesh>
          {/* Center Bridge */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.06, 0.015, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      )}

      {glasses === 'glasses_nerd' && (
        <group position={[0, 1.04, 0.22]}>
          {/* Left Round Wire */}
          <mesh position={[-0.09, 0, 0]}>
            <torusGeometry args={[0.06, 0.007, 8, 20]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Right Round Wire */}
          <mesh position={[0.09, 0, 0]}>
            <torusGeometry args={[0.06, 0.007, 8, 20]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.06, 0.008, 0.008]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} />
          </mesh>
        </group>
      )}

      {glasses === 'glasses_star' && (
        <group position={[0, 1.04, 0.22]}>
          {/* Left Star */}
          <mesh position={[-0.09, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.015, 5]} />
            <meshStandardMaterial color="#ffd600" transparent opacity={0.8} roughness={0.2} />
          </mesh>
          {/* Right Star */}
          <mesh position={[0.09, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.015, 5]} />
            <meshStandardMaterial color="#ffd600" transparent opacity={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.06, 0.015, 0.01]} />
            <meshStandardMaterial color="#ffab00" />
          </mesh>
        </group>
      )}

      {/* 3. ACCESSORIES */}
      {accessory === 'accessory_bowtie' && (
        <group position={[0, 0.76, 0.17]}>
          {/* Knot */}
          <mesh castShadow>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshStandardMaterial color="#d32f2f" roughness={0.3} />
          </mesh>
          {/* Left Wing */}
          <mesh position={[-0.045, 0, 0]} rotation={[0, 0, 0.15]}>
            <coneGeometry args={[0.035, 0.07, 10]} />
            <meshStandardMaterial color="#e53935" roughness={0.4} />
          </mesh>
          {/* Right Wing */}
          <mesh position={[0.045, 0, 0]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.035, 0.07, 10]} />
            <meshStandardMaterial color="#e53935" roughness={0.4} />
          </mesh>
        </group>
      )}

      {accessory === 'accessory_scarf' && (
        <group position={[0, 0.80, 0.08]} rotation={[0.05, 0, 0]}>
          {/* Neck Torus Loop */}
          <mesh castShadow>
            <torusGeometry args={[0.18, 0.045, 12, 24]} />
            <meshStandardMaterial color="#ec407a" roughness={0.7} />
          </mesh>
          {/* Dangling End */}
          <mesh position={[0.10, -0.12, 0.12]} rotation={[0.1, 0, -0.1]}>
            <boxGeometry args={[0.065, 0.18, 0.03]} />
            <meshStandardMaterial color="#f06292" roughness={0.7} />
          </mesh>
        </group>
      )}

      {accessory === 'accessory_wings' && (
        <group ref={wingsRef} position={[0, 0.58, -0.16]}>
          {/* Left Wing */}
          <group position={[-0.08, 0, 0]}>
            <mesh castShadow position={[-0.14, 0.08, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.26, 0.18, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
          {/* Right Wing */}
          <group position={[0.08, 0, 0]}>
            <mesh castShadow position={[0.14, 0.08, 0]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.26, 0.18, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
