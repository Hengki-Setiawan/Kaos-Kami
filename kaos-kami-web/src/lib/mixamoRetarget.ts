// src/lib/mixamoRetarget.ts — Retarget ROTASI-ONLY klip Mixamo (rig mixamorig)
// ke manekin Quaternius (rig DEF-*) secara IN-PLACE.
//
// FAKTA TERUKUR (patuhi — jangan asumsi ulang):
// - Sumber: /animations/mixamo-rumba.glb — rig `mixamorig`, 66 node, 1 klip
//   `mixamo.com` durasi 3.021s, 53 channel (1 translation Hips + 52 rotation).
//   Sway XZ ±14cm ADA di track translation Hips → DIBUANG TOTAL (syarat owner
//   = in-place, manekin tetap di tempat). Gap rotasi rest-pose ≤10° (diterima
//   tanpa kompensasi orientasi).
// - Target: /models/mannequin.glb — rig `DEF-*`, 56 node (root + Mannequin +
//   Rig + root + 52 joint DEF), 45 klip `Rig|*` in-place teruji.
// - Inspeksi nama joint: BACA-SAJA via `npx --no-install gltf-transform
//   inspect` (overview) + parse JSON chunk GLB via python (node names +
//   animation channel targets). TIDAK ada tulis/konversi file.
// - Pola kode proyek: crossfade 0.2s antar klip (tengah rentang 0.15–0.25s).
//
// KEBIJAKAN RETARGET (syarat owner):
// - Track ROTASI (`.quaternion`) disalin MENTAH (nilai quaternion apa adanya,
//   tanpa kompensasi rest-pose — gap ≤10° diterima sebagai risiko visual,
//   lihat bawah).
// - Track TRANSLASI (`.position`) + SCALE DIBUANG TOTAL — termasuk translation
//   Hips (sway ±14cm) → hasil IN-PLACE, manekin tak bergeser.
// - Joint sumber yang tak berpasangan di-SKIP JUJUR (tak ditebak) +
//   didokumentasikan di MIXAMO_SKIPPED_JOINTS + dikembalikan di `skipped`.

import * as THREE from "three";

/** URL klip dansa Mixamo (public/). */
export const DANCE_SOURCE_URL = "/animations/mixamo-rumba.glb";

/** Crossfade antar klip — SAMA dengan MannequinModel (0.2s, pola proyek). */
export const DANCE_CROSSFADE_S = 0.2;

/** Nama klip hasil retarget (dipakai MannequinModel untuk pickAction). */
export const RETARGETED_DANCE_CLIP_NAME = "Rumba→DEF(in-place)";

/** Fallback berlapis bila retarget gagal (JANGAN blank — jatuh ke idle). */
export const NATIVE_DANCE_FALLBACK_NAME = "Rig|Dance_Loop";
export const NATIVE_IDLE_FALLBACK_NAME = "Rig|Idle_Loop";

/**
 * Peta mixamorig → DEF-* (50 pasang, hasil inspeksi BACA-SAJA 12 Sep 2026).
 * Kiri = nama node sumber di mixamo-rumba.glb, kanan = nama joint target di
 * mannequin.glb. Sisi R/L dibalik eksplisit (Mixamo Right = DEF .R).
 */
export const MIXAMO_TO_DEF: Record<string, string> = {
  // Tulang belakang → pinggul → kepala (6)
  "mixamorig:Hips": "DEF-hips",
  "mixamorig:Spine": "DEF-spine.001",
  "mixamorig:Spine1": "DEF-spine.002",
  "mixamorig:Spine2": "DEF-spine.003",
  "mixamorig:Neck": "DEF-neck",
  "mixamorig:Head": "DEF-head",
  // Bahu + lengan inti (6)
  "mixamorig:RightShoulder": "DEF-shoulder.R",
  "mixamorig:RightArm": "DEF-upper_arm.R",
  "mixamorig:RightForeArm": "DEF-forearm.R",
  "mixamorig:RightHand": "DEF-hand.R",
  "mixamorig:LeftShoulder": "DEF-shoulder.L",
  "mixamorig:LeftArm": "DEF-upper_arm.L",
  "mixamorig:LeftForeArm": "DEF-forearm.L",
  "mixamorig:LeftHand": "DEF-hand.L",
  // Jari kanan (15 = 5 jari × 3 ruas; ruas ujung ke-4 di-skip, lihat bawah)
  "mixamorig:RightHandThumb1": "DEF-thumb.01.R",
  "mixamorig:RightHandThumb2": "DEF-thumb.02.R",
  "mixamorig:RightHandThumb3": "DEF-thumb.03.R",
  "mixamorig:RightHandIndex1": "DEF-f_index.01.R",
  "mixamorig:RightHandIndex2": "DEF-f_index.02.R",
  "mixamorig:RightHandIndex3": "DEF-f_index.03.R",
  "mixamorig:RightHandMiddle1": "DEF-f_middle.01.R",
  "mixamorig:RightHandMiddle2": "DEF-f_middle.02.R",
  "mixamorig:RightHandMiddle3": "DEF-f_middle.03.R",
  "mixamorig:RightHandRing1": "DEF-f_ring.01.R",
  "mixamorig:RightHandRing2": "DEF-f_ring.02.R",
  "mixamorig:RightHandRing3": "DEF-f_ring.03.R",
  "mixamorig:RightHandPinky1": "DEF-f_pinky.01.R",
  "mixamorig:RightHandPinky2": "DEF-f_pinky.02.R",
  "mixamorig:RightHandPinky3": "DEF-f_pinky.03.R",
  // Jari kiri (15, cermin kanan)
  "mixamorig:LeftHandThumb1": "DEF-thumb.01.L",
  "mixamorig:LeftHandThumb2": "DEF-thumb.02.L",
  "mixamorig:LeftHandThumb3": "DEF-thumb.03.L",
  "mixamorig:LeftHandIndex1": "DEF-f_index.01.L",
  "mixamorig:LeftHandIndex2": "DEF-f_index.02.L",
  "mixamorig:LeftHandIndex3": "DEF-f_index.03.L",
  "mixamorig:LeftHandMiddle1": "DEF-f_middle.01.L",
  "mixamorig:LeftHandMiddle2": "DEF-f_middle.02.L",
  "mixamorig:LeftHandMiddle3": "DEF-f_middle.03.L",
  "mixamorig:LeftHandRing1": "DEF-f_ring.01.L",
  "mixamorig:LeftHandRing2": "DEF-f_ring.02.L",
  "mixamorig:LeftHandRing3": "DEF-f_ring.03.L",
  "mixamorig:LeftHandPinky1": "DEF-f_pinky.01.L",
  "mixamorig:LeftHandPinky2": "DEF-f_pinky.02.L",
  "mixamorig:LeftHandPinky3": "DEF-f_pinky.03.L",
  // Kaki (8 = 4 sendi × 2 sisi; ujung jari kaki di-skip, lihat bawah)
  "mixamorig:RightUpLeg": "DEF-thigh.R",
  "mixamorig:RightLeg": "DEF-shin.R",
  "mixamorig:RightFoot": "DEF-foot.R",
  "mixamorig:RightToeBase": "DEF-toe.R",
  "mixamorig:LeftUpLeg": "DEF-thigh.L",
  "mixamorig:LeftLeg": "DEF-shin.L",
  "mixamorig:LeftFoot": "DEF-foot.L",
  "mixamorig:LeftToeBase": "DEF-toe.L",
};

/**
 * Joint sumber yang TAK BERPASANGAN → di-skip JUJUR (13 node, semua ujung):
 * - `mixamorig:HeadTop_End`: manekin tak punya joint ujung kepala.
 * - 10 ujung jari tangan (`*4` = ruas tip): DEF hanya 3 ruas per jari.
 * - `mixamorig:RightToe_End` + `mixamorig:LeftToe_End`: manekin tak punya
 *   joint ujung jari kaki (hanya `DEF-toe.*`).
 * Dampak visual: ujung-ujung ikut orientasi ruas induk (kaku 1 segmen) —
 * dapat diabaikan untuk dansa 3 detik.
 */
export const MIXAMO_SKIPPED_JOINTS: string[] = [
  "mixamorig:HeadTop_End",
  "mixamorig:RightHandThumb4",
  "mixamorig:RightHandIndex4",
  "mixamorig:RightHandMiddle4",
  "mixamorig:RightHandRing4",
  "mixamorig:RightHandPinky4",
  "mixamorig:LeftHandThumb4",
  "mixamorig:LeftHandIndex4",
  "mixamorig:LeftHandMiddle4",
  "mixamorig:LeftHandRing4",
  "mixamorig:LeftHandPinky4",
  "mixamorig:RightToe_End",
  "mixamorig:LeftToe_End",
];

export interface RetargetResult {
  clip: THREE.AnimationClip;
  /** Jumlah track rotasi yang berhasil dipetakan. */
  mapped: number;
  /** Nama joint sumber yang di-skip (tak ada peta / target hilang). */
  skipped: string[];
}

/**
 * Retarget klip Mixamo ke rig DEF — ROTASI SAJA, translasi dibuang total.
 *
 * @param sourceClip klip sumber (mis. `mixamo.com` dari rumba GLB).
 * @param targetRoot root hierarki target (clone manekin — dipakai untuk
 *   verifikasi `getObjectByName(DEF-*)` ADA sebelum track dibuat).
 * @returns { clip, mapped, skipped } atau null bila 0 track rotasi cocok.
 */
export function retargetMixamoClipToDef(
  sourceClip: THREE.AnimationClip,
  targetRoot: THREE.Object3D
): RetargetResult | null {
  const newTracks: THREE.KeyframeTrack[] = [];
  const skipped: string[] = [];
  const seenSkipped = new Set<string>();

  const noteSkipped = (name: string) => {
    if (!seenSkipped.has(name)) {
      seenSkipped.add(name);
      skipped.push(name);
    }
  };

  for (const track of sourceClip.tracks) {
    const fullName = track.name ?? "";
    const dot = fullName.lastIndexOf(".");
    const boneName = dot >= 0 ? fullName.slice(0, dot) : fullName;
    const prop = dot >= 0 ? fullName.slice(dot + 1) : "";
    // SYARAT OWNER — buang translasi total (= in-place): hanya quaternion.
    if (prop !== "quaternion") continue;
    if (!boneName) continue;
    const defName: string | undefined = MIXAMO_TO_DEF[boneName];
    if (!defName) {
      noteSkipped(boneName);
      continue;
    }
    // Verifikasi target ADA di hierarki (jujur: file ganti → skip, bukan tebak).
    if (!targetRoot.getObjectByName(defName)) {
      noteSkipped(boneName);
      continue;
    }
    try {
      const src = track as THREE.QuaternionKeyframeTrack;
      const times = Array.from(
        (src.times as unknown as ArrayLike<number>) ?? []
      );
      const values = Array.from(
        (src.values as unknown as ArrayLike<number>) ?? []
      );
      if (times.length === 0 || values.length === 0) {
        noteSkipped(boneName);
        continue;
      }
      newTracks.push(
        new THREE.QuaternionKeyframeTrack(`${defName}.quaternion`, times, values)
      );
    } catch {
      noteSkipped(boneName);
    }
  }

  if (newTracks.length === 0) return null;
  const clip = new THREE.AnimationClip(
    RETARGETED_DANCE_CLIP_NAME,
    sourceClip.duration,
    newTracks
  );
  return { clip, mapped: newTracks.length, skipped };
}
