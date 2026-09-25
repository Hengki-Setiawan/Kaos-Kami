"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { apparelToArchetype, createClothPhysicalMaterial } from '@/lib/materials/clothPhysicalMaterial';
import { ClothInertiaSimulator } from '@/lib/3d/clothInertiaPhysics';
import { applyMobileWind, ensureWindWeights } from '@/lib/3d/windShader';
import { getStretchFactors } from '@/lib/3d/stretchPhysics';
import { registerMobileStretchGroup, unregisterMobileStretchGroup } from '@/lib/3d/mobileStretchRegistry';
import { MobileDecalLayerRenderer } from './MobileDecalLayerRenderer';
import { DecalGizmoMobile } from './DecalGizmoMobile';
import { MobileSweaterModel } from './MobileSweaterModel';
import { MobileCapModel } from './MobileCapModel';
import { extractMobileApparelGeometry, type ExtractMobileGeometryOptions } from '@/lib/3d/extractMobileApparelGeometry';

// KEPUTUSAN OWNER Sep 2026: mesh aktif DIGANTI — kaos→basic_t-shirt,
// hoodie→blue_hoodie (file lama = fallback).
// Primer bersih SAMA web: tee-basic.glb ← basic_t-shirt.glb (7.2k tris,
// ber-UV), hoodie-blue.glb ← blue_hoodie.glb (13.8k tris, ber-UV).
// Fallback lama tetap di public/models: tshirt-heavyweight.glb,
// hoodie.glb (+ hoodie.lod1.glb tier-low).
// Normalisasi node baru (tiru pola web HoodieModel merge+center): Box3
// center + skala uniform ke lebar lama (tshirt 0.55, hoodie 0.631 cermin
// scaleCalibration.web) agar klaim cm/DPI/jangkar decal lama tetap berlaku
// sementara. Kalibrasi ulang penuh (multiplier/surfaceZ/kerah per mesh baru
// + uji visual DPR/VRAM) = follow-up.
// SINKRON ASET (12 Sep 2026 + quick-win 21 Sep 2026, SSOT = MOBILE_APPAREL_META):
// crewneck = orderable TRUE cermin web APPAREL_CATALOG (mesh web crewneck
// MEMANG sweater.glb → MobileSweaterModel, BUKAN fallback defensif).
// sweater = ALIAS mockup-saja (orderable FALSE; slug tak ada di web →
//   server 400 "tidak dikenal"; pesan lockedMessage di semua jalur).
// cap/pants/shorts = mockup-saja (orderable FALSE cermin web — order tetap
// diblokir client ≈400 + server wajib menolak ulang):
// public/models/sweater.glb + cap.glb master non-Draco (varian draco
// SOFT-DISABLE 14 Sep 2026 → diarsipkan ke backups/draco-archive/).
// Harga mockup topi/sweater di HP (lihat MobileSweaterModel/MobileCapModel
// untuk kalibrasi).
// Model tak dipakai/duplikat (tee-alt, fleece-alt, hoodie-flat,
// hoodie.optimized, jacket.optimized) tetap diarsipkan.
// PANTS & SHORTS = PENGECUALIAN MOCKUP-SAJA (12 Sep 2026): pants.glb &
// shorts.glb disalin dari Asset 3D/github/ (pants 1.16MB, shorts 754 verts —
// MURAH, setara tee-basic) → mockupEnabled TRUE, orderable FALSE (cermin web).
// JANGAN tambah fallback silang-jenis (mis. sweater→hoodie, cap→tshirt):
// lipatan/ketebalan/siluet salah di mata pembeli = menipu. Tipe tanpa file
// (crewneck di picker) tetap dikunci, bukan di-render mesh lain.
// PERF: tak ada useGLTF.preload di level modul — preload HANYA setelah
// isResolved (efek idle di CanvasStageMobile + gate komponen di bawah):
// aktif segera, sisanya prefetch idle.
// SOFT-DISABLE DRACO 14 Sep 2026 (keputusan owner, paritas web non-Draco):
// rantai kini non-Draco first cermin web useDeviceTier (tee-basic.glb,
// hoodie-blue.glb, dst). Varian *.draco.glb + decoder diarsipkan ke
// backups/draco-archive/ (BUKAN delete). setDecoderPath di CanvasStageMobile
// dibiarkan (harmless) + ditandai nonaktif sementara.
const MOBILE_TSHIRT_FALLBACK = '/models/tshirt-heavyweight.glb';
const MOBILE_HOODIE_FALLBACK_HIGH = '/models/hoodie-blue.glb';
// Pants/shorts = file tunggal non-Draco (tanpa rantai; 404 = mesh tak tampil
// tapi tak crash — tipe ini orderable false sehingga aman).
const MOBILE_PANTS_MODEL = '/models/pants.glb';
const MOBILE_SHORTS_MODEL = '/models/shorts.glb';
// Sweater/cap: single non-Draco cermin web (SOFT-DISABLE Draco 14 Sep 2026;
// varian draco diarsipkan ke backups/draco-archive/). Diekspor untuk
// MobileSweaterModel/MobileCapModel.
export const MOBILE_SWEATER_FALLBACK = '/models/sweater.glb';
export const MOBILE_CAP_FALLBACK = '/models/cap.glb';
// Lebar lama TERUKUR cermin web scaleCalibration (tshirt 0.55, hoodie 0.631)
// — target normalisasi agar klaim 30/28cm tak drift saat mesh diganti.
const MOBILE_TSHIRT_TARGET_WIDTH = 0.55;
const MOBILE_HOODIE_TARGET_WIDTH = 0.631;

// Kandidat berlapis per apparel+tier, cermin web *_MODEL_CANDIDATES
// (SOFT-DISABLE Draco 14 Sep 2026): primer = non-Draco master; ekor =
// legacy non-Draco agar studio tetap jalan walau primer 404. Jacket tak
// punya varian draco di web (rantai lod1→prod).
// Diekspor untuk efek preload idle di CanvasStageMobile (tiru web CanvasStage).
export const MOBILE_MODEL_CANDIDATES: Record<string, Record<'high' | 'low', string[]>> = {
  tshirt: {
    high: ['/models/tee-basic.glb', MOBILE_TSHIRT_FALLBACK],
    low: ['/models/tee-basic.glb', MOBILE_TSHIRT_FALLBACK],
  },
  hoodie: {
    high: ['/models/hoodie-blue.glb'],
    low: ['/models/hoodie-blue.glb'],
  },
  shirt: {
    // SWAP 20 Sep 2026: hoodie Pieter Ferreira. jacket.lod1.glb = geometri fleece
    // LAMA (mismatch) → dikeluarkan dari rantai; regen LOD1 menunggu owner.
    high: ['/models/jacket.glb'],
    low: ['/models/jacket.glb'],
  },
  longsleeve: {
    high: ['/models/longsleeve.glb'],
    low: ['/models/longsleeve.glb'],
  },
  // Mockup-saja (orderable false): satu file, high/low sama.
  pants: {
    high: [MOBILE_PANTS_MODEL],
    low: [MOBILE_PANTS_MODEL],
  },
  shorts: {
    high: [MOBILE_SHORTS_MODEL],
    low: [MOBILE_SHORTS_MODEL],
  },
  // Sweater/cap mockup-saja (orderable false): single non-Draco cermin web.
  // crewneck (tipe alias, picker terkunci) ikut memakai rantai sweater bila
  // defensif ter-render (lihat cabang di ResolvedApparelMeshRenderer).
  sweater: {
    high: [MOBILE_SWEATER_FALLBACK],
    low: [MOBILE_SWEATER_FALLBACK],
  },
  crewneck: {
    high: [MOBILE_SWEATER_FALLBACK],
    low: [MOBILE_SWEATER_FALLBACK],
  },
  cap: {
    high: [MOBILE_CAP_FALLBACK],
    low: [MOBILE_CAP_FALLBACK],
  },
};

/** Tiru pola web probeFirstExistingUrl (useDeviceTier): HEAD berlapis,
 *  tak pernah throw — gagal total → fallback terakhir (file lama).
 *  Diekspor untuk MobileSweaterModel/MobileCapModel (rantai sama). */
export async function probeFirstExistingUrlMobile(candidates: string[]): Promise<string> {
  const fallback = candidates[candidates.length - 1] ?? MOBILE_TSHIRT_FALLBACK;
  try {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return fallback;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) return url;
      } catch {
        // Lanjut ke kandidat berikutnya (file belum ada = normal).
      }
    }
  } catch {
    // Abaikan — pakai fallback di bawah.
  }
  return fallback;
}

/** Kandidat berlapis per apparel+tier dari tabel cermin-web di atas.
 *  Diekspor untuk MobileSweaterModel/MobileCapModel. */
export function candidatesFor(apparelType: string, tier: string): string[] {
  const set: 'high' | 'low' = tier === 'low' || tier === 'no-webgl' ? 'low' : 'high';
  return (
    MOBILE_MODEL_CANDIDATES[apparelType]?.[set] ?? MOBILE_MODEL_CANDIDATES.tshirt[set]
  );
}

/** Kandidat PRIORITAS (pertama = non-Draco master, paritas web) untuk
 *  preload idle cermin web. Dipakai CanvasStageMobile: aktif segera +
 *  tetangga prefetch idle. */
export function mobilePriorityFor(apparelType: string, tier: string): string | undefined {
  const urls = candidatesFor(apparelType, tier);
  return urls[0];
}

/** Fallback sinkron (dijamin ada, non-Draco) selama probe HEAD berjalan — anti-crash. */
function syncFallbackFor(apparelType: string, tier: string): string {
  const low = tier === 'low' || tier === 'no-webgl';
  if (apparelType === 'hoodie') return MOBILE_HOODIE_FALLBACK_HIGH;
  if (apparelType === 'shirt') return '/models/jacket.glb';
  if (apparelType === 'longsleeve') return '/models/longsleeve.glb';
  if (apparelType === 'pants') return MOBILE_PANTS_MODEL;
  if (apparelType === 'shorts') return MOBILE_SHORTS_MODEL;
  if (apparelType === 'sweater' || apparelType === 'crewneck') return MOBILE_SWEATER_FALLBACK;
  if (apparelType === 'cap') return MOBILE_CAP_FALLBACK;
  return MOBILE_TSHIRT_FALLBACK;
}

export function MobileApparelMeshRenderer({
  externalTransform,
}: {
  externalTransform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  };
}) {
  // GATE isResolved (cermin web "JANGAN pakai tier sebelum isResolved"):
  // placeholder SSR "mid" bisa memicu unduh model high di HP low-end.
  // useGLTF fetch saat dipanggil — jadi JANGAN render inner (yang memanggil
  // useGLTF) sebelum tier pasti. Tunda satu frame = murah, hemat nyata.
  const { isResolved } = useMobileDeviceTier();
  if (!isResolved) return null;
  return <ResolvedApparelMeshRenderer externalTransform={externalTransform} />;
}

function ResolvedApparelMeshRenderer({
  externalTransform,
}: {
  externalTransform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  };
}) {
  // Cabang mockup-saja (orderable false, cermin web): sweater + crewneck
  // (mesh web sama: sweater.glb) → MobileSweaterModel; cap → MobileCapModel.
  // Dispatcher di sini (bukan di dalam generik) agar probe+fetch generik
  // (tshirt fallback) TAK PERNAH jalan saat tipe ini aktif (hemat kuota/VRAM).
  // Order tetap diblokir hulu (save-to-cart & checkout ≈400) + server.
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  if (apparelType === 'sweater' || apparelType === 'crewneck') return <MobileSweaterModel />;
  if (apparelType === 'cap') return <MobileCapModel />;
  return <GenericApparelMeshRenderer externalTransform={externalTransform} />;
}

function GenericApparelMeshRenderer({
  externalTransform,
}: {
  externalTransform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  const color = useMobileStudioStore((s) => s.color);
  // F0 Test Lab stretch — pola group-scale SEMENTARA cermin web ShirtModel
  // (shader gelombang menyusul). Subscribe diskrit: slider/preset re-render,
  // drag/spring via registry tulis-langsung (F3, tanpa set-store per-frame).
  const testLabMode = useMobileStudioStore((s) => s.testLabMode);
  const stretchIntensity = useMobileStudioStore((s) => s.stretchIntensity);
  const stretchDirection = useMobileStudioStore((s) => s.stretchDirection);
  const stretchFactors = getStretchFactors(testLabMode, stretchIntensity, stretchDirection);
  // Tier di sini SUDAH resolved (gate di komponen luar) — aman untuk probe.
  const { tier } = useMobileDeviceTier();

  // F3: daftarkan grup ke registry agar MobileStretchController bisa tulis
  // group.scale langsung saat drag/spring tanpa lewat store.
  useEffect(() => {
    const g = groupRef.current;
    registerMobileStretchGroup(g);
    return () => {
      unregisterMobileStretchGroup(g);
    };
  }, []);

  // Initialize rotational cloth inertia simulator
  const clothPhysics = useMemo(() => new ClothInertiaSimulator({ stiffness: 38.0, damping: 7.2 }), []);
  const lastYRotation = useRef<number>(0);

  // Model path: primer baru (tee-basic/hoodie-blue) via probe HEAD berlapis
  // tiru web; tier low tetap hemat (fallback lod1 bila primer 404).
  // Sync = file lama (anti-crash saat probe), lalu upgrade ke primer.
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setResolvedPath(null);
    void probeFirstExistingUrlMobile(candidatesFor(apparelType, tier)).then((url) => {
      if (alive) setResolvedPath(url);
    });
    return () => {
      alive = false;
    };
  }, [apparelType, tier]);

  const syncFallback = useMemo(() => syncFallbackFor(apparelType, tier), [apparelType, tier]);
  const modelPath = resolvedPath ?? syncFallback;

  const { scene } = useGLTF(modelPath);

  // Kalibrasi geometri terstandarisasi untuk seluruh apparel mobile (selaras web & acuan emas Hoodie):
  // 1. T-Shirt & Longsleeve: scaleMultiplier 0.72, crownYOffset -0.12 (lebar 51.5cm = Size L, dada di Y=0).
  //    Longsleeve SWAP 20 Sep 2026 = ex-sweater.glb (angka dipertahankan, torso parity 2.6%).
  // 2. Hoodie: scaleMultiplier 0.74 (acuan emas).
  // 3. Jacket SWAP 20 Sep 2026 (hoodie Pieter Ferreira): scaleMultiplier 0.2999,
  //    crownYOffset -0.075 (tinggi ternormalisasi 0.55395 = fleece lama, body 74cm sama).
  // 4. Shorts: scaleMultiplier 0.0125 (Maya cm -> metric 0.406m, anti meledak 32.5m).
  // 5. Pants: scaleMultiplier 1.0 (0.328m).
  const apparelOptions = useMemo((): ExtractMobileGeometryOptions | undefined => {
    switch (apparelType) {
      case 'tshirt':
      case 'longsleeve':
        return { scaleMultiplier: 0.72, crownYOffset: -0.12 };
      case 'hoodie':
        return { scaleMultiplier: 0.74 };
      case 'shirt':
        return { scaleMultiplier: 0.2999, crownYOffset: -0.075 };
      case 'shorts':
        return { scaleMultiplier: 0.0125 };
      case 'pants':
      default:
        return undefined;
    }
  }, [apparelType]);

  const extractedGeometry = useMemo(() => {
    return extractMobileApparelGeometry(scene, apparelOptions);
  }, [scene, apparelOptions]);

  useEffect(() => {
    return () => {
      try {
        extractedGeometry?.dispose();
      } catch {}
    };
  }, [extractedGeometry]);

  const material = useMemo(() => {
    const mat = createClothPhysicalMaterial(color, apparelToArchetype(apparelType));
    applyMobileWind(mat, 0.25);
    return mat;
  }, [color, apparelType]);

  useEffect(() => {
    return () => {
      try {
        material?.dispose();
      } catch {}
    };
  }, [material]);

  // Inertial physics simulation step per frame
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (externalTransform) {
      // If controlled by MediaPipe AR
      if (externalTransform.position) {
        groupRef.current.position.set(...externalTransform.position);
      }
      if (externalTransform.rotation) {
        groupRef.current.rotation.set(...externalTransform.rotation);
      }
      if (externalTransform.scale) {
        const s = externalTransform.scale * 1.4;
        // F0: stretch ikut dikali di mode AR eksternal (biasanya 1.0 = no-op).
        const st = getStretchFactors(
          useMobileStudioStore.getState().testLabMode,
          useMobileStudioStore.getState().stretchIntensity,
          useMobileStudioStore.getState().stretchDirection
        );
        groupRef.current.scale.set(s * st.stretchX, s * st.stretchY, s * st.stretchZ);
      }
    } else {
      // Standard Studio 3D: Apply Rotational Spring Inertia
      const currentY = groupRef.current.rotation.y;
      clothPhysics.reportRotation(currentY, delta);
      const swayAngle = clothPhysics.update(delta);

      // Apply subtle dynamic inertial lean to lower hem (Z-axis sway)
      groupRef.current.rotation.z = -swayAngle * 0.45;
      lastYRotation.current = currentY;

      // Umpan sway ke shader: kain bergelombang proporsional goyangan,
      // kembali tenang (0.2) saat idle.
      const sh = (material as any)?.userData?.shader?.uniforms;
      if (sh?.uWindStrength) {
        sh.uWindStrength.value = 0.2 + Math.min(1, Math.abs(swayAngle) * 6) * 0.9;
      }
      if (sh?.uTime) sh.uTime.value += delta;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={[1.4 * stretchFactors.stretchX, 1.4 * stretchFactors.stretchY, 1.4 * stretchFactors.stretchZ]}
      position={[0, -0.15, 0]}
    >
      {extractedGeometry && material ? (
        <mesh castShadow receiveShadow geometry={extractedGeometry} material={material}>
          <MobileDecalLayerRenderer />
        </mesh>
      ) : null}
      <DecalGizmoMobile />
    </group>
  );
}
