/**
 * REAL-WORLD PHYSICAL SCALE CALIBRATION (3D-to-CM Mapping)
 * Standardized for DTF Sablon Workshop in Kota Makassar.
 * Based on international garment sizing charts and DTF print limits.
 *
 * KALIBRASI TERUKUR (Sep 2026): multiplier LAMA (175-185) SALAH ~1.8x.
 * Nilai baru diukur langsung dari bounding-box geometri GLB
 * (script ukur: min/max accessor POSITION) dibagi lebar dada acuan:
 *   unitsToCm = chestWidthCm / meshWidthUnits
 * - tshirt: 56 / 0.550 = 101.8
 * - longsleeve: 56 / 0.794 = 70.5
 * - hoodie & crewneck (mesh hoodie.glb sama): 60 / 0.631 = 95.1 / 58 / 0.631 = 91.9
 * - shirt (coach jacket, lengan terentang 2.0 unit): kalibrasi via TINGGI
 *   74 / 1.065 = 69.5 agar area dada proporsional.
 * Offset kerah = (collarBaselineY − decalY) × meshMultiplier (faktor 36.0 lama
 * terbukti SALAH Sep 2026 — diganti multiplier agar konsisten dengan sumbu X).
 *
 * FASE KALIBRASI TORSO DADA 1:1 (Sep 2026, 100% PARITAS 3D <-> 2D <-> DUNIA NYATA):
 * - Evaluasi matematis mendalam menemukan bahwa pembagi 0.71464 lama adalah
 *   bentang lengan ujung-ke-ujung (armspan), BUKAN lebar dada (torso chest)!
 * - Akibatnya gambar di 3D terlihat 1.86x - 2.0x lebih besar daripada di pola 2D,
 *   dan klaim cm terhitung 2x lebih kecil dari kenyataan visual.
 * - Kalibrasi mutlak: meshMultiplier = Lebar Dada Fisik (cm) / Lebar Dada Torso 3D (unit)
 *   - kaos (tee-basic.glb): Lebar dada torso terukur seam-to-seam 0.385 unit
 *     56.0 / 0.385 = 145.5 (1 unit = 145.5 cm).
 *   - longsleeve (longsleeve.glb): Torso sama dengan tee-basic = 0.385 unit
 *     56.0 / 0.385 = 145.5.
 *   - crewneck (sweater.glb): Torso terukur 0.354 unit
 *     58.0 / 0.354 = 163.7.
 *   - hoodie (hoodie-blue.glb): Kalibrasi via tinggi badan 74.0 / 0.7007 = 105.6.
 *   - shirt (jacket.glb): Kalibrasi via tinggi badan 74.0 / 1.065 = 69.5.
 * Hasilnya: Rasio persentase lebar dada sablon di 3D = di pola 2D = di produksi cetak DTF nyata!
 */

import type { DecalTargetSide } from "./constants";

export interface ApparelSpec {
  name: string;
  chestWidthCm: number;
  bodyLengthCm: number;
  maxFrontWidthCm: number;
  maxFrontHeightCm: number;
  maxBackWidthCm: number;
  maxBackHeightCm: number;
  maxSleeveWidthCm: number;
  maxSleeveHeightCm: number;
  /** Maksimal lebar sablon samping (rusuk/seam) dalam cm */
  maxSideWidthCm?: number;
  /** Maksimal tinggi sablon samping (vertikal) dalam cm */
  maxSideHeightCm?: number;
  meshMultiplier: number;
  /** Lebar mesh terukur (unit 3D) — bukti kalibrasi, JANGAN diubah tanpa ukur ulang GLB. */
  measuredMeshWidthUnits: number;
  /** Jangkar X lengan di mesh (unit 3D) — posisi jahitan bahu terukur per apparel. */
  sleeveAnchorX: number;
  /** Titik tengah lengan luar (outer sleeve X) untuk penempatan decal anti-tembus */
  outerSleeveX?: number;
  /** Posisi Y tengah lengan default */
  sleeveCenterY?: number;
  /** Kemiringan lengan (delta X per delta Y ke bawah) */
  sleeveSlope?: number;
  /** Vektor bahu kiri [X, Y, Z] untuk komputasi arah tulang lengan 3D */
  armShoulder?: [number, number, number];
  /** Vektor pergelangan kiri [X, Y, Z] untuk komputasi arah tulang lengan 3D */
  armCuff?: [number, number, number];
  /** Orientasi Euler [X, Y, Z] proyektor lengan kiri sejajar tulang lengan */
  armEulerLeft?: [number, number, number];
  /** Orientasi Euler [X, Y, Z] proyektor lengan kanan sejajar tulang lengan */
  armEulerRight?: [number, number, number];
  /** Jangkar X rusuk/pinggang samping */
  sideAnchorX?: number;
  /** Y kerah di mesh (unit 3D), TERUKUR per apparel (0.14–0.18).
   * Konversi ke cm SELALU via meshMultiplier apparel tsb (bukan konstanta
   * global) — setiap apparel diskala dari mesh-nya sendiri (audit #15).
   * Rumus offset = (collarBaselineY − decalY) × meshMultiplier. */
  collarBaselineY: number;
  /** Tudung (hoodie SAJA, riset Sep 2026: panel hood 15–20cm, tengah tudung,
   * press datar hindari jahitan). Unit 3D, dikalibrasi visualiteratif —
   * ukur ulang bila mesh ganti. Non-hoodie: undefined = tak didukung. */
  maxHoodWidthCm?: number;
  maxHoodHeightCm?: number;
  hoodAnchorY?: number;
  hoodAnchorZ?: number;
}

export const APPAREL_PHYSICAL_SPECS: Record<string, ApparelSpec> = {
  tshirt: {
    name: "Kaos Polos & Custom Kaos Kami",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 14.0,
    maxSideWidthCm: 12.0,
    maxSideHeightCm: 32.0,
    meshMultiplier: 145.5,
    measuredMeshWidthUnits: 0.385,
    sleeveAnchorX: 0.17,
    outerSleeveX: 0.34,
    sleeveCenterY: 0.02,
    sleeveSlope: 0.50,
    armShoulder: [-0.170, 0.220, -0.020],
    armCuff: [-0.340, 0.110, -0.020],
    armEulerLeft: [1.5708, -1.3090, 1.5708],
    armEulerRight: [-1.5708, 1.3090, -1.5708],
    sideAnchorX: 0.185,
    collarBaselineY: 0.165,
  },
  longsleeve: {
    name: "Kaos Lengan Panjang Kaos Kami",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 42.0, // Longsleeve typography down the entire arm
    maxSideWidthCm: 12.0,
    maxSideHeightCm: 32.0,
    meshMultiplier: 145.5,
    measuredMeshWidthUnits: 0.385,
    sleeveAnchorX: 0.17,
    // SWAP 20 Sep 2026: mesh = ex-sweater (lengan panjang + rib cuff, torso parity
    // 2.6% vs longsleeve lama) — scale 0.72/crown -0.12 dipertahankan.
    outerSleeveX: 0.43,
    sleeveCenterY: -0.12,
    sleeveSlope: 0.35,
    armShoulder: [-0.180, 0.180, -0.020],
    armCuff: [-0.425, -0.285, -0.010],
    armEulerLeft: [1.5708, -1.2305, 1.5708],
    armEulerRight: [-1.5708, 1.2305, -1.5708],
    sideAnchorX: 0.185,
    collarBaselineY: 0.165,
  },
  crewneck: {
    name: "Sweater Crewneck Kaos Kami",
    chestWidthCm: 58.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 38.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 40.0,
    maxSideWidthCm: 14.0,
    maxSideHeightCm: 30.0,
    meshMultiplier: 163.7,
    measuredMeshWidthUnits: 0.354,
    sleeveAnchorX: 0.17,
    outerSleeveX: 0.60,
    sleeveCenterY: -0.08,
    sleeveSlope: 0.50,
    armShoulder: [-0.180, 0.200, -0.020],
    armCuff: [-0.600, -0.240, 0.040],
    armEulerLeft: [1.5708, -1.0123, 1.5708],
    armEulerRight: [-1.5708, 1.0123, -1.5708],
    sideAnchorX: 0.20,
    collarBaselineY: 0.160,
  },
  hoodie: {
    name: "Heavyweight Oversized Hoodie",
    chestWidthCm: 60.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 28.0, // Dibatasi oleh Saku Kangaroo
    maxFrontHeightCm: 26.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 40.0,
    maxSideWidthCm: 14.0,
    maxSideHeightCm: 28.0,
    meshMultiplier: 105.6,
    measuredMeshWidthUnits: 0.870,
    sleeveAnchorX: 0.175,
    outerSleeveX: 0.44,
    sleeveCenterY: -0.08,
    sleeveSlope: 0.35,
    armShoulder: [-0.190, 0.100, -0.030],
    armCuff: [-0.440, -0.250, 0.010],
    armEulerLeft: [1.5708, -1.1868, 1.5708],
    armEulerRight: [-1.5708, 1.1868, -1.5708],
    sideAnchorX: 0.20,
    collarBaselineY: 0.31,
    // Tudung belakang: panel 18×14cm (riset: standar 15–20cm).
    maxHoodWidthCm: 18.0,
    maxHoodHeightCm: 14.0,
    hoodAnchorY: 0.34,
    hoodAnchorZ: 0.095,
  },
  shirt: {
    // SWAP 20 Sep 2026 (perintah owner): mesh = pullover hoodie Pieter Ferreira
    // (CC-BY 4.0, "Jacket new.glb") — TANPA resleting depan. Kalibrasi height-based
    // dipertahankan: tinggi baked 1.8473 × 0.2999 = 0.55395 = jacket lama
    // (1.06522 × 0.52), jadi meshMultiplier 69.5 + body 74cm tetap valid 1:1.
    // Konsekuensi produk: depan kini FULL (28cm, cermin hoodie), bukan split 14cm.
    name: "Streetwear Coach Jacket",
    chestWidthCm: 58.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 28.0, // Pullover hoodie tanpa resleting (dulu 14.0 split resleting)
    maxFrontHeightCm: 26.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 38.0,
    maxSideWidthCm: 14.0,
    maxSideHeightCm: 32.0,
    meshMultiplier: 69.5,
    // Bentang ternormalisasi A-pose 2.0584 × 0.2999 = 0.617 (dulu 1.040 T-pose).
    // Height-based: angka ini dokumentasi, bukan pembagi meshMultiplier.
    measuredMeshWidthUnits: 0.617,
    sleeveAnchorX: 0.12,
    outerSleeveX: 0.31,
    sleeveCenterY: -0.06,
    sleeveSlope: 0.55,
    armShoulder: [-0.120, 0.035, -0.020],
    armCuff: [-0.300, -0.255, 0.030],
    armEulerLeft: [1.5708, -0.9076, 1.5708],
    armEulerRight: [-1.5708, 0.9076, -1.5708],
    // Setengah hem baked 0.65078 × 0.2999 = 0.195/2 ≈ 0.098 + EPS proyektor.
    sideAnchorX: 0.105,
    collarBaselineY: 0.155,
  },
  pants: {
    name: "Celana Panjang",
    chestWidthCm: 32.7,
    bodyLengthCm: 100.0,
    maxFrontWidthCm: 25.0,
    maxFrontHeightCm: 30.0,
    maxBackWidthCm: 25.0,
    maxBackHeightCm: 30.0,
    maxSleeveWidthCm: 0,
    maxSleeveHeightCm: 0,
    maxSideWidthCm: 14.0,
    maxSideHeightCm: 65.0, // Memanjang untuk tipografi vertikal streetwear
    meshMultiplier: 103.7,
    measuredMeshWidthUnits: 0.403,
    sleeveAnchorX: 0.20,
    sideAnchorX: 0.185,
    collarBaselineY: 0.48,
  },
  shorts: {
    name: "Celana Pendek",
    chestWidthCm: 40.7,
    bodyLengthCm: 50.0,
    maxFrontWidthCm: 22.0,
    maxFrontHeightCm: 25.0,
    maxBackWidthCm: 22.0,
    maxBackHeightCm: 25.0,
    maxSleeveWidthCm: 0,
    maxSleeveHeightCm: 0,
    maxSideWidthCm: 14.0,
    maxSideHeightCm: 25.0,
    meshMultiplier: 131.9,
    measuredMeshWidthUnits: 0.407,
    sleeveAnchorX: 0.20,
    sideAnchorX: 0.185,
    collarBaselineY: 0.19,
  },
  cap: {
    name: "Topi Baseball Custom Kaos Kami",
    chestWidthCm: 20.0,
    bodyLengthCm: 15.0,
    maxFrontWidthCm: 10.0, // Mahkota Depan (10cm x 6cm)
    maxFrontHeightCm: 6.0,
    maxBackWidthCm: 8.0,  // Mahkota Belakang (8cm x 4.5cm)
    maxBackHeightCm: 4.5,
    maxSleeveWidthCm: 0,
    maxSleeveHeightCm: 0,
    maxSideWidthCm: 7.0,  // Samping Mahkota (7cm x 5cm)
    maxSideHeightCm: 5.0,
    meshMultiplier: 100.0,
    measuredMeshWidthUnits: 0.200,
    sleeveAnchorX: 0.10,
    sideAnchorX: 0.115,
    collarBaselineY: 0.00,
  },
};

export const REAL_WORLD_PRINT_LIMITS = {
  maxPrintWidthCm: 30.0,
  maxPrintHeightCm: 42.0,
  /** Batas visual minimal decal (unit 3D) — ≈3.5–4cm di semua apparel. */
  minDecalScaleUnits: 0.04,
  chestWidthReferenceCm: {
    tshirt: 56.0,
    longsleeve: 56.0,
    crewneck: 58.0,
    hoodie: 60.0,
    shirt: 58.0,
    pants: 32.7,
    shorts: 28.4,
  } as Record<string, number>,
};

/**
 * SSOT OFFSET PERMUKAAN DADA (surfaceZ) PER APPAREL — FASE B3 (Sep 2026).
 *
 * TEMUAN AUDIT #6: tiga angka beda dipakai bergantian — gizmo default 0.18,
 * guide default 0.155, renderer shirt 0.24. Selisih 0.025–0.085 unit ×
 * multiplier 69.5–101.8 = decal/gizmo/guide meleset ±2.5–6cm satu sama lain
 * (decal terlihat pas di gizmo tapi keluar garis hijau, atau sebaliknya).
 *
 * KALIBRASI TERUKUR: nilai = setengah ketebalan (Z) bbox mesh SETELAH
 * center() pada area dada (bukan tebakan).
 * FASE 13 (mesh baru — ukur ulang pita dada pct 30–70, TANPA margin warisan):
 * - 0.151 → tshirt (tee-basic.glb, half-depth pita 0.15127) & crewneck
 *   (sweater.glb, half-depth pita 0.1511 — kebetulan sama).
 * - 0.177 → hoodie (hoodie-blue.glb: half-depth world 0.0068 ×26 = 0.1768).
 * - 0.091 → cap (cap.glb: muka crown maxZ 0.1397 − centerZ 0.04903 = 0.0907;
 *   depth penuh 0.548 menyesatkan karena termasuk lidah topi).
 * - 0.122 → pants (pants.glb: depth lokal 0.24419/2 = 0.1221; muka depan
 *   maxZ 0.13243 − centerZ 0.01034 = 0.1221 — depan/belakang hampir
 *   simetris, tak ada lidah menyesatkan seperti topi).
 * - 0.120 → shorts (shorts.glb TERUKUR 12 Sep 2026: depth lokal
 *   0.23954/2 = 0.1198; muka depan world maxZ 0.11834 − centerZ −0.00143
 *   = 0.1198 — depan/belakang hampir simetris seperti pants).
 * - 0.176 → longsleeve (warisan, tak diganti).
 * - 0.070 → shirt (TERUKUR 20 Sep 2026: hoodie Pieter Ferreira, half-depth pita
 *   dada baked 0.46748/2 × 0.2999 = 0.0701 — ganti warisan 0.185/0.24).
 * Ukur ulang (bbox-Z dada/2 setelah center()) bila mesh GLB diganti.
 * JANGAN ubah tanpa ukur ulang — semua pemakai (renderer, gizmo, guide)
 * WAJIB import dari sini, bukan angka literal.
 *
 * Offset tambahan di tiap pemakai SENGAJA beda dan TIDAK disatukan:
 * - renderer +0.004 (EPS anti z-fight, riset three.js resmi),
 * - guide +0.002 (garis tepat di atas kain),
 * - gizmo +0.01 (target sentuh/hover).
 */
export const SURFACE_Z_PER_APPAREL: Record<string, number> = {
  tshirt: 0.151,
  longsleeve: 0.151,
  crewneck: 0.151,
  hoodie: 0.177,
  shirt: 0.070,
  cap: 0.091,
  pants: 0.145,
  shorts: 0.145,
};

/** Ambil surfaceZ SSOT apparel tsb (fallback 0.176 bila apparel tak dikenal). */
export function surfaceZForApparel(apparelType: string = "tshirt"): number {
  return SURFACE_Z_PER_APPAREL[apparelType] ?? 0.176;
}

/**
 * SSOT OFFSET VERTIKAL GEOMETRI (crownYOffset) PER APPAREL — KALIBRASI KELARASAN 3D.
 * Dipakai oleh extractApparelGeometry untuk me-center bahu dan leher.
 * Wajib dipakai oleh DecalGizmo agar kotak kontrol gizmo menempel 1:1 di atas sablon.
 */
export const CROWN_Y_OFFSETS: Record<string, number> = {
  tshirt: -0.12,
  longsleeve: -0.12,
  // SWAP 20 Sep 2026: sweater Tristen — kerah di 0.160 =
  // half-height 1.287769 × 0.1965 − 0.093 (dulu −0.10 untuk mesh lama).
  crewneck: -0.093,
  shirt: -0.075,
  hoodie: 0,
  cap: -0.11,
  pants: 0,
  shorts: 0,
};

export function crownYOffsetForApparel(apparelType: string = "tshirt"): number {
  return CROWN_Y_OFFSETS[apparelType] ?? 0;
}

/**
 * SSOT BATAS GESER DECAL (unit 3D) — FASE B3 (Sep 2026).
 *
 * TEMUAN AUDIT #4: tiga angka beda — gizmo ±0.25, guide |x|>0.08, store
 * ±0.35. Kini SATU angka dipakai gizmo (drag), renderer (jangkar tampil),
 * dan selaras dengan slider CustomizerDrawer (−0.35…0.35) + validasi muat
 * StudioDesignLoader/PatternStudio (±0.35):
 * - Depan/belakang ±0.35 — area dada/punggung datar, decal tak lepas kain.
 * - Lengan: geser-x ±0.12 — lebih jauh = bidang datar MELAYANG dari lengkung
 *   lengan (audit #5d); geser-y ikut ±0.35 (sepanjang lengan).
 * - Tudung: x ±0.09 (≈±8.5cm) + y ±0.06 — area panel tudung 18×14cm.
 * Diukur dari jangkar per-apparel (sleeveAnchorX / hoodAnchorY/Z di spek).
 * JANGAN ubah tanpa cek visual tiap sisi — angka ini tampil, bukan teori.
 */
export const DECAL_MOVE_LIMITS = {
  /** Geser X/Y decal depan & belakang (unit 3D). */
  frontBackX: 0.35,
  frontBackY: 0.35,
  /** Geser-x (melingkar) decal lengan (unit 3D). */
  sleeveSlideX: 0.12,
  /** Geser-y (sepanjang) decal lengan (unit 3D). */
  sleeveY: 0.35,
  /** Geser-x (sepanjang rusuk Z) decal samping (unit 3D). */
  sideX: 0.10,
  /** Geser-y (vertikal badan) decal samping (unit 3D). */
  sideY: 0.35,
  /** Geser-x decal tudung dari tengah tudung (unit 3D). */
  hoodX: 0.09,
  /** Geser-y decal tudung dari jangkar tudung (unit 3D). */
  hoodY: 0.06,
} as const;

/**
 * Jepit posisi decal ke batas SSOT sisi tsb (murni, tanpa efek samping).
 * Dipakai gizmo saat drag; renderer memakai angka yang SAMA untuk jangkar
 * tampil agar kotak kontrol tak pernah lepas dari gambar sablon.
 */
export function clampDecalXY(
  targetSide: DecalTargetSide = "front",
  x: number,
  y: number
): { x: number; y: number } {
  if (targetSide === "hood") {
    return {
      x: Math.max(-DECAL_MOVE_LIMITS.hoodX, Math.min(DECAL_MOVE_LIMITS.hoodX, x)),
      y: Math.max(-DECAL_MOVE_LIMITS.hoodY, Math.min(DECAL_MOVE_LIMITS.hoodY, y)),
    };
  }
  if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    return {
      x: Math.max(-DECAL_MOVE_LIMITS.sleeveSlideX, Math.min(DECAL_MOVE_LIMITS.sleeveSlideX, x)),
      y: Math.max(-DECAL_MOVE_LIMITS.sleeveY, Math.min(DECAL_MOVE_LIMITS.sleeveY, y)),
    };
  }
  if (targetSide === "side_left" || targetSide === "side_right") {
    return {
      x: Math.max(-DECAL_MOVE_LIMITS.sideX, Math.min(DECAL_MOVE_LIMITS.sideX, x)),
      y: Math.max(-DECAL_MOVE_LIMITS.sideY, Math.min(DECAL_MOVE_LIMITS.sideY, y)),
    };
  }
  return {
    x: Math.max(-DECAL_MOVE_LIMITS.frontBackX, Math.min(DECAL_MOVE_LIMITS.frontBackX, x)),
    y: Math.max(-DECAL_MOVE_LIMITS.frontBackY, Math.min(DECAL_MOVE_LIMITS.frontBackY, y)),
  };
}

/**
 * Skala 3D MAKSIMAL agar klaim cm-nya tepat menyentuh batas cetak sisi tsb:
 * maxScale = maxWidthCm / multiplier. Tanpa ini, multiplier benar justru
 * mengunci pengguna di 16.5cm (0.162 warisan multiplier 185 yang salah).
 */
export function maxDecalScaleUnits(
  apparelType: string = "tshirt",
  targetSide: DecalTargetSide = "front"
): number {
  const spec =
    APPAREL_PHYSICAL_SPECS[apparelType] ?? APPAREL_PHYSICAL_SPECS["tshirt"] ?? APPAREL_PHYSICAL_SPECS[Object.keys(APPAREL_PHYSICAL_SPECS)[0] as string]!;
  const maxW =
    targetSide === "back"
      ? spec.maxBackWidthCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveWidthCm
      : targetSide === "side_left" || targetSide === "side_right"
      ? (spec.maxSideWidthCm ?? 14.0)
      : targetSide === "hood"
      ? (spec.maxHoodWidthCm ?? 0)
      : spec.maxFrontWidthCm;
  return maxW / spec.meshMultiplier;
}

/**
 * Faktor fit sisi (0..1) agar artwork muat box sisi TANPA distorsi.
 * Dipakai renderer (ukuran tampil = ukuran produksi, audit) + compute dims.
 */
export function fitScaleToSideBox(
  apparelType: string = "tshirt",
  targetSide: DecalTargetSide = "front",
  scale: number,
  aspectRatio: number = 1.0
): number {
  const spec =
    APPAREL_PHYSICAL_SPECS[apparelType] ?? APPAREL_PHYSICAL_SPECS["tshirt"] ?? APPAREL_PHYSICAL_SPECS[Object.keys(APPAREL_PHYSICAL_SPECS)[0] as string]!;
  const maxW =
    targetSide === "back"
      ? spec.maxBackWidthCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveWidthCm
      : targetSide === "side_left" || targetSide === "side_right"
      ? (spec.maxSideWidthCm ?? 14.0)
      : targetSide === "hood"
      ? (spec.maxHoodWidthCm ?? 0)
      : spec.maxFrontWidthCm;
  const maxH =
    targetSide === "back"
      ? spec.maxBackHeightCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveHeightCm
      : targetSide === "side_left" || targetSide === "side_right"
      ? (spec.maxSideHeightCm ?? 32.0)
      : targetSide === "hood"
      ? (spec.maxHoodHeightCm ?? 0)
      : spec.maxFrontHeightCm;
  const aspect = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawW = scale * spec.meshMultiplier;
  const rawH = rawW / aspect;
  if (maxW <= 0 || maxH <= 0) return 1;
  return Math.min(1, maxW / Math.max(rawW, 0.01), maxH / Math.max(rawH, 0.01));
}

export interface PhysicalPrintDimension {
  widthCm: number;
  heightCm: number;
  offsetFromCollarCm: number;
  isWithinProductionLimits: boolean;
  formattedText: string;
}

/**
 * Konversi skala dan posisi 3D UV decal ke ukuran sentimeter fisik nyata garmen.
 * Rasio dikalibrasi 1:1 terhadap cetak sablon DTF (Maksimal 30.0 cm).
 */
export function computePhysicalPrintDimensions(
  apparelType: string = "tshirt",
  decalScale: number = 0.11,
  decalY: number = -0.05,
  aspectRatio: number = 1.0,
  targetSide: DecalTargetSide = "front"
): PhysicalPrintDimension {
  const spec: ApparelSpec = APPAREL_PHYSICAL_SPECS[apparelType] || APPAREL_PHYSICAL_SPECS["tshirt"] || {
    name: "Kaos Polos & Custom Kaos Kami",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 12.0,
    maxSideWidthCm: 14.0,
    maxSideHeightCm: 32.0,
    meshMultiplier: 145.5,
    measuredMeshWidthUnits: 0.385,
    sleeveAnchorX: 0.28,
    collarBaselineY: 0.165,
  };
  
  let maxWidth = spec.maxFrontWidthCm;
  let maxHeight = spec.maxFrontHeightCm;

  if (targetSide === "back") {
    maxWidth = spec.maxBackWidthCm;
    maxHeight = spec.maxBackHeightCm;
  } else if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    maxWidth = spec.maxSleeveWidthCm;
    maxHeight = spec.maxSleeveHeightCm;
  } else if (targetSide === "side_left" || targetSide === "side_right") {
    maxWidth = spec.maxSideWidthCm ?? 14.0;
    maxHeight = spec.maxSideHeightCm ?? 32.0;
  } else if (targetSide === "hood") {
    maxWidth = spec.maxHoodWidthCm ?? 0;
    maxHeight = spec.maxHoodHeightCm ?? 0;
  }

  const validAspectRatio = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawWidth = decalScale * spec.meshMultiplier;
  const rawHeight = rawWidth / validAspectRatio;
  const fitK = Math.min(1, maxWidth / Math.max(rawWidth, 0.01), maxHeight / Math.max(rawHeight, 0.01));
  const widthCm = Math.max(3.5, Math.round(rawWidth * fitK * 10) / 10);
  const heightCm = Math.max(3.5, Math.round(rawHeight * fitK * 10) / 10);

  const normalizedDistance = Math.max(0, spec.collarBaselineY - decalY);
  const offsetFromCollarCm = Math.max(
    2.0,
    Math.round(normalizedDistance * spec.meshMultiplier * 10) / 10
  );

  const fitsBox = rawWidth <= maxWidth + 1e-6 && rawHeight <= maxHeight + 1e-6;
  const isWithinProductionLimits = fitsBox;
  const formattedText = `${widthCm.toFixed(1)} cm × ${heightCm.toFixed(1)} cm (Maks ${maxWidth} cm)`;

  return {
    widthCm,
    heightCm,
    offsetFromCollarCm,
    isWithinProductionLimits,
    formattedText,
  };
}

export const APPAREL_SLEEVE_SPECS: Record<
  string,
  {
    shoulder: { x: number; y: number; z: number; nx: number; ny: number };
    cuff: { x: number; y: number; z: number; nx: number; ny: number };
    depth: number;
    bow: number;
  }
> = {
  tshirt: {
    shoulder: { x: -0.180, y: 0.100, z: -0.019, nx: -0.80, ny: 0.61 },
    cuff: { x: -0.251, y: -0.045, z: -0.045, nx: -0.77, ny: -0.63 },
    depth: 0.075,
    bow: 0.015,
  },
  longsleeve: {
    // SWAP 20 Sep 2026: mesh = ex-sweater.glb. Cuff TERUKUR (dual-method:
    // bin-slope −0.43 + band-avg −0.394 → −0.425; y −0.28/−0.297 → −0.285).
    // Lengan lebih panjang → bow 0.025 → 0.035 (sepanjang hoodie).
    shoulder: { x: -0.180, y: 0.100, z: -0.019, nx: -0.80, ny: 0.61 },
    cuff: { x: -0.425, y: -0.285, z: -0.017, nx: -1.00, ny: 0.07 },
    depth: 0.075,
    bow: 0.035,
  },
  crewneck: {
    // SWAP 20 Sep 2026: mesh = sweater Tristen (CC-BY 4.0). Shoulder valid tetap
    // (x 0.180 persis). Cuff TERUKUR: band-avg x 0.501 → tip −0.525, y −0.244 → −0.250.
    shoulder: { x: -0.180, y: 0.100, z: -0.015, nx: -0.81, ny: 0.59 },
    cuff: { x: -0.525, y: -0.250, z: 0.030, nx: -0.84, ny: 0.53 },
    depth: 0.080,
    bow: 0.040,
  },
  hoodie: {
    shoulder: { x: -0.189, y: 0.100, z: -0.036, nx: -0.73, ny: 0.67 },
    cuff: { x: -0.435, y: -0.245, z: 0.010, nx: -0.94, ny: 0.23 },
    depth: 0.080,
    bow: 0.035,
  },
  shirt: {
    // SWAP 20 Sep 2026: mesh = hoodie Pieter Ferreira (A-pose lengan menggantung,
    // bukan T-pose). Shoulder/cuff TERUKUR di ruang ternormalisasi
    // (scale 0.2999): shoulder x 0.118/y 0.008+bias → (−0.120, 0.035);
    // cuff (0.286, −0.260) → (−0.300, −0.255). Normal + depth + bow dipertahankan.
    shoulder: { x: -0.120, y: 0.035, z: -0.020, nx: -0.63, ny: 0.78 },
    cuff: { x: -0.300, y: -0.255, z: 0.030, nx: -0.87, ny: -0.40 },
    depth: 0.085,
    bow: 0.040,
  },
};

/** Hitung Euler (XYZ) dari normal permukaan tanpa ketergantungan library eksternal */
function computeEulerFromNormal(nx: number, ny: number, nz: number = 0): [number, number, number] {
  const lenZ = Math.hypot(nx, ny, nz) || 1;
  const zx = nx / lenZ, zy = ny / lenZ, zz = nz / lenZ;
  
  // projX = cross((0,1,0), (zx, zy, zz)) = (zz, 0, -zx)
  const lenX = Math.hypot(zz, -zx) || 1;
  const xx = zz / lenX, xy = 0, xz = -zx / lenX;
  
  // projY = cross(projZ, projX)
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  // Basis matrix (XYZ order)
  const m00 = xx, m01 = yx, m02 = zx;
  const m10 = xy, m11 = yy, m12 = zy;
  const m20 = xz, m21 = yz, m22 = zz;

  const y = Math.asin(Math.max(-1, Math.min(1, m02)));
  let x: number, z: number;
  if (Math.abs(m02) < 0.9999999) {
    x = Math.atan2(-m12, m22);
    z = Math.atan2(-m01, m00);
  } else {
    x = Math.atan2(m21, m11);
    z = 0;
  }
  return [x, y, z];
}

/**
 * Parameter proyeksi 3D presisi untuk semua sisi pakaian (Dada, Punggung, Samping Kiri/Kanan, Lengan Kiri/Kanan, Tudung).
 * - Menghilangkan distorsi sudut 90° (tarikan/shearing) pada rusuk pinggang samping.
 * - Menggunakan kedalaman dangkal anti-tembus (0.10) agar sablon lengan TIDAK menembus ke torso.
 * - Mengikuti kontur lereng lengan (A-pose slope) secara otomatis saat Y digeser.
 */
export function getDecal3DPlacement(
  apparelType: string,
  targetSide: DecalTargetSide,
  decalX: number,
  decalY: number,
  surfaceZ: number
): {
  position: [number, number, number];
  rotation: [number, number, number];
  projectionDepth: number;
} {
  const spec = APPAREL_PHYSICAL_SPECS[apparelType] ?? APPAREL_PHYSICAL_SPECS["tshirt"]!;
  const EPS = 0.004;

  if (targetSide === "back") {
    const isCap = apparelType === "cap";
    const backZ = isCap ? 0.155 : surfaceZ;
    const depth = isCap ? 0.16 : Math.max(0.14, 0.32 - Math.max(0, Math.abs(decalX) - 0.08) * 1.5);
    return {
      position: [decalX, decalY, -(backZ + EPS)],
      rotation: [0, Math.PI, 0],
      projectionDepth: depth,
    };
  }

  if (targetSide === "side_left") {
    const isCap = apparelType === "cap";
    const isPantsOrShorts = apparelType === "pants" || apparelType === "shorts";
    const sideX = spec.sideAnchorX ?? 0.185;
    // Untuk cap, pusat mahkota Z = -0.055. Untuk baju/celana Z = 0
    const centerZ = isCap ? -0.055 : 0;
    const posZ = centerZ + Math.max(-0.08, Math.min(0.08, decalX));
    const depth = isCap ? 0.14 : isPantsOrShorts ? 0.20 : 0.16;
    return {
      position: [-(sideX + EPS), decalY, posZ],
      rotation: [0, -Math.PI / 2, 0],
      projectionDepth: depth,
    };
  }

  if (targetSide === "side_right") {
    const isCap = apparelType === "cap";
    const isPantsOrShorts = apparelType === "pants" || apparelType === "shorts";
    const sideX = spec.sideAnchorX ?? 0.185;
    const centerZ = isCap ? -0.055 : 0;
    const posZ = centerZ + Math.max(-0.08, Math.min(0.08, decalX));
    const depth = isCap ? 0.14 : isPantsOrShorts ? 0.20 : 0.16;
    return {
      position: [sideX + EPS, decalY, posZ],
      rotation: [0, Math.PI / 2, 0],
      projectionDepth: depth,
    };
  }

  if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    const isRight = targetSide === "right_sleeve";
    const sign = isRight ? -1 : 1;

    const key =
      apparelType === "sweater"
        ? "crewneck"
        : apparelType === "jacket"
        ? "shirt"
        : apparelType;

    const sleeveSpec = APPAREL_SLEEVE_SPECS[key] ?? APPAREL_SLEEVE_SPECS["tshirt"]!;

    // decalY berkisar dari +0.35 (Pangkal Bahu) hingga -0.35 (Ujung Manset / Cuff)
    // u = 0.0 (Bahu) -> u = 0.5 (Tengah Lengan) -> u = 1.0 (Ujung Manset)
    const u = Math.max(0, Math.min(1, (0.35 - decalY) / 0.70));

    const sh = sleeveSpec.shoulder;
    const cf = sleeveSpec.cuff;

    // Interpolasi kontur lereng lengan alami (dengan lengkungan busur kain)
    const bow = Math.sin(u * Math.PI) * sleeveSpec.bow;
    const posXLeft = sh.x + (cf.x - sh.x) * u - bow;
    const posY = sh.y + (cf.y - sh.y) * u;
    const posZ = sh.z + (cf.z - sh.z) * u + decalX;

    // Normal vektor permukaan lengan pada ketinggian u
    const nx = sh.nx + (cf.nx - sh.nx) * u;
    const ny = sh.ny + (cf.ny - sh.ny) * u;

    const rotation = computeEulerFromNormal(nx * sign, ny, 0);

    return {
      position: [posXLeft * sign, posY, posZ],
      rotation,
      projectionDepth: sleeveSpec.depth,
    };
  }

  if (targetSide === "hood") {
    const hoodY = spec.hoodAnchorY ?? 0.34;
    const hoodZ = spec.hoodAnchorZ ?? 0.095;
    const posX = Math.max(-DECAL_MOVE_LIMITS.hoodX, Math.min(DECAL_MOVE_LIMITS.hoodX, decalX));
    const posY = hoodY + Math.max(-DECAL_MOVE_LIMITS.hoodY, Math.min(DECAL_MOVE_LIMITS.hoodY, decalY));
    return {
      position: [posX, posY, -(hoodZ + EPS)],
      rotation: [0, Math.PI, 0],
      projectionDepth: 0.16,
    };
  }

  // Default: Front (Dada) - Depth 0.32 di tengah, mengecil saat mendekati rusuk (|x|>0.08)
  const depth = Math.max(0.14, 0.32 - Math.max(0, Math.abs(decalX) - 0.08) * 1.5);
  return {
    position: [decalX, decalY, surfaceZ + EPS],
    rotation: [0, 0, 0],
    projectionDepth: depth,
  };
}

