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
import { MobileDecalLayerRenderer } from './MobileDecalLayerRenderer';
import { DecalGizmoMobile } from './DecalGizmoMobile';
import { MobileSweaterModel } from './MobileSweaterModel';
import { MobileCapModel } from './MobileCapModel';

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
// SINKRON ASET (12 Sep 2026 + Sweater/Cap follow-up):
// crewneck TETAP dikunci di picker (mockupEnabled false) — file crewneck tak
// ada (sweater.glb = mesh crewneck web; tipe crewneck memakai MobileSweaterModel
// sebagai fallback render defensif, tapi picker mengarahkan ke Sweater Pack).
// sweater/cap DIBUKA untuk mockup (mockupEnabled true, orderable FALSE cermin
// web — order tetap diblokir client ≈400 + server wajib menolak ulang):
// public/models/sweater.glb (2.50MB, arsip-mobile — geometri identik master
// web) + sweater.draco.glb (2.27MB, dari web) + cap.glb (2.84MB, arsip) +
// cap.draco.glb (0.22MB, dari web, −92%). +7.83MB bundle — harga mockup topi/
// sweater di HP (lihat MobileSweaterModel/MobileCapModel untuk kalibrasi).
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
// Rantai draco→legacy cermin web useDeviceTier (hemat HP: tee -18%,
// hoodie-blue -15%, longsleeve -44%). Decoder di /public/decoders/draco/
// (disalin dari web 12 Sep 2026).
const MOBILE_TSHIRT_FALLBACK = '/models/tshirt-heavyweight.glb';
const MOBILE_HOODIE_FALLBACK_HIGH = '/models/hoodie.glb';
const MOBILE_HOODIE_FALLBACK_LOW = '/models/hoodie.lod1.glb';
// Pants/shorts = file tunggal non-Draco (tanpa rantai; 404 = mesh tak tampil
// tapi tak crash — tipe ini orderable false sehingga aman).
const MOBILE_PANTS_MODEL = '/models/pants.glb';
const MOBILE_SHORTS_MODEL = '/models/shorts.glb';
// Sweater/cap: rantai draco→master cermin web (decoder di
// /public/decoders/draco/). Diekspor untuk MobileSweaterModel/MobileCapModel.
export const MOBILE_SWEATER_FALLBACK = '/models/sweater.glb';
export const MOBILE_CAP_FALLBACK = '/models/cap.glb';
// Lebar lama TERUKUR cermin web scaleCalibration (tshirt 0.55, hoodie 0.631)
// — target normalisasi agar klaim 30/28cm tak drift saat mesh diganti.
const MOBILE_TSHIRT_TARGET_WIDTH = 0.55;
const MOBILE_HOODIE_TARGET_WIDTH = 0.631;

// Kandidat berlapis per apparel+tier, cermin web *_MODEL_CANDIDATES:
// primer .draco.glb (lebih kecil = hemat HP, tier-low pun pakai draco),
// ekor = legacy non-Draco agar studio tetap jalan walau draco 404/decoder
// gagal. Jacket tak punya varian draco di web (rantai lod1→prod).
// Diekspor untuk efek preload idle di CanvasStageMobile (tiru web CanvasStage).
export const MOBILE_MODEL_CANDIDATES: Record<string, Record<'high' | 'low', string[]>> = {
  tshirt: {
    high: ['/models/tee-basic.draco.glb', '/models/tee-basic.glb', MOBILE_TSHIRT_FALLBACK],
    low: ['/models/tee-basic.draco.glb', '/models/tee-basic.glb', MOBILE_TSHIRT_FALLBACK],
  },
  hoodie: {
    high: ['/models/hoodie-blue.draco.glb', '/models/hoodie-blue.glb', MOBILE_HOODIE_FALLBACK_HIGH],
    low: [
      '/models/hoodie-blue.draco.glb',
      '/models/hoodie-blue.glb',
      MOBILE_HOODIE_FALLBACK_LOW,
      MOBILE_HOODIE_FALLBACK_HIGH,
    ],
  },
  shirt: {
    high: ['/models/jacket.glb'],
    low: ['/models/jacket.lod1.glb', '/models/jacket.glb'],
  },
  longsleeve: {
    high: ['/models/longsleeve.draco.glb', '/models/longsleeve.glb'],
    low: ['/models/longsleeve.draco.glb', '/models/longsleeve.glb'],
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
  // Sweater/cap mockup-saja (orderable false): draco→master cermin web.
  // crewneck (tipe alias, picker terkunci) ikut memakai rantai sweater bila
  // defensif ter-render (lihat cabang di ResolvedApparelMeshRenderer).
  sweater: {
    high: ['/models/sweater.draco.glb', MOBILE_SWEATER_FALLBACK],
    low: ['/models/sweater.draco.glb', MOBILE_SWEATER_FALLBACK],
  },
  crewneck: {
    high: ['/models/sweater.draco.glb', MOBILE_SWEATER_FALLBACK],
    low: ['/models/sweater.draco.glb', MOBILE_SWEATER_FALLBACK],
  },
  cap: {
    high: ['/models/cap.draco.glb', MOBILE_CAP_FALLBACK],
    low: ['/models/cap.draco.glb', MOBILE_CAP_FALLBACK],
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

/** Kandidat PRIORITAS (pertama = draco/master) untuk preload idle cermin web.
 *  Dipakai CanvasStageMobile: aktif segera + tetangga prefetch idle. */
export function mobilePriorityFor(apparelType: string, tier: string): string | undefined {
  const urls = candidatesFor(apparelType, tier);
  return urls[0];
}

/** Fallback sinkron (dijamin ada, non-Draco) selama probe HEAD berjalan — anti-crash. */
function syncFallbackFor(apparelType: string, tier: string): string {
  const low = tier === 'low' || tier === 'no-webgl';
  if (apparelType === 'hoodie') return low ? MOBILE_HOODIE_FALLBACK_LOW : MOBILE_HOODIE_FALLBACK_HIGH;
  if (apparelType === 'shirt') return low ? '/models/jacket.lod1.glb' : '/models/jacket.glb';
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
  // Tier di sini SUDAH resolved (gate di komponen luar) — aman untuk probe.
  const { tier } = useMobileDeviceTier();

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

  // Clone scene & apply PBR cloth materials + normalisasi mesh baru.
  const materialRef = useRef<THREE.Material | null>(null);
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    // Scale-up/down node bila perlu (tiru pola web center): mesh Sketchfab
    // baru offset + beda skala (tee-basic z 0.84–1.63 w 0.71; hoodie-blue
    // y 4.3–7.0 w 5.41 — TERUKUR bbox accessor 12 Sep 2026). Tanpa ini model
    // raksasa/hilang dari kamera. Uniform k = target/lebar agar klaim cm lama
    // tetap berlaku; posisi = -center*k agar bbox tepat di origin.
    // Follow-up kalibrasi penuh (multiplier/surfaceZ/kerah per mesh baru).
    const isNewTee = modelPath.includes('tee-basic.glb');
    const isNewHoodie = modelPath.includes('hoodie-blue.glb');
    const isPants = modelPath.includes('pants.glb');
    const isShorts = modelPath.includes('shorts.glb');
    if (isNewTee || isNewHoodie || isPants || isShorts) {
      try {
        cloned.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(cloned);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        if (isPants || isShorts) {
          // PANTS/SHORTS TERUKUR + cermin web (12 Sep 2026): skala NATIVE
          // (k=1, tanpa target lebar), center Box3 saja.
          // - pants: Y 0.11–1.11 (center 0.61 ≈ heuristik Y+0.5).
          // - shorts: Y −0.32…0.26 (center −0.028, bbox 0.332×0.585×0.240).
          // Klaim cm/DPI + jangkar decal panel paha = follow-up
          // (orderable false → angka tak pernah masuk produksi).
          cloned.position.set(-center.x, -center.y, -center.z);
        } else {
          const target = isNewHoodie ? MOBILE_HOODIE_TARGET_WIDTH : MOBILE_TSHIRT_TARGET_WIDTH;
          if (Number.isFinite(size.x) && size.x > 1e-6) {
            const k = target / size.x;
            cloned.scale.setScalar(k);
            cloned.position.set(-center.x * k, -center.y * k, -center.z * k);
          } else {
            cloned.position.set(-center.x, -center.y, -center.z);
          }
        }
      } catch {}
    }
    const material = createClothPhysicalMaterial(color, apparelToArchetype(apparelType));
    applyMobileWind(material, 0.25);
    materialRef.current = material;

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) ensureWindWeights(mesh.geometry as THREE.BufferGeometry);
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene, color, apparelType, modelPath]);

  // VRAM: material lama dibuang tiap ganti warna/apparel + saat unmount.
  // Geometri SENGAJA tak di-dispose (milik cache useGLTF, dipakai ulang);
  // normalMap SENGAJA tak di-dispose (cache tunggal getProceduralWeaveTexture).
  // material.dispose() hanya melepas program GPU, bukan tekstur — aman.
  useEffect(() => {
    const stale = materialRef.current;
    return () => {
      try {
        stale?.dispose();
      } catch {}
    };
  }, [clonedScene]);

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
        groupRef.current.scale.set(s, s, s);
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
      const sh = (materialRef.current as any)?.userData?.shader?.uniforms;
      if (sh?.uWindStrength) {
        sh.uWindStrength.value = 0.2 + Math.min(1, Math.abs(swayAngle) * 6) * 0.9;
      }
      if (sh?.uTime) sh.uTime.value += delta;
    }
  });

  return (
    <group ref={groupRef} scale={[1.4, 1.4, 1.4]} position={[0, -0.15, 0]}>
      <primitive object={clonedScene} />
      <MobileDecalLayerRenderer />
      <DecalGizmoMobile />
    </group>
  );
}
