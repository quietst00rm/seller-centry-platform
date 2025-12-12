'use client';

import { Canvas } from '@react-three/fiber';
import {
  Environment,
  Float,
  MeshTransmissionMaterial,
  MeshReflectorMaterial,
  ContactShadows
} from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Glass Shield Component with MeshTransmissionMaterial
function GlassShield() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle idle animation
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1 + 0.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1.5}>
      <mesh ref={meshRef} position={[-3.5, 0.3, 0]} scale={1.2}>
        {/* Shield shape using icosahedron for now - cleaner than custom geometry */}
        <icosahedronGeometry args={[1.5, 1]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          resolution={1024}
          transmission={0.95}
          roughness={0.05}
          thickness={2.5}
          ior={1.5}
          chromaticAberration={0.03}
          anisotropy={0.2}
          distortion={0.15}
          distortionScale={0.4}
          temporalDistortion={0.3}
          color="#ffffff"
        />
      </mesh>
    </Float>
  );
}

// Ceramic Chart Bars
function CeramicChart() {
  const groupRef = useRef<THREE.Group>(null);
  const barHeights = [0.7, 1.1, 0.8, 1.4, 1.0, 1.3, 1.8];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.08 - 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.2}>
      <group ref={groupRef} position={[3.2, -0.3, 0]}>
        {barHeights.map((height, i) => (
          <mesh
            key={i}
            position={[(i * 0.45) - 1.35, height / 2 - 0.8, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.32, height, 0.32]} />
            <meshPhysicalMaterial
              color="#FDFBF7"
              roughness={0.15}
              metalness={0.05}
              clearcoat={1}
              clearcoatRoughness={0.1}
              reflectivity={0.8}
              envMapIntensity={0.6}
            />
          </mesh>
        ))}
        {/* Base platform */}
        <mesh position={[0.1, -0.85, 0]} receiveShadow>
          <boxGeometry args={[3.5, 0.08, 0.6]} />
          <meshPhysicalMaterial
            color="#F5F5F5"
            roughness={0.2}
            metalness={0.1}
            clearcoat={0.8}
          />
        </mesh>
      </group>
    </Float>
  );
}

// Main Scene
function Scene() {
  return (
    <>
      {/* Premium Lighting Setup */}
      <ambientLight intensity={0.4} />

      {/* Key Light - Top Left for rim lighting */}
      <spotLight
        position={[-8, 8, 6]}
        angle={0.25}
        penumbra={1}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#ffffff"
      />

      {/* Fill Light - Softer from right */}
      <spotLight
        position={[8, 4, 4]}
        angle={0.3}
        penumbra={1}
        intensity={0.8}
        color="#fff5e6"
      />

      {/* Orange Accent Light */}
      <pointLight
        position={[-2, 0, 3]}
        intensity={0.4}
        color="#FF7F32"
        distance={8}
      />

      {/* HDRI Environment for realistic reflections */}
      <Environment preset="city" />

      {/* 3D Elements */}
      <GlassShield />
      <CeramicChart />

      {/* Subtle contact shadows */}
      <ContactShadows
        position={[0, -2, 0]}
        opacity={0.25}
        scale={12}
        blur={2.5}
        far={4}
      />

      {/* Post Processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.9}
          luminanceSmoothing={0.9}
          mipmapBlur
          intensity={0.8}
          radius={0.7}
        />
      </EffectComposer>
    </>
  );
}

// Loading fallback
function Loader() {
  return null;
}

// Exported Component
export default function HeroScene() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ opacity: 0.9 }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1
        }}
      >
        <Suspense fallback={<Loader />}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
