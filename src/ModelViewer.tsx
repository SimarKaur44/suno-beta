import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Html, useProgress } from '@react-three/drei';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress.toFixed(0)}% loading</Html>;
}

export default function ModelViewer({ url }: { url: string }) {
  const gltf = useGLTF(url);

  return (
    <Canvas camera={{ position: [0, 1.5, 2], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 2]} intensity={1} />
      <Suspense fallback={<Loader />}>
        <primitive object={gltf.scene} position={[0, 0, 0]} scale={1} />
      </Suspense>
      <OrbitControls enablePan={true} enableZoom={true} />
    </Canvas>
  );
}
