import React, { useRef } from 'react';
import { useFrame, createPortal } from '@react-three/fiber';

/**
 * 3D Procedural Wardrobe Accessories
 * 
 * Attaches hats, glasses, and accessories directly to the skeleton bones via createPortal:
 * - Hats & Glasses -> bones.head (eye level: y = 0.112, z = 0.115; hair top: y = 0.23, z = 0.015)
 * - Neckwear (bowtie, scarf) -> bones.neck (collar level: y = 0.06, z = 0.13)
 * - Backwear (cupid wings) -> bones.spine (upper back: y = 0.10, z = -0.16)
 * 
 * This guarantees 100% anatomical alignment during idle breathing, head turns, smiles, nods, and dance clips!
 */
export default function WardrobeAccessories3D({ equipped = {}, bones = {} }) {
  const wingsRef = useRef();

  useFrame((state) => {
    if (wingsRef.current && wingsRef.current.children.length >= 2) {
      const flutter = Math.sin(state.clock.getElapsedTime() * 6) * 0.15;
      wingsRef.current.children[0].rotation.y = flutter + 0.3;
      wingsRef.current.children[1].rotation.y = -flutter - 0.3;
    }
  });

  const { hat, glasses, accessory } = equipped;
  const { head, neck, spine } = bones;

  if (!head) return null;

  return (
    <>
      {/* 1. HEAD ATTACHMENTS (Parented directly to Head bone) */}
      {createPortal(
        <group name="head-accessories-portal">
          {/* HATS & HAIR ACCENTS */}
          {hat === 'hat_flower' && (
            <group position={[0.075, 0.18, 0.045]} rotation={[0.15, 0.3, -0.15]} scale={0.75}>
              <mesh castShadow>
                <sphereGeometry args={[0.03, 12, 12]} />
                <meshStandardMaterial color="#ffd54f" roughness={0.4} />
              </mesh>
              {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i * Math.PI * 2) / 5;
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(angle) * 0.042, Math.sin(angle) * 0.042, 0]}
                    rotation={[0, 0, angle]}
                  >
                    <sphereGeometry args={[0.026, 10, 10]} />
                    <meshStandardMaterial color="#ff80ab" roughness={0.5} />
                  </mesh>
                );
              })}
            </group>
          )}

          {hat === 'hat_crown' && (
            <group position={[0, 0.23, 0.015]} rotation={[-0.05, 0, 0]} scale={0.85}>
              {/* Crown Base Ring */}
              <mesh castShadow position={[0, 0, 0]}>
                <cylinderGeometry args={[0.095, 0.09, 0.035, 24]} />
                <meshStandardMaterial color="#ffd700" metalness={0.85} roughness={0.2} />
              </mesh>
              {/* 5 Crown Spikes */}
              {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i * Math.PI * 2) / 5;
                const r = 0.09;
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(angle) * r, 0.042, Math.sin(angle) * r]}
                    rotation={[0, -angle, 0]}
                  >
                    <coneGeometry args={[0.022, 0.065, 8]} />
                    <meshStandardMaterial color="#ffd700" metalness={0.88} roughness={0.2} />
                  </mesh>
                );
              })}
              {/* Center Ruby */}
              <mesh position={[0, 0.025, 0.092]}>
                <sphereGeometry args={[0.016, 8, 8]} />
                <meshStandardMaterial color="#e91e63" roughness={0.1} />
              </mesh>
            </group>
          )}

          {hat === 'hat_party' && (
            <group position={[0.01, 0.23, 0.015]} rotation={[0.05, 0, 0.12]} scale={0.85}>
              <mesh castShadow position={[0, 0.12, 0]}>
                <coneGeometry args={[0.10, 0.24, 18]} />
                <meshStandardMaterial color="#ff4081" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.095, 0.10, 0.025, 18]} />
                <meshStandardMaterial color="#ffeb3b" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.24, 0]}>
                <sphereGeometry args={[0.028, 12, 12]} />
                <meshStandardMaterial color="#00e5ff" roughness={0.6} />
              </mesh>
            </group>
          )}

          {hat === 'hat_cap' && (
            <group position={[0, 0.19, -0.01]} rotation={[-0.06, 0, 0]} scale={0.85}>
              <mesh castShadow position={[0, 0.02, 0]}>
                <sphereGeometry args={[0.14, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#0288d1" roughness={0.5} />
              </mesh>
              <mesh castShadow position={[0, 0.01, -0.13]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.16, 0.015, 0.09]} />
                <meshStandardMaterial color="#01579b" roughness={0.4} />
              </mesh>
            </group>
          )}

          {hat === 'hat_beanie' && (
            <group position={[0, 0.19, 0.015]} rotation={[-0.04, 0, 0]} scale={0.85}>
              <mesh castShadow position={[0, 0.04, 0]}>
                <sphereGeometry args={[0.15, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
                <meshStandardMaterial color="#8e24aa" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.01, 0]}>
                <torusGeometry args={[0.14, 0.024, 12, 24]} />
                <meshStandardMaterial color="#7b1fa2" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.19, 0]}>
                <sphereGeometry args={[0.035, 12, 12]} />
                <meshStandardMaterial color="#e1bee7" roughness={0.9} />
              </mesh>
            </group>
          )}

          {/* EYEGLASSES & SHADES (Precisely calibrated at eye level: y = 0.112, z = 0.115) */}
          {glasses === 'glasses_cool' && (
            <group position={[0, 0.112, 0.115]}>
              {/* Left Frame & Dark Lens */}
              <mesh position={[-0.046, 0, 0]}>
                <boxGeometry args={[0.066, 0.038, 0.012]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.2} />
              </mesh>
              {/* Right Frame & Dark Lens */}
              <mesh position={[0.046, 0, 0]}>
                <boxGeometry args={[0.066, 0.038, 0.012]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.2} />
              </mesh>
              {/* Center Bridge */}
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.026, 0.008, 0.009]} />
                <meshStandardMaterial color="#111111" />
              </mesh>
              {/* Left Temple Arm extending back to ear */}
              <mesh position={[-0.078, 0.004, -0.065]} rotation={[0, 0.08, 0]}>
                <boxGeometry args={[0.006, 0.006, 0.13]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
              {/* Right Temple Arm extending back to ear */}
              <mesh position={[0.078, 0.004, -0.065]} rotation={[0, -0.08, 0]}>
                <boxGeometry args={[0.006, 0.006, 0.13]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            </group>
          )}

          {glasses === 'glasses_heart' && (
            <group position={[0, 0.112, 0.115]}>
              {/* Left Heart Lens */}
              <mesh position={[-0.046, 0, 0]} rotation={[0, 0, 0.1]}>
                <cylinderGeometry args={[0.038, 0.038, 0.012, 16]} />
                <meshStandardMaterial color="#ff4081" transparent opacity={0.85} roughness={0.1} />
              </mesh>
              {/* Right Heart Lens */}
              <mesh position={[0.046, 0, 0]} rotation={[0, 0, -0.1]}>
                <cylinderGeometry args={[0.038, 0.038, 0.012, 16]} />
                <meshStandardMaterial color="#ff4081" transparent opacity={0.85} roughness={0.1} />
              </mesh>
              {/* Center Bridge */}
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.026, 0.008, 0.008]} />
                <meshStandardMaterial color="#c2185b" roughness={0.3} />
              </mesh>
              {/* Left Temple Arm */}
              <mesh position={[-0.078, 0.004, -0.065]} rotation={[0, 0.08, 0]}>
                <boxGeometry args={[0.005, 0.006, 0.13]} />
                <meshStandardMaterial color="#c2185b" />
              </mesh>
              {/* Right Temple Arm */}
              <mesh position={[0.078, 0.004, -0.065]} rotation={[0, -0.08, 0]}>
                <boxGeometry args={[0.005, 0.006, 0.13]} />
                <meshStandardMaterial color="#c2185b" />
              </mesh>
            </group>
          )}

          {glasses === 'glasses_nerd' && (
            <group position={[0, 0.112, 0.115]}>
              {/* Left Round Wire Frame */}
              <mesh position={[-0.046, 0, 0]}>
                <torusGeometry args={[0.034, 0.004, 8, 24]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
              </mesh>
              {/* Right Round Wire Frame */}
              <mesh position={[0.046, 0, 0]}>
                <torusGeometry args={[0.034, 0.004, 8, 24]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
              </mesh>
              {/* Bridge */}
              <mesh position={[0, 0.008, 0]}>
                <boxGeometry args={[0.026, 0.005, 0.005]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} />
              </mesh>
              {/* Left Temple Arm */}
              <mesh position={[-0.078, 0.004, -0.065]} rotation={[0, 0.08, 0]}>
                <boxGeometry args={[0.005, 0.005, 0.13]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} />
              </mesh>
              {/* Right Temple Arm */}
              <mesh position={[0.078, 0.004, -0.065]} rotation={[0, -0.08, 0]}>
                <boxGeometry args={[0.005, 0.005, 0.13]} />
                <meshStandardMaterial color="#d4af37" metalness={0.85} />
              </mesh>
            </group>
          )}

          {glasses === 'glasses_star' && (
            <group position={[0, 0.112, 0.115]}>
              {/* Left Star */}
              <mesh position={[-0.046, 0, 0]}>
                <cylinderGeometry args={[0.040, 0.040, 0.012, 5]} />
                <meshStandardMaterial color="#ffd600" transparent opacity={0.85} roughness={0.2} />
              </mesh>
              {/* Right Star */}
              <mesh position={[0.046, 0, 0]}>
                <cylinderGeometry args={[0.040, 0.040, 0.012, 5]} />
                <meshStandardMaterial color="#ffd600" transparent opacity={0.85} roughness={0.2} />
              </mesh>
              {/* Bridge */}
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.026, 0.008, 0.008]} />
                <meshStandardMaterial color="#ffab00" />
              </mesh>
              {/* Left Temple Arm */}
              <mesh position={[-0.078, 0.004, -0.065]} rotation={[0, 0.08, 0]}>
                <boxGeometry args={[0.005, 0.006, 0.13]} />
                <meshStandardMaterial color="#ffab00" />
              </mesh>
              {/* Right Temple Arm */}
              <mesh position={[0.078, 0.004, -0.065]} rotation={[0, -0.08, 0]}>
                <boxGeometry args={[0.005, 0.006, 0.13]} />
                <meshStandardMaterial color="#ffab00" />
              </mesh>
            </group>
          )}

          {glasses === 'glasses_visor' && (
            <group position={[0, 0.112, 0.115]}>
              {/* Sleek Curved Cyber Visor Lens */}
              <mesh position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.088, 0.088, 0.034, 24, 1, false, Math.PI * 0.72, Math.PI * 0.56]} />
                <meshStandardMaterial 
                  color="#00e5ff" 
                  emissive="#00bcd4" 
                  emissiveIntensity={0.65} 
                  transparent 
                  opacity={0.85} 
                  roughness={0.1} 
                />
              </mesh>
              {/* Top Brow Frame */}
              <mesh position={[0, 0.018, 0.004]}>
                <boxGeometry args={[0.155, 0.006, 0.010]} />
                <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Left Temple Arm */}
              <mesh position={[-0.078, 0.006, -0.065]} rotation={[0, 0.08, 0]}>
                <boxGeometry args={[0.006, 0.006, 0.13]} />
                <meshStandardMaterial color="#111111" metalness={0.8} />
              </mesh>
              {/* Right Temple Arm */}
              <mesh position={[0.078, 0.006, -0.065]} rotation={[0, -0.08, 0]}>
                <boxGeometry args={[0.006, 0.006, 0.13]} />
                <meshStandardMaterial color="#111111" metalness={0.8} />
              </mesh>
            </group>
          )}
        </group>,
        head
      )}

      {/* 2. NECK & COLLAR ATTACHMENTS (Parented to Neck or Spine) */}
      {(neck || spine) && createPortal(
        <group name="neck-accessories-portal">
          {accessory === 'accessory_bowtie' && (
            <group position={[0, 0.06, 0.13]} scale={0.95}>
              <mesh castShadow>
                <sphereGeometry args={[0.020, 10, 10]} />
                <meshStandardMaterial color="#d32f2f" roughness={0.4} />
              </mesh>
              <mesh position={[-0.034, 0, 0]} rotation={[0, 0, 0.15]}>
                <coneGeometry args={[0.024, 0.055, 10]} />
                <meshStandardMaterial color="#e53935" roughness={0.4} />
              </mesh>
              <mesh position={[0.034, 0, 0]} rotation={[0, 0, -0.15]}>
                <coneGeometry args={[0.024, 0.055, 10]} />
                <meshStandardMaterial color="#e53935" roughness={0.4} />
              </mesh>
            </group>
          )}

          {accessory === 'accessory_scarf' && (
            <group position={[0, 0.06, 0.05]} rotation={[0.05, 0, 0]} scale={0.9}>
              <mesh castShadow>
                <torusGeometry args={[0.13, 0.035, 12, 24]} />
                <meshStandardMaterial color="#ec407a" roughness={0.7} />
              </mesh>
              <mesh position={[0.07, -0.10, 0.09]} rotation={[0.1, 0, -0.1]}>
                <boxGeometry args={[0.05, 0.14, 0.022]} />
                <meshStandardMaterial color="#f06292" roughness={0.7} />
              </mesh>
            </group>
          )}
        </group>,
        neck || spine
      )}

      {/* 3. BACK & WINGS ATTACHMENT (Parented to Spine) */}
      {spine && createPortal(
        <group name="spine-accessories-portal">
          {accessory === 'accessory_wings' && (
            <group ref={wingsRef} position={[0, 0.10, -0.16]} scale={0.9}>
              <group position={[-0.06, 0, 0]}>
                <mesh castShadow position={[-0.13, 0.08, 0]} rotation={[0, 0, 0.3]}>
                  <boxGeometry args={[0.22, 0.15, 0.02]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.3} />
                </mesh>
              </group>
              <group position={[0.06, 0, 0]}>
                <mesh castShadow position={[0.13, 0.08, 0]} rotation={[0, 0, -0.3]}>
                  <boxGeometry args={[0.22, 0.15, 0.02]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.3} />
                </mesh>
              </group>
            </group>
          )}
        </group>,
        spine
      )}
    </>
  );
}
