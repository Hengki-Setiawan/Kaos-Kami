"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { useResourceTracker } from "@/lib/threeResourceTracker";
import { SilentModelFallback } from "@/components/ui/ModelErrorBoundary";

const MODEL_PATH = "/models/mannequin.glb";

const PRESET_TO_CLIP: Record<"static" | "wind" | "walking" | "knit", string> = {
  static: "Rig|Idle_Loop",
  wind: "Rig|Idle_Loop",
  walking: "Rig|Walk_Loop",
  knit: "Rig|Jog_Fwd_Loop",
};

// Pola kode proyek: crossfade 0.15–0.25s antar klip (tengah rentang).
const CROSSFADE_S = 0.2;

/** Cari action: nama persis dulu, fallback mengandung kata kunci (file ganti). */
function pickAction(
  actions: Record<string, THREE.AnimationAction>,
  wantName: string,
  keyword: string
): THREE.AnimationAction | null {
  // Akses eksplisit (tsconfig noUncheckedIndexedAccess): tanpa narrowing
  // implisit akses indeks.
  const exact: THREE.AnimationAction | undefined = actions[wantName];
  if (exact) return exact;
  const lower = keyword.toLowerCase();
  const key: string | undefined = Object.keys(actions).find((k) =>
    k.toLowerCase().includes(lower)
  );
  if (!key) return null;
  const found: THREE.AnimationAction | undefined = actions[key];
  return found ?? null;
}

function meshMaterials(obj: THREE.Object3D): THREE.Material[] {
  const mesh = obj as THREE.Mesh;
  if (!mesh || !(mesh as unknown as { isMesh?: boolean }).isMesh) return [];
  const mat = (mesh as THREE.Mesh).material as
    | THREE.Material
    | THREE.Material[]
    | undefined;
  if (!mat) return [];
  return (Array.isArray(mat) ? mat : [mat]).filter(Boolean);
}

const MannequinInner: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_PATH) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const { selectedColor, isRotating, modelPosX, modelPosY, modelScale, viewMode } =
    useConfiguratorStore(
      useShallow((s) => ({
        selectedColor: s.selectedColor,
        isRotating: s.isRotating,
        modelPosX: s.modelPosX,
        modelPosY: s.modelPosY,
        modelScale: s.modelScale,
        viewMode: s.viewMode,
      }))
    );
  const { animationPreset, animationSpeed } = useConfiguratorStore(
    useShallow((s) => ({ animationPreset: s.animationPreset, animationSpeed: s.animationSpeed }))
  );

  // Clone milik sendiri via SkeletonUtils (skin + skeleton ikut benar) agar
  // tint material & dispose AMAN tanpa menyentuh cache GLB drei (aturan
  // tracker #2: cache milik bersama, JANGAN dispose). Clone 13.7k tris = murah.
  const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);

  // Dispose via ResourceTracker terpisah per jenis (pola model lain): hanya
  // hasil clone milik sendiri yang di-track; cache drei tak pernah disentuh.
  const geoTracker = useResourceTracker();
  const matTracker = useResourceTracker();
  useEffect(() => {
    const seenGeo = new Set<THREE.BufferGeometry>();
    const seenMat = new Set<THREE.Material>();
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
      const geo = mesh.geometry as THREE.BufferGeometry | undefined;
      if (geo && !seenGeo.has(geo)) {
        seenGeo.add(geo);
        geoTracker.track(geo);
      }
      for (const m of meshMaterials(o)) {
        if (!seenMat.has(m)) {
          seenMat.add(m);
          matTracker.track(m);
        }
      }
    });
    // Tracker dispose otomatis saat unmount (hook useResourceTracker).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone, geoTracker, matTracker]);

  // Tint material kulit / pakaian manekin (M_Main)
  const tintMaterials = useMemo(() => {
    const byName: THREE.Material[] = [];
    clone.traverse((o) => {
      for (const m of meshMaterials(o)) {
        if (m.name === "M_Main" && !byName.includes(m)) byName.push(m);
      }
    });
    if (byName.length > 0) return byName;
    const mannequinMesh =
      clone.getObjectByName("Mannequin") ??
      clone.children.find((c) =>
        (c as unknown as { isMesh?: boolean }).isMesh
      );
    if (mannequinMesh) {
      const mats = meshMaterials(mannequinMesh);
      if (mats.length > 0) return mats;
    }
    const first: THREE.Material[] = [];
    clone.traverse((o) => {
      if (first.length > 0) return;
      const mats = meshMaterials(o);
      if (mats.length > 0) first.push(...mats);
    });
    return first;
  }, [clone]);

  const targetColor = useMemo(() => new THREE.Color(selectedColor), [selectedColor]);

  // drei useAnimations + mixer root = group (pola kode proyek).
  const { actions, mixer } = useAnimations(animations, groupRef);

  // Ganti klip: crossfade 0.2s (fadeOut lama + fadeIn baru).
  const activeRef = useRef<THREE.AnimationAction | null>(null);
  useEffect(() => {
    if (!actions) return;
    const clipName = PRESET_TO_CLIP[animationPreset] || "Rig|Idle_Loop";
    const record = actions as unknown as Record<string, THREE.AnimationAction>;
    const next = pickAction(record, clipName, animationPreset);
    if (!next) {
      console.warn(`[kaos-kami] Klip manekin tak ketemu: ${clipName}`);
      return;
    }
    const prev = activeRef.current;
    if (prev === next) {
      next.timeScale = animationSpeed;
      return;
    }
    next.enabled = true;
    next.reset();
    next.timeScale = animationSpeed;
    next.setEffectiveWeight(1);
    if (prev && prev !== next) {
      prev.fadeOut(CROSSFADE_S);
      next.fadeIn(CROSSFADE_S);
    } else {
      next.fadeIn(CROSSFADE_S);
    }
    next.play();
    activeRef.current = next;
  }, [actions, animationPreset, animationSpeed]);

  // Kecepatan adjustable (timeScale) — berlaku ke SEMUA action
  useEffect(() => {
    if (!actions) return;
    for (const a of Object.values(
      actions as unknown as Record<string, THREE.AnimationAction | null>
    )) {
      if (!a) continue;
      try {
        a.timeScale = animationSpeed;
      } catch {}
    }
  }, [actions, animationSpeed]);

  // Stop mixer saat unmount (anti action jalan di pohon yang sudah dibuang).
  useEffect(() => {
    return () => {
      try {
        mixer?.stopAllAction();
      } catch {}
      activeRef.current = null;
    };
  }, [mixer]);

  // PERF: idle >2s → bekukan skeletal (mixer.timeScale=0, tanpa edit biner
  // GLB) + kabari CanvasStage via event agar frameloop turun ke demand.
  // mixer.timeScale (bukan per-action) = jeda global; timeScale per-action
  // motionSpeed UTUH sehingga resume instan tanpa re-crossfade. Timer reset
  // tiap ada interaksi gerak/putar/tema view.
  const [mannequinIdle, setMannequinIdle] = React.useState(false);
  useEffect(() => {
    setMannequinIdle(false);
    const t = setTimeout(() => setMannequinIdle(true), 2000);
    return () => clearTimeout(t);
  }, [animationPreset, animationSpeed, isRotating, viewMode]);
  useEffect(() => {
    try {
      if (mixer) mixer.timeScale = mannequinIdle ? 0 : 1;
    } catch {}
  }, [mixer, mannequinIdle]);
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("kaos-mannequin-idle", { detail: mannequinIdle }));
    } catch {}
  }, [mannequinIdle]);

  useFrame((_, delta) => {
    // Manekin ikut warna kaos: dampC mulus seperti model garment lain.
    for (const m of tintMaterials) {
      const c = (m as THREE.MeshStandardMaterial).color;
      if (c) easing.dampC(c, targetColor, 0.25, delta);
    }
    if (groupRef.current && isRotating) groupRef.current.rotation.y += delta * 0.75;
  });

  const posX = viewMode === "story" ? 0 : modelPosX;
  const posY = viewMode === "story" ? -0.05 : modelPosY - 0.05;
  const scale = viewMode === "story" ? 1.0 : modelScale;

  return (
    <group ref={groupRef} position={[posX, posY, 0]} scale={[scale, scale, scale]} dispose={null}>
      <primitive object={clone} dispose={null} />
    </group>
  );
};

export const MannequinModel: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <SilentModelFallback fallback={null}>
        <MannequinInner />
      </SilentModelFallback>
    </Suspense>
  );
};
