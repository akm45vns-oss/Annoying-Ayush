import React, { useRef } from 'react';
import { useFrame, createPortal } from '@react-three/fiber';

/**
 * 3D High-Fidelity Wardrobe Accessories
 * 
 * Precision-fitted to the Avaturn rigged humanoid armature:
 * - Head Accessories (Cap, Beanie, Crown, Flower, Party Hat) parented to Head bone via createPortal.
 *   - Cranium base: y = 0.132, z = 0.012 (cap sits snugly over skull/hairline, visor curving forward).
 *   - Hair peak / Crown top: y = 0.230, z = 0.018 (crown sits cleanly on hair, not sunken or floating).
 * - Eyewear (Wayfarer Shades, Round Specs, Heart Shades, Star Shades, Cyber Visor) parented to Head bone.
 *   - Eye level & nose bridge: y = 0.071, z = 0.116.
 *   - Temples angle back precisely to left ear [-0.078, 0.071, -0.007] and right ear [0.078, 0.071, -0.008].
 * - Neck Accessories (Bowtie, Scarf) parented to Neck bone: y = 0.035, z = 0.115.
 * - Spine Accessories (Cupid Wings) parented to Spine bone: y = 0.12, z = -0.16.
 * 
 * Materials use realistic PBR textures: matte cotton twill, polished acetate, polarized glass, and gold wire.
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
      {/* 1. HEAD & EYEWEAR ATTACHMENTS (Parented directly to Head bone) */}
      {createPortal(
        <group name="head-accessories-portal">
          {/* SAKURA BLOSSOM PIN */}
          {hat === 'hat_flower' && (
            <group position={[0.072, 0.165, 0.055]} rotation={[0.10, 0.25, -0.20]} scale={0.78}>
              {/* Gold Pin Backing */}
              <mesh position={[0, 0, -0.008]} rotation={[0, 0, 0.8]}>
                <boxGeometry args={[0.005, 0.045, 0.003]} />
                <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Golden Stamen Pistils */}
              <mesh castShadow position={[0, 0, 0.004]}>
                <sphereGeometry args={[0.016, 14, 14]} />
                <meshStandardMaterial color="#ffca28" metalness={0.6} roughness={0.3} />
              </mesh>
              {/* 5 Layered Petals with Pearlescent Rose Gradient */}
              {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i * Math.PI * 2) / 5;
                return (
                  <group key={i} rotation={[0, 0, angle]}>
                    <mesh position={[0, 0.026, 0]} rotation={[0.12, 0, 0]}>
                      <sphereGeometry args={[0.018, 12, 12]} />
                      <meshStandardMaterial color={i % 2 === 0 ? '#ff80ab' : '#ffb2dd'} roughness={0.35} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          )}

          {/* ROYAL GOLDEN CORONET */}
          {hat === 'hat_crown' && (
            <group position={[0, 0.230, 0.018]} rotation={[-0.03, 0, 0]} scale={0.88}>
              {/* Polished Gold Circlet Band */}
              <mesh castShadow position={[0, 0.012, 0]}>
                <cylinderGeometry args={[0.070, 0.067, 0.024, 32, 1, true]} />
                <meshStandardMaterial color="#f5c518" metalness={0.92} roughness={0.16} />
              </mesh>
              <mesh position={[0, 0.001, 0]}>
                <torusGeometry args={[0.068, 0.004, 10, 32]} />
                <meshStandardMaterial color="#ffd700" metalness={0.95} roughness={0.15} />
              </mesh>
              {/* 6 Elegant Royal Arches / Peaks with Finials */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (i * Math.PI * 2) / 6;
                const r = 0.068;
                const isMajor = i % 2 === 0;
                return (
                  <group key={i} position={[Math.cos(angle) * r, 0.024, Math.sin(angle) * r]} rotation={[0, -angle, 0]}>
                    <mesh castShadow position={[0, isMajor ? 0.020 : 0.012, 0]}>
                      <coneGeometry args={[isMajor ? 0.014 : 0.010, isMajor ? 0.040 : 0.026, 8]} />
                      <meshStandardMaterial color="#ffd700" metalness={0.92} roughness={0.18} />
                    </mesh>
                    {/* Inset Gemstone Cabochon */}
                    <mesh position={[0, 0.002, 0.003]}>
                      <sphereGeometry args={[0.006, 10, 10]} />
                      <meshStandardMaterial 
                        color={isMajor ? '#e53935' : '#1e88e5'} 
                        roughness={0.1} 
                        metalness={0.3} 
                      />
                    </mesh>
                  </group>
                );
              })}
            </group>
          )}

          {/* CELEBRATION PARTY CONE */}
          {hat === 'hat_party' && (
            <group position={[0.015, 0.232, 0.015]} rotation={[0.06, 0, 0.10]} scale={0.88}>
              {/* Foil Cone */}
              <mesh castShadow position={[0, 0.09, 0]}>
                <coneGeometry args={[0.066, 0.18, 24]} />
                <meshStandardMaterial color="#e91e63" metalness={0.65} roughness={0.25} />
              </mesh>
              {/* Shiny Gold Spiral Ring */}
              <mesh position={[0, 0.05, 0]} rotation={[0.2, 0.3, 0]}>
                <torusGeometry args={[0.052, 0.005, 8, 24]} />
                <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Scalloped Brim Trim */}
              <mesh position={[0, 0.003, 0]}>
                <torusGeometry args={[0.066, 0.007, 10, 24]} />
                <meshStandardMaterial color="#ffeb3b" roughness={0.4} />
              </mesh>
              {/* Fluffy Pom-Pom at Peak */}
              <mesh position={[0, 0.184, 0]}>
                <sphereGeometry args={[0.018, 14, 14]} />
                <meshStandardMaterial color="#00e5ff" roughness={0.7} />
              </mesh>
            </group>
          )}

          {/* STREETWEAR FITTED BASEBALL CAP */}
          {hat === 'hat_cap' && (
            <group position={[0, 0.132, 0.012]} rotation={[0.07, 0, 0]}>
              {/* 1. Crown Dome (Sculpted oval dome that hugs the cranium from y=0.132 to y=0.238) */}
              <mesh castShadow position={[0, 0, 0]} scale={[1.03, 1.05, 1.12]}>
                <sphereGeometry args={[0.088, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <meshStandardMaterial color="#1f242e" roughness={0.85} metalness={0.05} />
              </mesh>

              {/* 2. Lower Brow Band (Seamlessly hugs cranium perimeter) */}
              <mesh position={[0, -0.001, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.03, 1.12, 1]}>
                <torusGeometry args={[0.088, 0.005, 8, 32]} />
                <meshStandardMaterial color="#181c24" roughness={0.9} />
              </mesh>

              {/* 3. Front Embroidered Crest Patch */}
              <group position={[0, 0.048, 0.096]} rotation={[-0.22, 0, 0]}>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.038, 0.024, 0.003]} />
                  <meshStandardMaterial color="#282e3c" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0, 0.002]}>
                  <boxGeometry args={[0.022, 0.012, 0.002]} />
                  <meshStandardMaterial color="#f0f2f5" roughness={0.4} metalness={0.1} />
                </mesh>
              </group>

              {/* 4. Realistic Curved Visor / Bill (Curves gracefully FORWARD and down over the brow) */}
              <group position={[0, 0.002, 0.090]} rotation={[0.24, 0, 0]}>
                {/* Curved Visor Arch */}
                <mesh castShadow position={[0, 0, 0.030]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.42]}>
                  <cylinderGeometry args={[0.086, 0.086, 0.065, 24, 1, false, Math.PI * 0.22, Math.PI * 0.56]} />
                  <meshStandardMaterial color="#1a1e27" roughness={0.82} />
                </mesh>
                {/* Visor Edge Trim */}
                <mesh position={[0, -0.002, 0.060]}>
                  <boxGeometry args={[0.096, 0.004, 0.006]} />
                  <meshStandardMaterial color="#14171e" roughness={0.88} />
                </mesh>
              </group>

              {/* 5. Top Button (Squatchee) */}
              <mesh castShadow position={[0, 0.095, 0]}>
                <sphereGeometry args={[0.009, 12, 12]} />
                <meshStandardMaterial color="#15171d" roughness={0.8} />
              </mesh>

              {/* 6. Rear Arch & Metallic Buckle */}
              <group position={[0, 0.004, -0.096]} rotation={[-0.10, 0, 0]}>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.042, 0.006, 0.003]} />
                  <meshStandardMaterial color="#181c24" roughness={0.9} />
                </mesh>
                <mesh position={[0.014, 0, 0.002]}>
                  <boxGeometry args={[0.009, 0.008, 0.003]} />
                  <meshStandardMaterial color="#c0c5cc" metalness={0.92} roughness={0.2} />
                </mesh>
              </group>
            </group>
          )}

          {/* COZY RIBBED KNIT BEANIE */}
          {hat === 'hat_beanie' && (
            <group position={[0, 0.134, 0.012]} rotation={[0.05, 0, 0]}>
              {/* Folded Ribbed Cuff */}
              <mesh castShadow position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.04, 1.13, 1]}>
                <torusGeometry args={[0.088, 0.018, 12, 32]} />
                <meshStandardMaterial color="#2d3542" roughness={0.95} />
              </mesh>
              {/* Slouchy Knit Crown */}
              <mesh castShadow position={[0, 0.045, -0.012]} rotation={[-0.10, 0, 0]} scale={[1.03, 1.15, 1.10]}>
                <sphereGeometry args={[0.092, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
                <meshStandardMaterial color="#384152" roughness={0.95} />
              </mesh>
              {/* Top Knit Gathering */}
              <mesh position={[0, 0.135, -0.028]}>
                <sphereGeometry args={[0.016, 12, 12]} />
                <meshStandardMaterial color="#4c586e" roughness={0.95} />
              </mesh>
            </group>
          )}

          {/* CLASSIC POLARIZED WAYFARER SUNGLASSES (Eyewear origin: y=0.071, z=0.116) */}
          {glasses === 'glasses_cool' && (
            <group position={[0, 0.071, 0.116]}>
              {/* LEFT EYE FRAME & POLARIZED LENS */}
              <group position={[-0.036, 0, 0]}>
                {/* Polished Acetate Outer Frame Rim */}
                <mesh position={[0, 0.012, 0]}>
                  <boxGeometry args={[0.050, 0.006, 0.007]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                <mesh position={[0, -0.012, 0]}>
                  <boxGeometry args={[0.042, 0.005, 0.006]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                <mesh position={[-0.024, 0, 0]}>
                  <boxGeometry args={[0.006, 0.028, 0.007]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                <mesh position={[0.022, 0, 0]}>
                  <boxGeometry args={[0.005, 0.024, 0.006]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                {/* Polarized Gradient Tint Lens */}
                <mesh position={[0, 0, 0.001]}>
                  <boxGeometry args={[0.042, 0.024, 0.003]} />
                  <meshStandardMaterial 
                    color="#14171f" 
                    transparent 
                    opacity={0.80} 
                    roughness={0.06} 
                    metalness={0.20} 
                  />
                </mesh>
                {/* Chrome Corner Rivet Accent */}
                <mesh position={[-0.022, 0.011, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.002, 0.002, 0.003, 8]} />
                  <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.1} />
                </mesh>
              </group>

              {/* RIGHT EYE FRAME & POLARIZED LENS */}
              <group position={[0.036, 0, 0]}>
                {/* Polished Acetate Outer Frame Rim */}
                <mesh position={[0, 0.012, 0]}>
                  <boxGeometry args={[0.050, 0.006, 0.007]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                <mesh position={[0, -0.012, 0]}>
                  <boxGeometry args={[0.042, 0.005, 0.006]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                <mesh position={[0.024, 0, 0]}>
                  <boxGeometry args={[0.006, 0.028, 0.007]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                <mesh position={[-0.022, 0, 0]}>
                  <boxGeometry args={[0.005, 0.024, 0.006]} />
                  <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
                </mesh>
                {/* Polarized Gradient Tint Lens */}
                <mesh position={[0, 0, 0.001]}>
                  <boxGeometry args={[0.042, 0.024, 0.003]} />
                  <meshStandardMaterial 
                    color="#14171f" 
                    transparent 
                    opacity={0.80} 
                    roughness={0.06} 
                    metalness={0.20} 
                  />
                </mesh>
                {/* Chrome Corner Rivet Accent */}
                <mesh position={[0.022, 0.011, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.002, 0.002, 0.003, 8]} />
                  <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.1} />
                </mesh>
              </group>

              {/* KEYHOLE NOSE BRIDGE */}
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.018, 0.006, 0.007]} />
                <meshStandardMaterial color="#121316" roughness={0.12} metalness={0.15} />
              </mesh>

              {/* ERGONOMIC TEMPLE ARMS (Extending from outer brow back to ear hinge at z = -0.125) */}
              {/* Left Temple Arm */}
              <group position={[-0.062, 0.007, -0.004]}>
                <mesh position={[-0.009, -0.002, -0.060]} rotation={[0.04, 0.13, 0]}>
                  <boxGeometry args={[0.004, 0.006, 0.125]} />
                  <meshStandardMaterial color="#121316" roughness={0.15} />
                </mesh>
                {/* Ear hook curve */}
                <mesh position={[-0.017, -0.010, -0.122]} rotation={[0.4, 0, 0]}>
                  <boxGeometry args={[0.004, 0.014, 0.005]} />
                  <meshStandardMaterial color="#121316" roughness={0.15} />
                </mesh>
              </group>

              {/* Right Temple Arm */}
              <group position={[0.062, 0.007, -0.004]}>
                <mesh position={[0.009, -0.002, -0.060]} rotation={[0.04, -0.13, 0]}>
                  <boxGeometry args={[0.004, 0.006, 0.125]} />
                  <meshStandardMaterial color="#121316" roughness={0.15} />
                </mesh>
                {/* Ear hook curve */}
                <mesh position={[0.017, -0.010, -0.122]} rotation={[0.4, 0, 0]}>
                  <boxGeometry args={[0.004, 0.014, 0.005]} />
                  <meshStandardMaterial color="#121316" roughness={0.15} />
                </mesh>
              </group>
            </group>
          )}

          {/* DELICATE GOLD WIRE ROUND SPECS */}
          {glasses === 'glasses_nerd' && (
            <group position={[0, 0.071, 0.116]}>
              {/* Left Round Wire Rim & Glass */}
              <group position={[-0.034, 0, 0]}>
                <mesh>
                  <torusGeometry args={[0.021, 0.0022, 12, 32]} />
                  <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.019, 0.019, 0.002, 24]} />
                  <meshStandardMaterial color="#dcf5f8" transparent opacity={0.32} roughness={0.04} metalness={0.1} />
                </mesh>
              </group>

              {/* Right Round Wire Rim & Glass */}
              <group position={[0.034, 0, 0]}>
                <mesh>
                  <torusGeometry args={[0.021, 0.0022, 12, 32]} />
                  <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.019, 0.019, 0.002, 24]} />
                  <meshStandardMaterial color="#dcf5f8" transparent opacity={0.32} roughness={0.04} metalness={0.1} />
                </mesh>
              </group>

              {/* Arched Gold Bridge Wire */}
              <mesh position={[0, 0.006, 0]}>
                <torusGeometry args={[0.011, 0.0018, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
              </mesh>

              {/* Thin Wire Temples */}
              <mesh position={[-0.066, 0.002, -0.062]} rotation={[0.04, 0.13, 0]}>
                <boxGeometry args={[0.0025, 0.0025, 0.126]} />
                <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
              </mesh>
              <mesh position={[0.066, 0.002, -0.062]} rotation={[0.04, -0.13, 0]}>
                <boxGeometry args={[0.0025, 0.0025, 0.126]} />
                <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.15} />
              </mesh>
            </group>
          )}

          {/* ROSE GOLD HEART SHADES */}
          {glasses === 'glasses_heart' && (
            <group position={[0, 0.071, 0.116]}>
              {/* Left Heart Lens */}
              <mesh position={[-0.035, 0, 0]} rotation={[0, 0, 0.08]}>
                <cylinderGeometry args={[0.025, 0.025, 0.004, 16]} />
                <meshStandardMaterial color="#ff4081" transparent opacity={0.78} roughness={0.08} metalness={0.25} />
              </mesh>
              {/* Right Heart Lens */}
              <mesh position={[0.035, 0, 0]} rotation={[0, 0, -0.08]}>
                <cylinderGeometry args={[0.025, 0.025, 0.004, 16]} />
                <meshStandardMaterial color="#ff4081" transparent opacity={0.78} roughness={0.08} metalness={0.25} />
              </mesh>
              {/* Delicate Gold Bridge & Temples */}
              <mesh position={[0, 0.005, 0]}>
                <boxGeometry args={[0.018, 0.003, 0.004]} />
                <meshStandardMaterial color="#f06292" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[-0.064, 0.003, -0.062]} rotation={[0.04, 0.13, 0]}>
                <boxGeometry args={[0.003, 0.003, 0.125]} />
                <meshStandardMaterial color="#f06292" metalness={0.8} />
              </mesh>
              <mesh position={[0.064, 0.003, -0.062]} rotation={[0.04, -0.13, 0]}>
                <boxGeometry args={[0.003, 0.003, 0.125]} />
                <meshStandardMaterial color="#f06292" metalness={0.8} />
              </mesh>
            </group>
          )}

          {/* Y2K AMBER STAR SHADES */}
          {glasses === 'glasses_star' && (
            <group position={[0, 0.071, 0.116]}>
              <mesh position={[-0.035, 0, 0]}>
                <cylinderGeometry args={[0.026, 0.026, 0.004, 5]} />
                <meshStandardMaterial color="#ffb300" transparent opacity={0.78} roughness={0.10} metalness={0.3} />
              </mesh>
              <mesh position={[0.035, 0, 0]}>
                <cylinderGeometry args={[0.026, 0.026, 0.004, 5]} />
                <meshStandardMaterial color="#ffb300" transparent opacity={0.78} roughness={0.10} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.004, 0]}>
                <boxGeometry args={[0.018, 0.004, 0.004]} />
                <meshStandardMaterial color="#ffc107" metalness={0.85} roughness={0.2} />
              </mesh>
              <mesh position={[-0.064, 0.003, -0.062]} rotation={[0.04, 0.13, 0]}>
                <boxGeometry args={[0.003, 0.004, 0.125]} />
                <meshStandardMaterial color="#ffc107" metalness={0.85} />
              </mesh>
              <mesh position={[0.064, 0.003, -0.062]} rotation={[0.04, -0.13, 0]}>
                <boxGeometry args={[0.003, 0.004, 0.125]} />
                <meshStandardMaterial color="#ffc107" metalness={0.85} />
              </mesh>
            </group>
          )}

          {/* AERODYNAMIC CYBER VISOR */}
          {glasses === 'glasses_visor' && (
            <group position={[0, 0.071, 0.116]}>
              {/* Sleek Aerodynamic Wrap-Around Curved Shield */}
              <mesh position={[0, 0, -0.018]} rotation={[0, -Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.082, 0.082, 0.036, 32, 1, true, Math.PI * 0.22, Math.PI * 0.56]} />
                <meshStandardMaterial 
                  color="#00e5ff" 
                  emissive="#00b0ff" 
                  emissiveIntensity={0.50} 
                  transparent 
                  opacity={0.80} 
                  roughness={0.08} 
                />
              </mesh>
              {/* Titanium Brow Bar */}
              <mesh position={[0, 0.017, 0.002]}>
                <boxGeometry args={[0.135, 0.005, 0.008]} />
                <meshStandardMaterial color="#212429" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Temples */}
              <mesh position={[-0.068, 0.008, -0.060]} rotation={[0.04, 0.12, 0]}>
                <boxGeometry args={[0.004, 0.006, 0.125]} />
                <meshStandardMaterial color="#212429" metalness={0.85} />
              </mesh>
              <mesh position={[0.068, 0.008, -0.060]} rotation={[0.04, -0.12, 0]}>
                <boxGeometry args={[0.004, 0.006, 0.125]} />
                <meshStandardMaterial color="#212429" metalness={0.85} />
              </mesh>
            </group>
          )}
        </group>,
        head
      )}

      {/* 2. NECK & COLLAR ATTACHMENTS (Parented to Neck or Spine) */}
      {(neck || spine) && createPortal(
        <group name="neck-accessories-portal">
          {/* DAPPER SATIN BOWTIE */}
          {accessory === 'accessory_bowtie' && (
            <group position={[0, 0.035, 0.115]} scale={0.92}>
              {/* Center Fold Knot */}
              <mesh castShadow>
                <sphereGeometry args={[0.016, 12, 12]} />
                <meshStandardMaterial color="#b71c1c" roughness={0.35} />
              </mesh>
              {/* Left Wing Pleats */}
              <mesh position={[-0.028, 0, 0]} rotation={[0, 0, 0.12]}>
                <coneGeometry args={[0.020, 0.046, 12]} />
                <meshStandardMaterial color="#c62828" roughness={0.35} />
              </mesh>
              {/* Right Wing Pleats */}
              <mesh position={[0.028, 0, 0]} rotation={[0, 0, -0.12]}>
                <coneGeometry args={[0.020, 0.046, 12]} />
                <meshStandardMaterial color="#c62828" roughness={0.35} />
              </mesh>
              {/* Collar Band */}
              <mesh position={[0, 0, -0.006]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.088, 0.005, 8, 24]} />
                <meshStandardMaterial color="#880e4f" roughness={0.5} />
              </mesh>
            </group>
          )}

          {/* COZY WOOLEN WINTER SCARF */}
          {accessory === 'accessory_scarf' && (
            <group position={[0, 0.030, 0.045]} rotation={[0.05, 0, 0]} scale={0.92}>
              {/* Main Knitted Collar Ring */}
              <mesh castShadow>
                <torusGeometry args={[0.115, 0.030, 14, 28]} />
                <meshStandardMaterial color="#d81b60" roughness={0.85} />
              </mesh>
              {/* Hanging Folded Tail */}
              <mesh position={[0.06, -0.085, 0.085]} rotation={[0.1, 0, -0.1]}>
                <boxGeometry args={[0.046, 0.13, 0.020]} />
                <meshStandardMaterial color="#e91e63" roughness={0.85} />
              </mesh>
              {/* Tassel Fringe */}
              <mesh position={[0.06, -0.155, 0.085]}>
                <boxGeometry args={[0.046, 0.015, 0.008]} />
                <meshStandardMaterial color="#f8bbd0" roughness={0.9} />
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
            <group ref={wingsRef} position={[0, 0.12, -0.16]} scale={0.92}>
              {/* Left Feathered Wing */}
              <group position={[-0.05, 0, 0]}>
                <mesh castShadow position={[-0.12, 0.07, 0]} rotation={[0, 0, 0.28]}>
                  <boxGeometry args={[0.20, 0.13, 0.018]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                </mesh>
                <mesh castShadow position={[-0.18, 0.12, 0]} rotation={[0, 0, 0.42]}>
                  <boxGeometry args={[0.14, 0.09, 0.014]} />
                  <meshStandardMaterial color="#f8f9fa" roughness={0.35} />
                </mesh>
              </group>
              {/* Right Feathered Wing */}
              <group position={[0.05, 0, 0]}>
                <mesh castShadow position={[0.12, 0.07, 0]} rotation={[0, 0, -0.28]}>
                  <boxGeometry args={[0.20, 0.13, 0.018]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                </mesh>
                <mesh castShadow position={[0.18, 0.12, 0]} rotation={[0, 0, -0.42]}>
                  <boxGeometry args={[0.14, 0.09, 0.014]} />
                  <meshStandardMaterial color="#f8f9fa" roughness={0.35} />
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
