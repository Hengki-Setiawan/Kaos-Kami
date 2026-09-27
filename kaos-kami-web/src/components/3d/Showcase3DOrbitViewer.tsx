"use client";

import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { RotateCw, RefreshCw, ZoomIn, ZoomOut, Sun, Moon, Maximize2, Minimize2, X } from "lucide-react";
import type { ApparelType } from "@/lib/constants";
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";

interface Showcase3DOrbitViewerProps {
  apparelSlug: ApparelType;
  colorHex: string;
}

const APPAREL_MODEL_PATHS: Record<string, string> = {
  tshirt: "/models/tee-basic.glb",
  hoodie: "/models/hoodie-blue.glb",
  shirt: "/models/jacket.glb",
  crewneck: "/models/sweater.glb",
  longsleeve: "/models/longsleeve.glb",
};

/**
 * Centered Apparel Model rendered as a single unified geometry.
 */
function Garment3D({
  path,
  colorHex,
  isFullscreen,
}: {
  path: string;
  colorHex: string;
  isFullscreen?: boolean;
}) {
  const gltf = useGLTF(path) as any;

  // Extract, harmonize, merge, and mathematically center at (0, 0, 0)
  const geometry = useMemo(() => {
    if (!gltf?.scene) return null;
    return extractApparelGeometry(gltf.scene);
  }, [gltf.scene, path]);

  // Dynamic fabric material with realistic cotton / fleece finish
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.82,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }, [colorHex]);

  // Uniform scale so every apparel fits beautifully inside the view
  const scale = useMemo(() => {
    if (!geometry) return 1.0;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return 1.0;
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y);
    const targetDim = isFullscreen ? 1.55 : 1.40;
    return maxDim > 0 ? targetDim / maxDim : 1.0;
  }, [geometry, isFullscreen]);

  if (!geometry) return null;

  return (
    <mesh
      castShadow
      receiveShadow
      geometry={geometry}
      material={material}
      scale={[scale, scale, scale]}
      position={[0, 0, 0]}
    />
  );
}

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color="#888888" wireframe />
    </mesh>
  );
}

export const Showcase3DOrbitViewer: React.FC<Showcase3DOrbitViewerProps> = ({
  apparelSlug,
  colorHex,
}) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [bgTheme, setBgTheme] = useState<"dark" | "light">("dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsRef = useRef<any>(null);
  const modelPath: string = APPAREL_MODEL_PATHS[apparelSlug] || "/models/tee-basic.glb";

  // Escape key closes fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      const cam = controlsRef.current.object;
      if (cam) {
        cam.position.set(0, 0, 2.05);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  };

  const handleZoom = (delta: number) => {
    if (controlsRef.current) {
      const cam = controlsRef.current.object;
      if (cam) {
        const nextZ = Math.min(3.2, Math.max(1.2, cam.position.z + delta));
        cam.position.z = nextZ;
        controlsRef.current.update();
      }
    }
  };

  const isDark = bgTheme === "dark";

  const renderCanvas = (fs = false) => (
    <div className="relative w-full h-full cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0, 2.05], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={isDark ? 1.4 : 1.7} />
        <directionalLight position={[4, 6, 4]} intensity={isDark ? 1.8 : 2.0} />
        <directionalLight position={[-4, 4, -3]} intensity={isDark ? 1.0 : 1.2} />
        <directionalLight position={[0, -3, 3]} intensity={0.5} />

        <Suspense fallback={<Loader />}>
          <Garment3D path={modelPath} colorHex={colorHex} isFullscreen={fs} />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={2.5}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Top Left Badge: Clean & Minimal */}
      <div
        className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border font-mono text-[10px] pointer-events-none transition-colors ${
          isDark
            ? "bg-black/60 border-white/10 text-white"
            : "bg-white/80 border-slate-300 text-slate-800 shadow-sm"
        }`}
      >
        <RotateCw size={11} className="text-brand-accent animate-spin-slow" />
        <span>3D ORBIT 360°</span>
      </div>

      {/* Top Right Fullscreen Button */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <button
          onClick={() => setIsFullscreen(!fs)}
          className={`p-2 rounded-xl text-xs font-mono border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm ${
            isDark
              ? "bg-black/60 border-white/10 text-white hover:bg-black/80 hover:border-brand-accent"
              : "bg-white/80 border-slate-300 text-slate-800 hover:bg-white hover:border-brand-accent"
          }`}
          title={fs ? "Tutup Layar Penuh (Esc)" : "Buka Layar Penuh (Full View)"}
        >
          {fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span className="hidden sm:inline text-[11px] font-bold">
            {fs ? "TUTUP LAYAR PENUH" : "LAYAR PENUH"}
          </span>
        </button>
      </div>

      {/* Bottom Floating Control Dock (Clean, Organized, Zero Clutter on Head) */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
        {/* Left Side: Auto-Rotate & Contrast */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono border backdrop-blur-md transition-all flex items-center gap-1.5 ${
              autoRotate
                ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                : isDark
                ? "bg-black/60 border-white/10 text-text-muted hover:text-white"
                : "bg-white/80 border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            }`}
            title="Nyalakan/Matikan putaran otomatis"
          >
            <RotateCw size={11} />
            <span>{autoRotate ? "Putar: ON" : "Putar: OFF"}</span>
          </button>

          <button
            onClick={() => setBgTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono border backdrop-blur-md transition-all flex items-center gap-1.5 ${
              isDark
                ? "bg-black/60 border-white/10 text-white hover:bg-black/80"
                : "bg-white/80 border-slate-300 text-slate-800 hover:bg-white shadow-sm"
            }`}
            title="Ganti latar belakang 3D (Hitam / Putih)"
          >
            {isDark ? <Sun size={11} className="text-amber-400" /> : <Moon size={11} className="text-blue-500" />}
            <span>{isDark ? "Latar: Gelap" : "Latar: Terang"}</span>
          </button>
        </div>

        {/* Right Side: Zoom & Reset */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoom(-0.25)}
            className={`p-1.5 rounded-xl text-[10px] font-mono border backdrop-blur-md transition-colors ${
              isDark
                ? "bg-black/60 border-white/10 text-text-muted hover:text-white"
                : "bg-white/80 border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            }`}
            title="Perbesar (Zoom In)"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => handleZoom(0.25)}
            className={`p-1.5 rounded-xl text-[10px] font-mono border backdrop-blur-md transition-colors ${
              isDark
                ? "bg-black/60 border-white/10 text-text-muted hover:text-white"
                : "bg-white/80 border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            }`}
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={handleResetCamera}
            className={`p-1.5 rounded-xl text-[10px] font-mono border backdrop-blur-md transition-colors ${
              isDark
                ? "bg-black/60 border-white/10 text-text-muted hover:text-white"
                : "bg-white/80 border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            }`}
            title="Reset Sudut Pandang"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Standard In-Modal 3D Card */}
      <div
        className={`relative w-full aspect-[4/5] min-h-[420px] md:min-h-[500px] rounded-2xl overflow-hidden border transition-colors duration-300 flex flex-col ${
          isDark
            ? "bg-gradient-to-b from-[#18181b] to-[#09090b] border-border-subtle"
            : "bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] border-slate-300"
        }`}
      >
        {renderCanvas(false)}
      </div>

      {/* True Fullscreen 3D Overlay (when Layar Penuh is clicked) */}
      {isFullscreen && (
        <div
          className={`fixed inset-0 z-[120] flex flex-col p-4 sm:p-8 animate-in fade-in duration-200 transition-colors ${
            isDark ? "bg-[#09090b]/95" : "bg-[#f8fafc]/95"
          } backdrop-blur-xl`}
        >
          {/* Header Close Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle/50 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
                INSPEKSI 3D INTERAKTIF // {apparelSlug.toUpperCase()}
              </span>
              <span className="text-[10px] text-brand-accent font-mono font-bold bg-brand-accent/10 px-2 py-0.5 rounded-full">
                360° IMMERSIVE
              </span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-xs font-mono font-bold"
              title="Tutup Layar Penuh (Esc)"
            >
              <X size={16} />
              <span>TUTUP (ESC)</span>
            </button>
          </div>

          {/* Expanded 3D Canvas */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-border-subtle relative">
            {renderCanvas(true)}
          </div>
        </div>
      )}
    </>
  );
};
