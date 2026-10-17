import React, { useState, useEffect, Suspense, Component } from 'react';
import { useFrame } from '@react-three/fiber';
import AyushCharacter from './AyushCharacter';
import CustomAyushModel from './CustomAyushModel';

/**
 * 3D Loading Fallback inside Canvas: Cute pulsing heart with soft glow ring
 */
function ModelLoaderIndicator() {
  const meshRef = React.useRef();

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.y = t * 2.5;
      meshRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    }
  });

  return (
    <group position={[0, 0.4, 0]}>
      {/* Floating 3D heart icon */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial 
          color="#ff4081" 
          emissive="#e91e63" 
          emissiveIntensity={0.6} 
          roughness={0.2} 
        />
      </mesh>
      {/* Soft halo */}
      <pointLight distance={2} intensity={1.5} color="#ff80ab" />
    </group>
  );
}

/**
 * Error boundary that catches GLTF parse/network errors and falls back to procedural character
 */
class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.warn('Custom 3D model failed to load. Falling back to procedural character:', error.message);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * AyushModelManager
 * 
 * Orchestrates whether to render the custom 3D avatar (GLB/GLTF) or the procedural chibi avatar.
 * Auto-detects availability of `/models/ayush.glb` or uses a user-supplied model URL.
 */
export default function AyushModelManager({
  customModelUrl,
  currentAction = 'idle',
  onTapPart = () => {},
  isHovered = false,
  setIsHovered = () => {},
  talkingVolume = 0
}) {
  const activeUrl = customModelUrl || '/models/ayush.glb';
  const [defaultModelFound, setDefaultModelFound] = useState(null); // null = probing, true = found, false = not found

  // Probe availability of default model file only when no custom URL is provided
  useEffect(() => {
    if (customModelUrl) return;

    let isMounted = true;
    fetch('/models/ayush.glb', { method: 'HEAD' })
      .then((res) => {
        if (!isMounted) return;
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('text/html')) {
          setDefaultModelFound(true);
        } else {
          setDefaultModelFound(false);
        }
      })
      .catch(() => {
        if (isMounted) setDefaultModelFound(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customModelUrl]);

  // Procedural character as fallback
  const proceduralFallback = (
    <AyushCharacter
      currentAction={currentAction}
      onTapPart={onTapPart}
      isHovered={isHovered}
      setIsHovered={setIsHovered}
      talkingVolume={talkingVolume}
    />
  );

  const isModelActive = customModelUrl ? true : defaultModelFound;

  // If custom model is confirmed not available or errored, render procedural chibi
  if (isModelActive === false) {
    return proceduralFallback;
  }

  // Render Custom Model with ErrorBoundary and Suspense Loader
  return (
    <ModelErrorBoundary 
      fallback={proceduralFallback}
      onError={() => setDefaultModelFound(false)}
    >
      <Suspense fallback={<ModelLoaderIndicator />}>
        {isModelActive === true ? (
          <CustomAyushModel
            modelUrl={activeUrl}
            currentAction={currentAction}
            onTapPart={onTapPart}
            setIsHovered={setIsHovered}
            talkingVolume={talkingVolume}
          />
        ) : (
          proceduralFallback
        )}
      </Suspense>
    </ModelErrorBoundary>
  );
}
