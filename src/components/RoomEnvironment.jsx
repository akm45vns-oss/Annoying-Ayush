import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getRoomThemeById } from '../utils/roomSettings';

export default function RoomEnvironment({ themeId = 'studio', _lightingMode = 'day' }) {
  const starsRef = useRef();
  const theme = getRoomThemeById(themeId);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <group name="room-environment" position={[0, 0, -0.6]}>
      {/* 1. Curved Back Wall Panel */}
      <mesh receiveShadow position={[0, 0.6, -1.8]}>
        <planeGeometry args={[7.0, 5.0]} />
        <meshStandardMaterial 
          color={theme.wallColor} 
          roughness={0.9} 
          metalness={0.05} 
        />
      </mesh>

      {/* 2. Room Floor Plane */}
      <mesh receiveShadow position={[0, -0.90, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.0, 6.0]} />
        <meshStandardMaterial 
          color={theme.floorColor} 
          roughness={0.8} 
        />
      </mesh>

      {/* 3. Baseboard / Trim molding */}
      <mesh position={[0, -0.86, -1.78]}>
        <boxGeometry args={[7.0, 0.08, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>

      {/* 4. THEME-SPECIFIC 3D DECORATIONS */}
      {themeId === 'studio' && (
        <group position={[0, 0, 0]}>
          {/* Wall Picture Frame: Cute Heart Art */}
          <group position={[1.4, 0.9, -1.76]}>
            <mesh>
              <boxGeometry args={[0.7, 0.9, 0.03]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.6, 0.8]} />
              <meshStandardMaterial color="#ffcdd2" />
            </mesh>
          </group>

          {/* Wall Floating Shelf */}
          <group position={[-1.3, 0.8, -1.76]}>
            <mesh position={[0, 0, 0.08]}>
              <boxGeometry args={[0.9, 0.04, 0.22]} />
              <meshStandardMaterial color="#d7ccc8" roughness={0.6} />
            </mesh>
            {/* Potted Tiny Succulent */}
            <mesh position={[-0.25, 0.10, 0.08]}>
              <cylinderGeometry args={[0.06, 0.05, 0.10, 12]} />
              <meshStandardMaterial color="#b0bec5" />
            </mesh>
            <mesh position={[-0.25, 0.17, 0.08]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#81c784" />
            </mesh>
          </group>
        </group>
      )}

      {themeId === 'sunset' && (
        <group position={[0, 0, 0]}>
          {/* Glowing Sunset Window */}
          <group position={[0, 0.9, -1.77]}>
            <mesh>
              <boxGeometry args={[2.8, 1.8, 0.03]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            {/* Window Glass with Sunset Gradient Feel */}
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[2.6, 1.6]} />
              <meshBasicMaterial color="#ff7043" />
            </mesh>
            {/* Balcony Railing */}
            <mesh position={[0, -0.6, 0.08]}>
              <boxGeometry args={[2.7, 0.04, 0.06]} />
              <meshStandardMaterial color="#37474f" />
            </mesh>
          </group>
        </group>
      )}

      {themeId === 'night' && (
        <group position={[0, 0, 0]}>
          {/* Crescent Moon Wall Lamp */}
          <group position={[1.4, 1.2, -1.76]}>
            <mesh>
              <torusGeometry args={[0.22, 0.045, 12, 24, Math.PI * 1.4]} />
              <meshStandardMaterial color="#fff59d" emissive="#fff59d" emissiveIntensity={0.6} />
            </mesh>
            <pointLight color="#fff9c4" intensity={0.5} distance={2.5} />
          </group>

          {/* Twinkling Star Points */}
          <points ref={starsRef} position={[0, 0.8, -1.74]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    -1.2, 1.2, 0,
                    -0.8, 0.6, 0,
                    -1.5, 0.4, 0,
                    0.2, 1.4, 0,
                    0.8, 1.0, 0,
                    -0.3, 0.9, 0,
                    1.1, 0.5, 0,
                    -1.6, 1.5, 0
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <pointsMaterial size={0.06} color="#ffffff" />
          </points>
        </group>
      )}

      {themeId === 'garden' && (
        <group position={[0, 0, 0]}>
          {/* Garden Paper Lantern */}
          <group position={[-1.4, 1.1, -1.76]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.32, 16]} />
              <meshStandardMaterial color="#ffebee" emissive="#ffcdd2" emissiveIntensity={0.5} />
            </mesh>
            <pointLight color="#ffebee" intensity={0.4} distance={2.0} />
          </group>
        </group>
      )}
    </group>
  );
}
