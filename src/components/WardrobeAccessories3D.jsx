import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * 3D Procedural Wardrobe Accessories
 * Renders dynamically equipped hats, glasses, and accessories.
 * When headRef is provided, hats and glasses synchronize smoothly with head tilting and nodding.
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
      {/* Head Anchored Accessories (Hats & Glasses) */}
      <group ref={headRef} position={[0, 1.05, 0.04]}>
        {/* 1. HATS */}
        {hat === 'hat_flower' && (
          <group position={[0.075, 0.05, 0.08]} rotation={[0.15, 0.25, -0.15]} scale={0.72}>
            {/* Flower Center */}
            <mesh castShadow>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshStandardMaterial color="#ffd54f" roughness={0.4} />
            </mesh>
            {/* 5 Petals */}
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * Math.PI * 2) / 5;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * 0.048, Math.sin(angle) * 0.048, 0]}
                  rotation={[0, 0, angle]}
                >
                  <sphereGeometry args={[0.032, 10, 10]} />
                  <meshStandardMaterial color="#ff80ab" roughness={0.5} />
                </mesh>
              );
            })}
          </group>
        )}

        {hat === 'hat_crown' && (
          <group position={[0, 0.12, -0.01]} rotation={[-0.05, 0, 0]} scale={0.72}>
            {/* Crown Base Ring */}
            <mesh castShadow position={[0, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.17, 0.05, 24]} />
              <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Crown Spikes */}
            {[0, 1, 2, 3, 4].map((i) => {
              const angle = (i * Math.PI * 2) / 5;
              const r = 0.175;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(angle) * r, 0.06, Math.sin(angle) * r]}
                  rotation={[0, -angle, 0]}
                >
                  <coneGeometry args={[0.035, 0.09, 8]} />
                  <meshStandardMaterial color="#ffd700" metalness={0.85} roughness={0.2} />
                </mesh>
              );
            })}
            {/* Ruby Gem in center point */}
            <mesh position={[0, 0.04, 0.18]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#e91e63" roughness={0.1} />
            </mesh>
          </group>
        )}

        {hat === 'hat_party' && (
          <group position={[0.01, 0.11, 0]} rotation={[0.05, 0, 0.12]} scale={0.72}>
            {/* Party Cone */}
            <mesh castShadow position={[0, 0.11, 0]}>
              <coneGeometry args={[0.14, 0.28, 18]} />
              <meshStandardMaterial color="#ff4081" roughness={0.3} />
            </mesh>
            {/* Striped Ring */}
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.11, 0.12, 0.035, 18]} />
              <meshStandardMaterial color="#ffeb3b" roughness={0.4} />
            </mesh>
            {/* Top Fluffy Pompom */}
            <mesh position={[0, 0.25, 0]}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshStandardMaterial color="#00e5ff" roughness={0.6} />
            </mesh>
          </group>
        )}

        {hat === 'hat_cap' && (
          <group position={[0, 0.08, -0.02]} rotation={[-0.06, 0, 0]} scale={0.75}>
            {/* Cap Dome */}
            <mesh castShadow position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.20, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#0288d1" roughness={0.5} />
            </mesh>
            {/* Backward Visor */}
            <mesh castShadow position={[0, 0.01, -0.19]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.24, 0.02, 0.12]} />
              <meshStandardMaterial color="#01579b" roughness={0.4} />
            </mesh>
          </group>
        )}

        {hat === 'hat_beanie' && (
          <group position={[0, 0.07, 0]} rotation={[-0.04, 0, 0]} scale={0.76}>
            <mesh castShadow position={[0, 0.03, 0]}>
              <sphereGeometry args={[0.21, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
              <meshStandardMaterial color="#8e24aa" roughness={0.7} />
            </mesh>
            {/* Beanie Rim */}
            <mesh position={[0, -0.02, 0]}>
              <torusGeometry args={[0.20, 0.03, 12, 24]} />
              <meshStandardMaterial color="#7b1fa2" roughness={0.8} />
            </mesh>
            {/* Beanie Pompom */}
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.048, 12, 12]} />
              <meshStandardMaterial color="#e1bee7" roughness={0.9} />
            </mesh>
          </group>
        )}

        {/* 2. GLASSES */}
        {glasses === 'glasses_heart' && (
          <group position={[0, -0.06, 0.12]} scale={0.75}>
            {/* Left Heart Lens */}
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.1]}>
              <cylinderGeometry args={[0.058, 0.058, 0.012, 16]} />
              <meshStandardMaterial color="#ff4081" transparent opacity={0.75} roughness={0.1} />
            </mesh>
            {/* Right Heart Lens */}
            <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.1]}>
              <cylinderGeometry args={[0.058, 0.058, 0.012, 16]} />
              <meshStandardMaterial color="#ff4081" transparent opacity={0.75} roughness={0.1} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.05, 0.012, 0.01]} />
              <meshStandardMaterial color="#c2185b" roughness={0.3} />
            </mesh>
          </group>
        )}

        {glasses === 'glasses_cool' && (
          <group position={[0, -0.06, 0.12]} scale={0.75}>
            <mesh position={[-0.08, 0, 0]}>
              <boxGeometry args={[0.11, 0.065, 0.012]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0, 0]}>
              <boxGeometry args={[0.11, 0.065, 0.012]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.015, 0]}>
              <boxGeometry args={[0.05, 0.012, 0.01]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          </group>
        )}

        {glasses === 'glasses_nerd' && (
          <group position={[0, -0.06, 0.12]} scale={0.75}>
            <mesh position={[-0.08, 0, 0]}>
              <torusGeometry args={[0.052, 0.006, 8, 20]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0, 0]}>
              <torusGeometry args={[0.052, 0.006, 8, 20]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.015, 0]}>
              <boxGeometry args={[0.05, 0.007, 0.007]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} />
            </mesh>
          </group>
        )}

        {glasses === 'glasses_star' && (
          <group position={[0, -0.06, 0.12]} scale={0.75}>
            <mesh position={[-0.08, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.012, 5]} />
              <meshStandardMaterial color="#ffd600" transparent opacity={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.012, 5]} />
              <meshStandardMaterial color="#ffd600" transparent opacity={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.05, 0.012, 0.01]} />
              <meshStandardMaterial color="#ffab00" />
            </mesh>
          </group>
        )}
      </group>

      {/* 3. BODY & NECK ACCESSORIES */}
      {accessory === 'accessory_bowtie' && (
        <group position={[0, 0.70, 0.14]} scale={0.85}>
          <mesh castShadow>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color="#d32f2f" roughness={0.3} />
          </mesh>
          <mesh position={[-0.04, 0, 0]} rotation={[0, 0, 0.15]}>
            <coneGeometry args={[0.03, 0.06, 10]} />
            <meshStandardMaterial color="#e53935" roughness={0.4} />
          </mesh>
          <mesh position={[0.04, 0, 0]} rotation={[0, 0, -0.15]}>
            <coneGeometry args={[0.03, 0.06, 10]} />
            <meshStandardMaterial color="#e53935" roughness={0.4} />
          </mesh>
        </group>
      )}

      {accessory === 'accessory_scarf' && (
        <group position={[0, 0.72, 0.10]} rotation={[0.05, 0, 0]} scale={0.85}>
          <mesh castShadow>
            <torusGeometry args={[0.16, 0.04, 12, 24]} />
            <meshStandardMaterial color="#ec407a" roughness={0.7} />
          </mesh>
          <mesh position={[0.09, -0.11, 0.10]} rotation={[0.1, 0, -0.1]}>
            <boxGeometry args={[0.06, 0.16, 0.028]} />
            <meshStandardMaterial color="#f06292" roughness={0.7} />
          </mesh>
        </group>
      )}

      {accessory === 'accessory_wings' && (
        <group ref={wingsRef} position={[0, 0.55, -0.15]} scale={0.88}>
          <group position={[-0.07, 0, 0]}>
            <mesh castShadow position={[-0.13, 0.07, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.24, 0.16, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
          <group position={[0.07, 0, 0]}>
            <mesh castShadow position={[0.13, 0.07, 0]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.24, 0.16, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
