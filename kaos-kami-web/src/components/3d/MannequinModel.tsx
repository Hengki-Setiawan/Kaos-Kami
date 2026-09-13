"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useConfiguratorStore, type MotionClip } from "@/store/useConfiguratorStore";
import {
  DANCE_SOURCE_URL,
  RETARGETED_DANCE_CLIP_NAME,
  NATIVE_DANCE_FALLBACK_NAME,
  NATIVE_IDLE_FALLBACK_NAME,
  retargetMixamoClipToDef,
} from "@/lib/mixamoRetarget";
import { useShallow } from "zustand/shallow";
import { useResourceTracker } from "@/lib/threeResourceTracker";
import { SilentModelFallback } from "@/components/ui/ModelErrorBoundary";

// MODE MANEKIN BERJALAN (in-place) — Quaternius Animated Base Character.
// FAKTA TERUKUR (12 Sep 2026, patuhi — jangan asumsi ulang):
// - File: /models/mannequin.glb (salinan bit-identik Animated_Base_Character,
//   2.266.136 byte / 2.16MB, SHA256 7446B2D8…FCAA).
// - Mesh `Mannequin` 13.7k tris (skinned), rig `DEF-*`, 45 klip `Rig|*`
//   IN-PLACE teruji (Idle max 0.1mm, Walk 0.9mm, Jog 2.3mm) → TIDAK perlu
//   kompensasi root-motion; manekin tetap di tempat saat jalan/lari.
// - Material kulit/pakaian manekin: `M_Main` → di-tint ke selectedColor store
//   (manekin ikut warna kaos yang dipilih user).
// - Klip Mixamo di public/animations/ (rig `mixamorig`) BEDA RIG — HANYA
//   `mixamo-rumba.glb` yang dipakai, via retarget ROTASI-ONLY in-place
//   (`@/lib/mixamoRetarget.ts`, translasi dibuang total) sebagai motionClip
//   "dance". Klip Mixamo lain tetap cadangan (jangan dimainkan langsung).
const MODEL_PATH = "/models/mannequin.glb";
// PERF: preload modul DIHAPUS — sebelumnya useGLTF.preload di sini + 7 import
// statis ApparelMeshRenderer memaksa unduh 2.16MB di first paint walau mode
// garment. Manekin dimuat lazy ( chunk ApparelMeshRenderer ) + idle-preload
// prioritas CanvasStage saat modelMode manekin; fallback diam di bawah.

// Klip yang dipakai (nama persis di dalam mannequin.glb). Jog_Fwd dipakai
// sebagai "jog/lari" (run), Sprint_Loop sebagai bonus sprint. "dance" =
// nama klip HASIL RETARGET rumba→DEF (lihat effect dansa di bawah); fallback
// berlapis native `Rig|Dance_Loop` → `Rig|Idle_Loop` bila retarget gagal.
const MOTION_CLIP_NAMES: Record<MotionClip, string> = {
  idle: "Rig|Idle_Loop",
  walk: "Rig|Walk_Loop",
  jog: "Rig|Jog_Fwd_Loop",
  sprint: "Rig|Sprint_Loop",
  dance: RETARGETED_DANCE_CLIP_NAME,
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
  const { motionClip, motionSpeed } = useConfiguratorStore(
    useShallow((s) => ({ motionClip: s.motionClip, motionSpeed: s.motionSpeed }))
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
  }, [clone]);

  // Target tint: material `M_Main` (terukur). Fallback berlapis bila file
  // ganti: mesh `Mannequin` → mesh pertama (DIAM, tanpa chrome error).
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

  // Ganti klip: crossfade 0.2s (fadeOut lama + fadeIn baru). Tanpa kompensasi
  // root-motion — klip IN-PLACE teruji (drift max 2.3mm, dapat diabaikan).
  const activeRef = useRef<THREE.AnimationAction | null>(null);
  useEffect(() => {
    if (!actions) return;
    // "dance" ditangani effect dansa khusus di bawah (retarget + fallback).
    if (motionClip === "dance") return;
    const record = actions as unknown as Record<string, THREE.AnimationAction>;
    const next = pickAction(record, MOTION_CLIP_NAMES[motionClip], motionClip);
    if (!next) {
      console.warn(`[kaos-kami] Klip manekin tak ketemu: ${MOTION_CLIP_NAMES[motionClip]}`);
      return;
    }
    const prev = activeRef.current;
    if (prev === next) return;
    next.enabled = true;
    next.reset();
    next.timeScale = motionSpeed;
    next.setEffectiveWeight(1);
    if (prev && prev !== next) {
      prev.fadeOut(CROSSFADE_S);
      next.fadeIn(CROSSFADE_S);
    } else {
      next.fadeIn(CROSSFADE_S);
    }
    next.play();
    activeRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, motionClip]);

  // DANSAS — retarget Mixamo rumba (rotasi-only, in-place) + fallback berlapis.
  // Alur anti-blank: cache retarget → langsung main; belum ada → mainkan
  // fallback native (`Rig|Dance_Loop` → `Rig|Idle_Loop`) DULU selagi rumba
  // dimuat async sekali; sukses → upgrade crossfade 0.2s ke rumba, gagal →
  // tetap di fallback (idle paling akhir, tak pernah blank).
  const danceClipRef = useRef<THREE.AnimationClip | null>(null);
  const danceLoadRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (!actions || !mixer) return;
    if (motionClip !== "dance") return;
    const record = actions as unknown as Record<string, THREE.AnimationAction>;
    const playAction = (action: THREE.AnimationAction | null): boolean => {
      if (!action) return false;
      const prev = activeRef.current;
      if (prev === action) {
        try {
          action.timeScale = motionSpeed;
        } catch {}
        return true;
      }
      action.enabled = true;
      action.reset();
      action.timeScale = motionSpeed;
      action.setEffectiveWeight(1);
      if (prev && prev !== action) {
        try {
          prev.fadeOut(CROSSFADE_S);
        } catch {}
        try {
          action.fadeIn(CROSSFADE_S);
        } catch {}
      } else {
        try {
          action.fadeIn(CROSSFADE_S);
        } catch {}
      }
      action.play();
      activeRef.current = action;
      return true;
    };

    // 1. Cache retarget sudah ada → langsung main.
    if (danceClipRef.current) {
      try {
        const cached = mixer.clipAction(danceClipRef.current) as unknown as THREE.AnimationAction | null;
        if (cached && playAction(cached)) return;
      } catch {}
    }

    // 2. Fallback native langsung (jangan blank) selagi rumba dimuat.
    const native =
      pickAction(record, NATIVE_DANCE_FALLBACK_NAME, "dance") ??
      pickAction(record, NATIVE_IDLE_FALLBACK_NAME, "idle");
    if (native) playAction(native);

    // 3. Muat rumba SEKALI (GLTFLoader client-only), retarget rotasi-only ke
    //    hierarki DEF milik sendiri (`clone` — verifikasi bone ADA di sini).
    if (!danceLoadRef.current) {
      danceLoadRef.current = (async () => {
        try {
          const loader = new GLTFLoader();
          const gltf = (await loader.loadAsync(DANCE_SOURCE_URL)) as unknown as {
            animations?: THREE.AnimationClip[];
          };
          const srcClips = gltf.animations ?? [];
          const src =
            srcClips.find((c) =>
              (c.tracks ?? []).some((t) => (t.name ?? "").includes("mixamorig:Hips"))
            ) ?? srcClips[0];
          if (!src) throw new Error("klip rumba kosong");
          const ret = retargetMixamoClipToDef(src, clone);
          if (!ret) throw new Error("retarget 0 track cocok");
          danceClipRef.current = ret.clip;
        } catch (err) {
          console.warn("[kaos-kami] Retarget dansa gagal, pakai fallback bawaan:", err);
          danceClipRef.current = null;
        }
      })();
    }
    let cancelled = false;
    danceLoadRef.current.then(() => {
      if (cancelled || !danceClipRef.current) return;
      try {
        if (useConfiguratorStore.getState().motionClip !== "dance") return;
        const upgraded = mixer.clipAction(danceClipRef.current) as unknown as THREE.AnimationAction | null;
        if (upgraded) playAction(upgraded);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, mixer, motionClip, clone, motionSpeed]);

  // Kecepatan adjustable (timeScale) — berlaku ke SEMUA action agar ganti klip
  // di tengah jalan langsung mewarisi kecepatan user.
  useEffect(() => {
    if (!actions) return;
    for (const a of Object.values(
      actions as unknown as Record<string, THREE.AnimationAction | null>
    )) {
      if (!a) continue; // drei mengetik action bisa null bila klip hilang
      try {
        a.timeScale = motionSpeed;
      } catch {}
    }
  }, [actions, motionSpeed]);

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
  }, [motionClip, motionSpeed, isRotating, viewMode]);
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
