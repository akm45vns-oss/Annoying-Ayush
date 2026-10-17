import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Procedural 2D Heart Shape for Extrusion or Flat Mesh
function createHeartShape() {
  const shape = new THREE.Shape();
  const x = 0, y = 0;
  shape.moveTo(x + 0.25, y + 0.25);
  shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
  shape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
  shape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 1.0);
  shape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
  shape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
  shape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);
  return shape;
}

const HEART_SHAPE = createHeartShape();

/**
 * Individual Floating 3D Heart
 */
function SingleHeart({ startPos, speed, scale, color, onComplete }) {
  const meshRef = useRef();
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    progressRef.current += delta * speed;
    if (progressRef.current >= 1) {
      onComplete();
      return;
    }

    const p = progressRef.current;
    if (meshRef.current) {
      // Float upward with subtle sway
      meshRef.current.position.y = startPos[1] + p * 1.8;
      meshRef.current.position.x = startPos[0] + Math.sin(p * 5 + startPos[0]) * 0.25;
      meshRef.current.position.z = startPos[2] + Math.cos(p * 4) * 0.15;
      
      // Gentle spin
      meshRef.current.rotation.z = Math.sin(p * 4) * 0.3;
      meshRef.current.rotation.y = p * 2.5;

      // Pop in scale then fade
      const s = Math.sin(p * Math.PI) * scale;
      meshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={meshRef} position={startPos} rotation={[Math.PI, 0, 0]}>
      <shapeGeometry args={[HEART_SHAPE]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.3} 
        emissive={color}
        emissiveIntensity={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * FloatingHearts Layer
 * Listens to burst count and emits self-cleaning hearts
 */
export default function FloatingHearts({ burstTrigger = 0 }) {
  const [hearts, setHearts] = React.useState([]);
  const heartIdCounter = useRef(0);
  const prevTrigger = useRef(burstTrigger);

  const colors = useMemo(() => ['#ff3366', '#ff6b8b', '#ff4081', '#f06292', '#e91e63'], []);

  React.useEffect(() => {
    if (burstTrigger > 0 && burstTrigger !== prevTrigger.current) {
      prevTrigger.current = burstTrigger;
      
      // Spawn 8-12 hearts
      const count = 9;
      const newHearts = [];
      for (let i = 0; i < count; i++) {
        const id = ++heartIdCounter.current;
        newHearts.push({
          id,
          startPos: [
            (Math.random() - 0.5) * 0.8,
            1.1 + Math.random() * 0.6,
            0.2 + (Math.random() - 0.5) * 0.5
          ],
          speed: 0.6 + Math.random() * 0.4,
          scale: 0.22 + Math.random() * 0.16,
          color: colors[i % colors.length]
        });
      }

      setHearts(prev => [...prev.slice(-18), ...newHearts]);
    }
  }, [burstTrigger, colors]);

  const removeHeart = React.useCallback((id) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  return (
    <group>
      {hearts.map(heart => (
        <SingleHeart
          key={heart.id}
          startPos={heart.startPos}
          speed={heart.speed}
          scale={heart.scale}
          color={heart.color}
          onComplete={() => removeHeart(heart.id)}
        />
      ))}
    </group>
  );
}
