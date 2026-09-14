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
 * FASE 13 (12 Sep 2026, KEPUTUSAN OWNER: mesh aktif DIGANTI):
 * - kaos → tee-basic.glb (basic_t-shirt Sketchfab, fitted taper, span 0.71464):
 *   tshirt 56.0 / 0.71464 = 78.36 → 78.4. Komponen me-center geometri (mesh
 *   mentah melayang Y 0.84–1.63); collar/sleeve/surfaceZ diukur ulang di
 *   ruang centered (lihat komentar per field).
 * - hoodie → hoodie-blue.glb (blue_hoodie Sketchfab, LENGAN TERENTANG seperti
 *   jacket + node scale 0.01): world 0.05406×0.02695 (mungil). Komponen memanggang
 *   scale-up ×26 (kontinuitas torso ≈ mesh lama 0.70) → render 1.4056×0.7007.
 *   Kalibrasi via TINGGI 74.0 / 0.7007 = 105.6 (preseden jacket.glb — span
 *   lengan terentang tak representatif untuk dada).
 * - crewneck → sweater.glb (sweater_pack Sketchfab, BUKAN warisan hoodie.glb!
 *   crewneck akhirnya mesh sendiri tanpa tudung): lengan terentang juga →
 *   via TINGGI 72.0 / 0.70304 = 102.4.
 * Metode pita-dada: lebar/half-depth dari pita Y tengah (pct 30–70) +
 * neckline depan = max Y pada |x|<8% span, z>0 (ruang centered). RUMUS
 * cm/harga TAK DIUBAH — hanya data terukur.
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
  meshMultiplier: number;
  /** Lebar mesh terukur (unit 3D) — bukti kalibrasi, JANGAN diubah tanpa ukur ulang GLB. */
  measuredMeshWidthUnits: number;
  /** Jangkar X lengan di mesh (unit 3D) — posisi jahitan bahu terukur per apparel. */
  sleeveAnchorX: number;
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
    name: "Heavyweight Boxy Tee",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 12.0,
    // FASE 13 TERUKUR (tee-basic.glb, metode span sama seperti warisan):
    // 56.0 / 0.71464 = 78.36 → 78.4. Cross-check pita dada p5–p95 0.625
    // (56/0.625 = 89.6) — aset fitted taper (dada 0.62, hem 0.36); span
    // dipakai agar konsisten dengan kalibrasi warisan (span 0.550).
    meshMultiplier: 78.4,
    measuredMeshWidthUnits: 0.715,
    // TERUKUR ruang centered: bahu p95 |x| pita-atas 0.244 → 0.24.
    sleeveAnchorX: 0.24,
    // TERUKUR ruang centered: neckline depan 1.5755 − centerY 1.2381 = 0.337 → 0.34.
    collarBaselineY: 0.34,
  },
  longsleeve: {
    name: "Heavyweight Longsleeve",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 42.0, // Longsleeve typography down the entire arm
    meshMultiplier: 70.5, // TERUKUR: 56.0cm / 0.794 unit (longsleeve.glb)
    measuredMeshWidthUnits: 0.794,
    sleeveAnchorX: 0.36,
    collarBaselineY: 0.18,
  },
  crewneck: {
    name: "Heavyweight Crewneck",
    chestWidthCm: 58.0,
    bodyLengthCm: 72.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 38.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 9.0,
    maxSleeveHeightCm: 40.0,
    // FASE 13 TERUKUR (sweater.glb — crewneck BUKAN warisan hoodie.glb lagi,
    // akhirnya mesh sendiri TANPA tudung): lengan terentang (span 1.19686,
    // torso tengah ~0.38) → via TINGGI 72.0 / 0.70304 = 102.42 → 102.4
    // (preseden jacket.glb). Mesh di-center di komponen (mentah Y 0.92–1.62).
    meshMultiplier: 102.4,
    measuredMeshWidthUnits: 1.197,
    // TERUKUR: setengah torso bawah ≈ 0.19 (estimasi jahitan bahu; cek visual).
    sleeveAnchorX: 0.19,
    // TERUKUR ruang centered: neckline depan 1.5885 − centerY 1.27289 = 0.316 → 0.32.
    collarBaselineY: 0.32,
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
    maxSleeveHeightCm: 42.0,
    // FASE 13 TERUKUR (hoodie-blue.glb, lengan TERENTANG + node scale 0.01):
    // world 0.05406 (span) × 0.02695 (tinggi). Komponen memanggang ×26 →
    // render 1.4056 × 0.7007 (torso ≈ mesh lama). Via TINGGI (preseden
    // jacket.glb): 74.0 / 0.7007 = 105.61 → 105.6.
    meshMultiplier: 105.6,
    measuredMeshWidthUnits: 1.406,
    // TERUKUR best-effort: setengah torso bawah world 0.008 ×26 = 0.208 → 0.21.
    // Lengan terentang jauh dari torso — decal lengan bisa melayang; cek visual.
    sleeveAnchorX: 0.21,
    // TERUKUR ruang render-centered: neckline depan 0.0687×26 − center 1.47875
    // = 0.307 → 0.31 (hood bisa menjorok ke depan — cek visual).
    collarBaselineY: 0.31,
    // Tudung belakang: panel 18×14cm (riset: standar 15–20cm).
    // FASE 13: jangkar warisan hoodie.glb DIPERTAHANKAN SEMENTARA (mesh baru
    // beda posisi tudung; ukur ulang visual menyusul) — decal tudung bisa
    // meleset; bukan blocker mockup (sisi hood tetap ditawarkan).
    // Jangkar lama: mesh tudung y 1.588–1.926, z-belakang −0.115,
    // center() −(y 1.42, z −0.02) → runtime y 0.168–0.506 (tengah 0.34),
    // z-belakang −0.095. Ukur ulang bila mesh ganti (SUDAH ganti — antre).
    maxHoodWidthCm: 18.0,
    maxHoodHeightCm: 14.0,
    hoodAnchorY: 0.34,
    hoodAnchorZ: 0.095,
  },
  shirt: {
    name: "Streetwear Coach Jacket",
    chestWidthCm: 58.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 14.0, // Terpisah oleh Resleting Depan
    maxFrontHeightCm: 26.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 38.0,
    meshMultiplier: 69.5, // TERUKUR via tinggi: 74.0cm / 1.065 unit (jacket.glb lengan terentang, lebar 2.0 tidak representatif)
    measuredMeshWidthUnits: 2.0,
    sleeveAnchorX: 0.9,
    collarBaselineY: 0.16,
  },
  pants: {
    name: "Celana Panjang",
    // CELANA coming-soon TERUKUR (pants.glb, madjin MIT):
    // - lokal X ±0.16378 (lebar 0.32756), Y 0.11092–1.11342 (tinggi 1.00249),
    //   Z −0.11176…0.13243 (depth 0.24419); node translation Y −0.11495 +
    //   rotY 180° → WORLD Y −0.004…0.998 origin KAKI, Z −0.13243…0.11176.
    // - komponen me-center geometri (geo.center()) → render Y ±0.501,
    //   X ±0.164, Z ±0.122.
    // - chestWidthCm 32.7 = LEBAR MESH × multiplier (0.32756×99.8=32.69 —
    //   mesh slim, BUKAN standar konveksi; hanya untuk artboard pola).
    //   bodyLengthCm 100.0 = ASUMSI outseam size L (untuk artboard; multiplier
    //   via tinggi memakai angka ini — preseden jacket.glb).
    chestWidthCm: 32.7,
    bodyLengthCm: 100.0,
    // Area paha depan PLACEHOLDER JUJUR 25×30 (mockup-only, orderable FALSE
    // → tak pernah ditagih; DTF max tetap 30 di REAL_WORLD_PRINT_LIMITS).
    // Ukur ulang bila pola paha (paha melengkung + selangkangan) diukur.
    maxFrontWidthCm: 25.0,
    maxFrontHeightCm: 30.0,
    maxBackWidthCm: 25.0,
    maxBackHeightCm: 30.0,
    // Tak ada lengan — 0 = tak didukung (validSidesFor pants = front saja;
    // fitScale guard maxW<=0 → 1, tak dipakai).
    maxSleeveWidthCm: 0,
    maxSleeveHeightCm: 0,
    // TERUKUR via TINGGI: 100.0 / 0.964 = 103.73 → 103.7 (male_cargo_pants.glb).
    meshMultiplier: 103.7,
    measuredMeshWidthUnits: 0.403,
    sleeveAnchorX: 0.20,
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
    // TERUKUR via TINGGI: 50.0 / 0.379 = 131.9 (female_denim_short.glb).
    meshMultiplier: 131.9,
    measuredMeshWidthUnits: 0.407,
    sleeveAnchorX: 0.20,
    collarBaselineY: 0.19,
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
 * - 0.176 → longsleeve (warisan, tak diganti) & 0.24 → shirt (warisan).
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
  longsleeve: 0.176,
  crewneck: 0.151,
  hoodie: 0.177,
  shirt: 0.24,
  cap: 0.091,
  pants: 0.145,
  shorts: 0.145,
};

/** Ambil surfaceZ SSOT apparel tsb (fallback 0.176 bila apparel tak dikenal). */
export function surfaceZForApparel(apparelType: string = "tshirt"): number {
  return SURFACE_Z_PER_APPAREL[apparelType] ?? 0.176;
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
      : targetSide === "hood"
      ? (spec.maxHoodWidthCm ?? 0)
      : spec.maxFrontWidthCm;
  const maxH =
    targetSide === "back"
      ? spec.maxBackHeightCm
      : targetSide === "left_sleeve" || targetSide === "right_sleeve"
      ? spec.maxSleeveHeightCm
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
 * @param apparelType Jenis pakaian ("tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt")
 * @param decalScale Skala unit DecalLayer (MIN 0.04 SSOT; MAKS dinamis per apparel/sisi via maxDecalScaleUnits, mis. tshirt depan ≈0.295)
 * @param decalY Posisi Y decal (-0.35 s/d 0.35)
 * @param aspectRatio Rasio aspek gambar nyata (width / height), default 1.0
 * @param targetSide Sisi pakaian ("front" | "back" | "left_sleeve" | "right_sleeve")
 */
export function computePhysicalPrintDimensions(
  apparelType: string = "tshirt",
  decalScale: number = 0.11,
  decalY: number = -0.05,
  aspectRatio: number = 1.0,
  targetSide: DecalTargetSide = "front"
): PhysicalPrintDimension {
  const spec: ApparelSpec = APPAREL_PHYSICAL_SPECS[apparelType] || APPAREL_PHYSICAL_SPECS["tshirt"] || {
    name: "Heavyweight Boxy Tee",
    chestWidthCm: 56.0,
    bodyLengthCm: 74.0,
    maxFrontWidthCm: 30.0,
    maxFrontHeightCm: 42.0,
    maxBackWidthCm: 30.0,
    maxBackHeightCm: 42.0,
    maxSleeveWidthCm: 8.5,
    maxSleeveHeightCm: 12.0,
    meshMultiplier: 101.8,
    measuredMeshWidthUnits: 0.55,
    sleeveAnchorX: 0.27,
    collarBaselineY: 0.18,
  };
  
  let maxWidth = spec.maxFrontWidthCm;
  let maxHeight = spec.maxFrontHeightCm;

  if (targetSide === "back") {
    maxWidth = spec.maxBackWidthCm;
    maxHeight = spec.maxBackHeightCm;
  } else if (targetSide === "left_sleeve" || targetSide === "right_sleeve") {
    maxWidth = spec.maxSleeveWidthCm;
    maxHeight = spec.maxSleeveHeightCm;
  } else if (targetSide === "hood") {
    // Hoodie saja; non-hoodie max 0 → validasi sisi menolak di hulu.
    maxWidth = spec.maxHoodWidthCm ?? 0;
    maxHeight = spec.maxHoodHeightCm ?? 0;
  }

  // Scale-fit proporsional ke box sisi (audit: clamp lebar-dulu lalu tinggi
  // dari lebar-terjepit = distorsi + isWithin selalu true/tautologi).
  // Artwork portrait dikecilkan utuh agar muat, bukan dipaksa gepeng.
  const validAspectRatio = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawWidth = decalScale * spec.meshMultiplier;
  const rawHeight = rawWidth / validAspectRatio;
  const fitK = Math.min(1, maxWidth / Math.max(rawWidth, 0.01), maxHeight / Math.max(rawHeight, 0.01));
  const widthCm = Math.max(3.5, Math.round(rawWidth * fitK * 10) / 10);
  const heightCm = Math.max(3.5, Math.round(rawHeight * fitK * 10) / 10);

  // Konversi posisi Y ke jarak turun dari kerah dalam cm — via meshMultiplier
  // apparel ini (audit #15: faktor 36.0 lama SALAH, hasilnya ~1/3 jarak asli).
  const normalizedDistance = Math.max(0, spec.collarBaselineY - decalY);
  const offsetFromCollarCm = Math.max(
    2.0,
    Math.round(normalizedDistance * spec.meshMultiplier * 10) / 10
  );

  // Validasi terhadap ukuran MENTAH (pre-fit): cukup-tidaknya box dinilai
  // sebelum dijepit, bukan sesudah (audit: tautologi selalu-true).
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
