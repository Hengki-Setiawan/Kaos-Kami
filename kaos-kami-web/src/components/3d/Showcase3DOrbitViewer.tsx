"use client";

import React, { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import { RotateCw, RefreshCw, ZoomIn } from "lucide-react";
import type { ApparelType } from "@/lib/constants";

interface Showcase3DOrbitViewerProps {
  apparelSlug: ApparelType;
  colorHex: string;
}

const APPAREL_MODEL_PATHS: Record<string, string> = {
  tshirt: "/models/tee-basic.glb",
  hoodie: "/models/hoodie.glb",
  shirt: "/models/jacket.glb",
  crewneck: "/models/sweater.glb",
  longsleeve: "/models/longsleeve.glb",
};

/**
 * Single Mesh Model with dynamic color tinting & fabric roughness.
 */
function Garment3D({ path, colorHex }: { path: string; colorHex: string }) {
  const gltf = useGLTF(path) as any;
  const groupRef = useRef<THREE.Group>(null);

  // Clone scene so multiple instances don't cross-contaminate materials
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const targetColor = new THREE.Color(colorHex);

    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        // Clone material to allow individual color tint
        const mat = child.material.clone();
        mat.color = targetColor;
        mat.roughness = 0.85; // Natural matte cotton / fleece feel
        mat.metalness = 0.05;
        mat.needsUpdate = true;
        child.material = mat;
      }
    });

    return scene;
  }, [gltf.scene, colorHex]);

  return (
    <Center top>
      <primitive ref={groupRef} object={clonedScene} scale={1.25} />
    </Center>
  );
}

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#666666" wireframe />
    </mesh>
  );
}

export const Showcase3DOrbitViewer: React.FC<Showcase3DOrbitViewerProps> = ({
  apparelSlug,
  colorHex,
}) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const controlsRef = useRef<any>(null);
  const modelPath: string = APPAREL_MODEL_PATHS[apparelSlug] || "/models/tee-basic.glb";

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[460px] bg-gradient-to-b from-[#18181b] to-[#09090b] rounded-2xl overflow-hidden border border-border-subtle flex flex-col">
      {/* 3D Canvas */}
      <div className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [0, 0.2, 2.2], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 6, 4]} intensity={1.8} />
          <directionalLight position={[-4, 4, -3]} intensity={1.0} />
          <directionalLight position={[0, -3, 3]} intensity={0.5} />

          <Suspense fallback={<Loader />}>
            <Garment3D path={modelPath} colorHex={colorHex} />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            autoRotate={autoRotate}
            autoRotateSpeed={2.5}
            enablePan={false}
            enableZoom={true}
            minDistance={1.0}
            maxDistance={3.5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.8}
          />
        </Canvas>

        {/* 360 Badge & Interactive Hints */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] pointer-events-none">
          <RotateCw size={12} className="text-brand-accent animate-spin-slow" />
          <span>3D ORBIT 360° REAL-TIME</span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border backdrop-blur-md transition-all flex items-center gap-1 ${
              autoRotate
                ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                : "bg-black/60 border-white/10 text-text-muted hover:text-white"
            }`}
            title="Nyalakan/Matikan putaran otomatis"
          >
            <RotateCw size={11} />
            <span>{autoRotate ? "Putar: ON" : "Putar: OFF"}</span>
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-[10px] font-mono border bg-black/60 border-white/10 text-text-muted hover:text-white backdrop-blur-md transition-colors"
            title="Reset Sudut Pandang"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Gesture Hint at Bottom */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-text-muted font-mono text-[9px] pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
          <ZoomIn size={11} className="text-brand-accent" />
          <span>Geser untuk memutar • Cubit/Scroll untuk zoom</span>
        </div>
      </div>
    </div>
  );
};
