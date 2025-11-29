import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import type { VehicleType } from '../lib/accidentDetection';

interface VehicleVisualizationProps {
  rotation: { x: number; y: number; z: number };
  vehicleType: VehicleType;
}

function VehicleModel({ rotation, vehicleType }: VehicleVisualizationProps) {
  const modelPath = vehicleType === 'car' ? '/car.glb' : '/scooter1.glb';
  const { scene } = useGLTF(modelPath);
  const meshRef = useRef<THREE.Group>(null);
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });

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
          material.side = THREE.FrontSide;
          material.roughness = 0.0;
          material.metalness = 0.8;
        } else {
          material.transparent = false;
          material.opacity = 1.0;
          material.side = THREE.FrontSide;
          material.depthWrite = true;
          material.metalness = 0.1;
          material.roughness = 0.6;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene, vehicleType]);

  useEffect(() => {
    targetRotationRef.current = {
      x: -rotation.x * (Math.PI / 180),
      y: rotation.y * (Math.PI / 180),
      z: rotation.z * (Math.PI / 180),
    };
  }, [rotation]);

  useFrame(() => {
    if (meshRef.current) {
      const alpha = 0.15;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        targetRotationRef.current.x,
        alpha
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotationRef.current.y,
        alpha
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        targetRotationRef.current.z,
        alpha
      );
    }
  });

  const scale = vehicleType === 'car' ? 0.6 : 0.5;
  const yPosition = vehicleType === 'car' ? -0.6 : -0.5;

  return (
    <group ref={meshRef} position={[0, yPosition, 0]}>
      <Center>
        <primitive
          object={scene}
          scale={scale}
          rotation={[0, 0, 0]}
        />
      </Center>
    </group>
  );
}

function SceneEnvironment() {
  return (
    <>
      <Sky distance={450000} sunPosition={[5, 1, 8]} inclination={0} azimuth={0.25} />
      <Environment preset="city" background={false} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial
          color="#4a5568"
          metalness={0.2}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <gridHelper args={[20, 20, '#2d3748', '#4a5568']} position={[0, -0.99, 0]} />
    </>
  );
}

export default function VehicleVisualization({ rotation, vehicleType }: VehicleVisualizationProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 4], fov: 45 }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.5}
          castShadow
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ffffff" />

        <SceneEnvironment />

        <VehicleModel rotation={rotation} vehicleType={vehicleType} />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/scooter1.glb');
useGLTF.preload('/car.glb');
