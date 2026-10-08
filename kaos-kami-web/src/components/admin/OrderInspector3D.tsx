"use client";

import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Sun, Moon, RotateCcw } from "lucide-react";
import type { ApparelType, DecalLayer, DecalTargetSide } from "@/lib/constants";
import { extractApparelGeometry } from "@/lib/extractApparelGeometry";
import { CleanDecal } from "@/components/3d/CleanDecal";
import {
  getDecal3DPlacement,
  surfaceZForApparel,
  APPAREL_PHYSICAL_SPECS,
} from "@/lib/scaleCalibration";

export interface InspectorDecal {
  url: string;
  targetSide?: string;
  printWidthCm?: number | null;
  printHeightCm?: number | null;
  offsetFromCollarCm?: number | null;
  x?: number;
  y?: number;
  scale?: number;
}

export interface InspectorSeed {
  decals: (DecalLayer | InspectorDecal)[];
  colorHex: string;
  colorName: string;
  size: string;
  apparel: ApparelType;
  printWidthCm?: number | null;
  printHeightCm?: number | null;
  offsetFromCollarCm?: number | null;
}

export interface OrderInspector3DProps {
  seed: InspectorSeed | null;
  initialTheme?: "obsidian" | "gallery";
  initialSide?: "front" | "back" | "left_sleeve" | "right_sleeve";
  className?: string;
}

const APPAREL_MODEL_PATHS: Record<string, string> = {
  tshirt: "/models/tee-basic.glb",
  hoodie: "/models/hoodie-blue.glb",
  crewneck: "/models/sweater.glb",
  longsleeve: "/models/longsleeve.glb",
  shirt: "/models/jacket.glb",
};

/** Proyeksi Decal Presisi Menggunakan CleanDecal & Matematika getDecal3DPlacement */
function ProjectedDecal({
  url,
  targetSide = "front",
  printWidthCm = 28,
  printHeightCm = 12,
  offsetFromCollarCm = 6.5,
  apparel = "tshirt",
}: {
  url: string;
  targetSide: string;
  printWidthCm?: number;
  printHeightCm?: number;
  offsetFromCollarCm?: number;
  apparel?: string;
}) {
  const texture = useTexture(url);
  const surfaceZ = surfaceZForApparel(apparel);

  const raw = targetSide.toLowerCase();
  const normSide: DecalTargetSide =
    raw.includes("back") || raw.includes("belakang") || raw.includes("punggung")
      ? "back"
      : raw.includes("left_sleeve") || (raw.includes("lengan") && raw.includes("kiri"))
      ? "left_sleeve"
      : raw.includes("right_sleeve") || (raw.includes("lengan") && raw.includes("kanan"))
      ? "right_sleeve"
      : raw.includes("side_left") || (raw.includes("samping") && raw.includes("kiri"))
      ? "side_left"
      : raw.includes("side_right") || (raw.includes("samping") && raw.includes("kanan"))
      ? "side_right"
      : "front";

  const decalX = 0;
  const decalY = normSide === "back" ? -0.04 : normSide === "front" ? -0.05 : 0;

  const placement = getDecal3DPlacement(
    apparel,
    normSide,
    decalX,
    decalY,
    surfaceZ
  );

  const { scaleX, scaleY } = useMemo(() => {
    const imgW = (texture.image as any)?.width || 1;
    const imgH = (texture.image as any)?.height || 1;
    const imgAspect = imgW > 0 && imgH > 0 ? imgW / imgH : 1;

    const spec = APPAREL_PHYSICAL_SPECS[apparel] || APPAREL_PHYSICAL_SPECS["tshirt"];
    const meshMultiplier = spec?.meshMultiplier || 202.0;
    let wUnits = (printWidthCm || 28) / meshMultiplier;
    let hUnits = (printHeightCm || 12) / meshMultiplier;

    if (imgAspect > 0) {
      if (wUnits / hUnits > imgAspect) {
        wUnits = hUnits * imgAspect;
      } else {
        hUnits = wUnits / imgAspect;
      }
    }

    wUnits = Math.max(0.04, Math.min(0.18, wUnits));
    hUnits = Math.max(0.025, Math.min(0.22, hUnits));

    return { scaleX: wUnits, scaleY: hUnits };
  }, [texture, printWidthCm, printHeightCm, apparel]);

  return (
    <CleanDecal
      targetSide={normSide}
      position={placement.position}
      rotation={placement.rotation}
      scale={[scaleX, scaleY, Math.max(0.25, placement.projectionDepth)]}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        polygonOffset
        polygonOffsetFactor={-10}
        roughness={0.4}
        depthTest={true}
        depthWrite={false}
      />
    </CleanDecal>
  );
}

/** 3D Garment Mesh dengan Kalibrasi Identik Client Studio */
function GarmentModel({
  modelPath,
  colorHex,
  decals,
  apparel = "tshirt",
}: {
  modelPath: string;
  colorHex: string;
  decals: {
    url: string;
    targetSide: string;
    printWidthCm?: number;
    printHeightCm?: number;
    offsetFromCollarCm?: number;
  }[];
  apparel?: string;
}) {
  const gltf = useGLTF(modelPath) as any;

  const geometry = useMemo(() => {
    if (!gltf?.scene) return null;
    const isTshirt = modelPath.includes("tee-basic");
    return extractApparelGeometry(gltf.scene, {
      scaleMultiplier: isTshirt ? 0.72 : 0.85,
      crownYOffset: isTshirt ? -0.12 : -0.05,
    });
  }, [gltf?.scene, modelPath]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.82,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }, [colorHex]);

  if (!geometry) return null;

  return (
    <mesh
      castShadow
      receiveShadow
      geometry={geometry}
      material={material}
      position={[0, -0.05, 0]}
    >
      {decals.map((d, i) => (
        <Suspense key={`${d.url}-${d.targetSide}-${i}`} fallback={null}>
          <ProjectedDecal
            url={d.url}
            targetSide={d.targetSide}
            printWidthCm={d.printWidthCm}
            printHeightCm={d.printHeightCm}
            offsetFromCollarCm={d.offsetFromCollarCm}
            apparel={apparel}
          />
        </Suspense>
      ))}
    </mesh>
  );
}

function LoadingSpinner() {
  return (
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#666666" wireframe />
    </mesh>
  );
}

export type CameraAngle = "front" | "back" | "left_sleeve" | "right_sleeve";

/**
 * Self-Contained Isolated 3D Order Inspector:
 * Mendukung inspeksi 4 sisi (Depan, Belakang, Lengan Kiri, Lengan Kanan)
 * dengan proyektor presisi anti-hilang dan identik visual 2D.
 */
export default function OrderInspector3D({
  seed,
  initialTheme = "obsidian",
  initialSide = "front",
  className = "w-full h-full min-h-[420px]",
}: OrderInspector3DProps) {
  const [theme, setTheme] = useState<"obsidian" | "gallery">(initialTheme);
  const [side, setSide] = useState<CameraAngle>((initialSide as CameraAngle) || "front");
  const controlsRef = useRef<any>(null);

  const modelPath = useMemo(() => {
    const slug = seed?.apparel || "tshirt";
    return APPAREL_MODEL_PATHS[slug] || "/models/tee-basic.glb";
  }, [seed?.apparel]);

  const decalsList = useMemo(() => {
    const list: {
      url: string;
      targetSide: string;
      printWidthCm?: number;
      printHeightCm?: number;
      offsetFromCollarCm?: number;
    }[] = [];
    if (seed?.decals && Array.isArray(seed.decals)) {
      for (const d of seed.decals) {
        if (d?.url) {
          list.push({
            url: d.url,
            targetSide: (d as any).targetSide || "front",
            printWidthCm: (d as any).printWidthCm ?? seed.printWidthCm ?? 28,
            printHeightCm: (d as any).printHeightCm ?? seed.printHeightCm ?? 12,
            offsetFromCollarCm: (d as any).offsetFromCollarCm ?? seed.offsetFromCollarCm ?? 6.5,
          });
        }
      }
    }
    return list;
  }, [seed?.decals, seed?.printWidthCm, seed?.printHeightCm, seed?.offsetFromCollarCm]);

  // Handle switching camera angle across 4 key apparel views
  const handleSwitchSide = (newSide: CameraAngle) => {
    setSide(newSide);
    if (controlsRef.current) {
      const cam = controlsRef.current.object;
      if (cam) {
        if (newSide === "front") {
          cam.position.set(0, 0, 1.45);
        } else if (newSide === "back") {
          cam.position.set(0, 0, -1.45);
        } else if (newSide === "left_sleeve") {
          cam.position.set(-1.45, 0, 0);
        } else if (newSide === "right_sleeve") {
          cam.position.set(1.45, 0, 0);
        }
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  };

  const isDark = theme === "obsidian";

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#111114]" : "bg-[#f8fafc]"
      } ${className}`}
    >
      <Canvas
        camera={{ position: [0, 0, 1.45], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", pointerEvents: "auto", position: "relative" }}
      >
        <ambientLight intensity={isDark ? 1.5 : 1.9} />
        <directionalLight position={[2, 3, 3]} intensity={1.6} />
        <directionalLight position={[-2, 1, 2]} intensity={0.9} />
        <directionalLight position={[0, 2, -3]} intensity={1.2} />

        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enablePan={false}
          minDistance={0.8}
          maxDistance={2.5}
        />

        <Suspense fallback={<LoadingSpinner />}>
          <GarmentModel
            modelPath={modelPath}
            colorHex={seed?.colorHex || "#18181b"}
            decals={decalsList}
            apparel={seed?.apparel || "tshirt"}
          />
        </Suspense>
      </Canvas>

      {/* Floating Controls Overlay: Switcher 4 Sisi Kamera & Theme */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg select-none">
        <button
          type="button"
          onClick={() => handleSwitchSide("front")}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            side === "front"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "text-white/80 hover:bg-white/15"
          }`}
          title="Lihat Sisi Dada Depan"
        >
          Depan
        </button>
        <button
          type="button"
          onClick={() => handleSwitchSide("back")}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            side === "back"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "text-white/80 hover:bg-white/15"
          }`}
          title="Lihat Sisi Punggung Belakang"
        >
          Belakang
        </button>
        <button
          type="button"
          onClick={() => handleSwitchSide("left_sleeve")}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            side === "left_sleeve"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "text-white/80 hover:bg-white/15"
          }`}
          title="Lihat Lengan Kiri"
        >
          Lengan Kiri
        </button>
        <button
          type="button"
          onClick={() => handleSwitchSide("right_sleeve")}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
            side === "right_sleeve"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "text-white/80 hover:bg-white/15"
          }`}
          title="Lihat Lengan Kanan"
        >
          Lengan Kanan
        </button>

        <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />

        <button
          type="button"
          onClick={() => setTheme(isDark ? "gallery" : "obsidian")}
          className="p-1 rounded-lg text-white hover:bg-white/15 transition-all cursor-pointer"
          title={isDark ? "Ganti ke Latar Terang" : "Ganti ke Latar Gelap"}
        >
          {isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-sky-300" />}
        </button>

        <button
          type="button"
          onClick={() => handleSwitchSide("front")}
          className="p-1 rounded-lg text-white hover:bg-white/15 transition-all cursor-pointer"
          title="Reset Sudut Kamera"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}
