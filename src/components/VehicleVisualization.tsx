import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Grid, OrbitControls, Environment, Sky } from '@react-three/drei';
import * as THREE from 'three';

// Define the props we expect from App.tsx
interface VehicleVisualizationProps {
  rotation: { x: number; y: number; z: number }; // In DEGREES
  vehicleType: 'scooter' | 'car';
}

// Local models
const MODELS = {
  scooter: '/scooter1.glb',
  car: '/car.glb',
};

function Model({ rotation, vehicleType }: VehicleVisualizationProps) {
  const { scene } = useGLTF(MODELS[vehicleType] || MODELS.scooter);
  const meshRef = useRef<THREE.Group>(null);
  
  // Ref to store the target rotation (Where we WANT to be)
  // This allows us to smooth out the movement between data updates ("Handle Lag")
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));

  // 1. MATERIAL & SHADOW FIXES (Keep this, it makes the car look better)
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        const isGlass = material.name.toLowerCase().includes('window') ||
                        material.name.toLowerCase().includes('glass') ||
                        material.opacity < 0.5;

        if (isGlass) {
          material.transparent = true;
          material.opacity = 0.3;
          material.depthWrite = false;
          material.roughness = 0.0;
          material.metalness = 0.8;
        } else {
          material.transparent = false;
          material.opacity = 1.0;
          material.depthWrite = true;
          material.metalness = 0.1;
          material.roughness = 0.6;
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene, vehicleType]);

  // 2. UPDATE TARGET (Whenever new data arrives)
  useEffect(() => {
    // Convert Degrees (from App) to Radians (for Three.js)
    // We update our "Goal" here, and the useFrame loop will chase it.
    targetRotation.current.set(
      -rotation.x * (Math.PI / 180),
      rotation.y * (Math.PI / 180),
      rotation.z * (Math.PI / 180)
    );
  }, [rotation]);

  // 3. SMOOTH ROTATION (Lag Handling)
  // We perform the interpolation INSIDE the loop. 
  // This fills the gaps between sensor updates with smooth 60fps movement.
  useFrame(() => {
    if (meshRef.current) {
      // Use Lerp to smooth out the lag. 
      // 0.5 is a balanced speed: Snappy enough to feel real-time, 
      // but smooth enough to hide the stutter of network data.
      const smoothingFactor = 0.5;

      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetRotation.current.x,
        smoothingFactor
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotation.current.y,
        smoothingFactor
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        targetRotation.current.z,
        smoothingFactor
      );
    }
  });

  return (
    <group ref={meshRef} dispose={null}>
      <primitive 
        object={scene} 
        scale={vehicleType === 'car' ? 0.6 : 0.5} 
        position={[0, vehicleType === 'car' ? -0.6 : -0.5, 0]}
        rotation={[0, 0, 0]} 
      />
    </group>
  );
}

function SceneEnvironment() {
  return (
    <>
      <Sky distance={450000} sunPosition={[5, 1, 8]} inclination={0} azimuth={0.25} />
      <Environment preset="city" background={false} />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial 
          color="#4a5568" 
          metalness={0.2} 
          roughness={0.6} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      
      <Grid 
        position={[0, -0.5, 0]} 
        args={[10, 10]} 
        cellColor="#cccccc" 
        sectionColor="#888888" 
        fadeDistance={20} 
      />
    </>
  );
}

export default function VehicleVisualization({ rotation, vehicleType }: VehicleVisualizationProps) {
  return (
    <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.5} 
          castShadow 
        />
        
        <SceneEnvironment />

        <Model rotation={rotation} vehicleType={vehicleType} />

        <OrbitControls 
          enablePan={false} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2} 
        />
      </Canvas>
      
      <div className="absolute top-2 left-2 bg-white/10 backdrop-blur p-2 rounded text-xs font-mono text-white pointer-events-none">
        <div>PITCH: {rotation.x.toFixed(1)}°</div>
        <div>ROLL: {rotation.z.toFixed(1)}°</div>
      </div>
    </div>
  );
}

useGLTF.preload(MODELS.scooter);
useGLTF.preload(MODELS.car);