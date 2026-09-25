/**
 * KALIBRASI SKALA FISIK MOBILE — port ringkas web
 * `kaos-kami-web/src/lib/scaleCalibration.ts` (JANGAN ubah web; file ini
 * cermin mandiri agar bundle mobile tak mengimpor workspace web).
 *
 * Isi port: 7 sisi target, batas geser (clampDecalXY), skala maks per sisi
 * (maxDecalScaleUnits), faktor fit box sisi (fitScaleToSideBox), dan
 * penempatan proyeksi 3D (getDecal3DPlacement → mobileDecalPlacement).
 * Penyederhanaan wajar vs web: tanpa armEulerLeft/Right (tak dipakai cabang
 * lengan — web menghitung Euler dari normal), tanpa varian sweater/jacket
 * legacy, tanpa komentar audit panjang. Angka = SAMA dengan web.
 */

/** 7 sisi sablon — cermin web `DecalTargetSide`. */
export type MobileDecalSide =
  | 'front'
  | 'back'
  | 'left_sleeve'
  | 'right_sleeve'
  | 'side_left'
  | 'side_right'
  | 'hood';

/** Label manusiawi sisi sablon (Bahasa Indonesia, cermin web DECAL_SIDE_LABELS). */
export const MOBILE_DECAL_SIDE_LABELS: Record<MobileDecalSide, string> = {
  front: 'Dada Depan',
  back: 'Punggung',
  side_left: 'Samping Kiri (Rusuk)',
  side_right: 'Samping Kanan (Rusuk)',
  left_sleeve: 'Lengan Kiri',
  right_sleeve: 'Lengan Kanan',
  hood: 'Tudung (Hood)',
};

/** Sisi valid per apparel (hood = hoodie saja; topi/celana tanpa lengan/tudung). */
export function validSidesForMobile(apparel: string): MobileDecalSide[] {
  if (apparel === 'cap') return ['front', 'side_left', 'side_right', 'back'];
  if (apparel === 'pants' || apparel === 'shorts')
    return ['front', 'back', 'side_left', 'side_right'];
  const base: MobileDecalSide[] = [
    'front',
    'back',
    'side_left',
    'side_right',
    'left_sleeve',
    'right_sleeve',
  ];
  return apparel === 'hoodie' ? [...base, 'hood'] : base;
}

/** Sisi yang diterima skema server (`DecalLayerSchema` web + `/api/designs`). */
export const SERVER_ACCEPTED_SIDES: ReadonlySet<string> = new Set([
  'front',
  'back',
  'left_sleeve',
  'right_sleeve',
  'hood',
]);

/**
 * Multiplier unit-3D → cm TERUKUR per apparel (SAMA dengan web
 * APPAREL_PHYSICAL_SPECS.meshMultiplier + MOBILE_UNITS_TO_CM di store).
 * SSOT angka ada di sini; store me-re-export agar satu sumber.
 */
export const MOBILE_MULTIPLIERS: Record<string, number> = {
  tshirt: 145.5,
  longsleeve: 145.5,
  crewneck: 163.7,
  sweater: 163.7,
  hoodie: 105.6,
  shirt: 69.5,
  cap: 50.0,
  pants: 103.7,
  shorts: 131.9,
};

/** Box cetak maks (cm) per apparel per sisi — cermin web APPAREL_PHYSICAL_SPECS. */
export interface SideBoxCm {
  w: number;
  h: number;
}
type SideBoxes = Record<MobileDecalSide, SideBoxCm>;

const BOX = (w: number, h: number): SideBoxCm => ({ w, h });
const NO_BOX: SideBoxCm = { w: 0, h: 0 };

export const MOBILE_SIDE_BOX_CM: Record<string, SideBoxes> = {
  tshirt: {
    front: BOX(30, 42),
    back: BOX(30, 42),
    left_sleeve: BOX(8.5, 14),
    right_sleeve: BOX(8.5, 14),
    side_left: BOX(12, 32),
    side_right: BOX(12, 32),
    hood: NO_BOX,
  },
  longsleeve: {
    front: BOX(30, 42),
    back: BOX(30, 42),
    left_sleeve: BOX(9, 42),
    right_sleeve: BOX(9, 42),
    side_left: BOX(12, 32),
    side_right: BOX(12, 32),
    hood: NO_BOX,
  },
  crewneck: {
    front: BOX(30, 38),
    back: BOX(30, 42),
    left_sleeve: BOX(9, 40),
    right_sleeve: BOX(9, 40),
    side_left: BOX(14, 30),
    side_right: BOX(14, 30),
    hood: NO_BOX,
  },
  sweater: {
    front: BOX(30, 38),
    back: BOX(30, 42),
    left_sleeve: BOX(9, 40),
    right_sleeve: BOX(9, 40),
    side_left: BOX(14, 30),
    side_right: BOX(14, 30),
    hood: NO_BOX,
  },
  hoodie: {
    front: BOX(28, 26),
    back: BOX(30, 42),
    left_sleeve: BOX(9, 40),
    right_sleeve: BOX(9, 40),
    side_left: BOX(14, 28),
    side_right: BOX(14, 28),
    hood: BOX(18, 14),
  },
  shirt: {
    front: BOX(28, 26),
    back: BOX(30, 42),
    left_sleeve: BOX(8.5, 38),
    right_sleeve: BOX(8.5, 38),
    side_left: BOX(14, 32),
    side_right: BOX(14, 32),
    hood: NO_BOX,
  },
  cap: {
    front: BOX(10, 6),
    back: BOX(8, 4.5),
    left_sleeve: NO_BOX,
    right_sleeve: NO_BOX,
    side_left: BOX(7, 5),
    side_right: BOX(7, 5),
    hood: NO_BOX,
  },
  pants: {
    front: BOX(25, 30),
    back: BOX(25, 30),
    left_sleeve: NO_BOX,
    right_sleeve: NO_BOX,
    side_left: BOX(14, 65),
    side_right: BOX(14, 65),
    hood: NO_BOX,
  },
  shorts: {
    front: BOX(22, 25),
    back: BOX(22, 25),
    left_sleeve: NO_BOX,
    right_sleeve: NO_BOX,
    side_left: BOX(14, 25),
    side_right: BOX(14, 25),
    hood: NO_BOX,
  },
};

function sideBox(apparel: string, side: MobileDecalSide): SideBoxCm {
  return MOBILE_SIDE_BOX_CM[apparel]?.[side] ?? MOBILE_SIDE_BOX_CM['tshirt']![side]!;
}

function multiplierFor(apparel: string): number {
  return MOBILE_MULTIPLIERS[apparel] ?? 100;
}

/**
 * SSOT offset permukaan dada per apparel — pindahan dari DecalGizmoMobile
 * (nilai = web SURFACE_Z_PER_APPAREL; ukur ulang bila mesh GLB diganti).
 */
export const MOBILE_SURFACE_Z: Record<string, number> = {
  tshirt: 0.151,
  longsleeve: 0.151,
  hoodie: 0.177,
  shirt: 0.07,
  crewneck: 0.151,
  sweater: 0.151,
  cap: 0.091,
  pants: 0.145,
  shorts: 0.145,
};

export function surfaceZForMobileApparel(apparel: string = 'tshirt'): number {
  return MOBILE_SURFACE_Z[apparel] ?? 0.176;
}

/**
 * SSOT batas geser decal (unit 3D) — SAMA dengan web DECAL_MOVE_LIMITS.
 */
export const MOBILE_DECAL_MOVE_LIMITS = {
  frontBackX: 0.35,
  frontBackY: 0.35,
  sleeveSlideX: 0.12,
  sleeveY: 0.35,
  sideX: 0.1,
  sideY: 0.35,
  hoodX: 0.09,
  hoodY: 0.06,
} as const;

/** Jepit posisi decal ke batas SSOT sisi tsb (murni, cermin web clampDecalXY). */
export function clampMobileDecalXY(
  targetSide: MobileDecalSide = 'front',
  x: number,
  y: number
): { x: number; y: number } {
  const L = MOBILE_DECAL_MOVE_LIMITS;
  if (targetSide === 'hood') {
    return {
      x: Math.max(-L.hoodX, Math.min(L.hoodX, x)),
      y: Math.max(-L.hoodY, Math.min(L.hoodY, y)),
    };
  }
  if (targetSide === 'left_sleeve' || targetSide === 'right_sleeve') {
    return {
      x: Math.max(-L.sleeveSlideX, Math.min(L.sleeveSlideX, x)),
      y: Math.max(-L.sleeveY, Math.min(L.sleeveY, y)),
    };
  }
  if (targetSide === 'side_left' || targetSide === 'side_right') {
    return {
      x: Math.max(-L.sideX, Math.min(L.sideX, x)),
      y: Math.max(-L.sideY, Math.min(L.sideY, y)),
    };
  }
  return {
    x: Math.max(-L.frontBackX, Math.min(L.frontBackX, x)),
    y: Math.max(-L.frontBackY, Math.min(L.frontBackY, y)),
  };
}

/**
 * Skala 3D MAKSIMAL agar klaim cm tepat menyentuh batas cetak sisi tsb
 * (cermin web maxDecalScaleUnits).
 */
export function mobileMaxDecalScaleUnits(
  apparel: string = 'tshirt',
  targetSide: MobileDecalSide = 'front'
): number {
  return sideBox(apparel, targetSide).w / multiplierFor(apparel);
}

/** Skala 3D minimal selaras Zod web `DecalLayerSchema.scale` (min 0.02). */
export const MOBILE_MIN_DECAL_SCALE = 0.02;

/**
 * Faktor fit sisi (0..1) agar artwork muat box sisi TANPA distorsi
 * (cermin web fitScaleToSideBox).
 */
export function mobileFitScaleToSideBox(
  apparel: string = 'tshirt',
  targetSide: MobileDecalSide = 'front',
  scale: number,
  aspectRatio: number = 1.0
): number {
  const box = sideBox(apparel, targetSide);
  const aspect = aspectRatio > 0 ? aspectRatio : 1.0;
  const rawW = scale * multiplierFor(apparel);
  const rawH = rawW / aspect;
  if (box.w <= 0 || box.h <= 0) return 1;
  return Math.min(1, box.w / Math.max(rawW, 0.01), box.h / Math.max(rawH, 0.01));
}

/** Klaim cm fisik untuk satu decal (lebar × tinggi + muat/tidak). */
export function mobileDecalCm(
  apparel: string = 'tshirt',
  targetSide: MobileDecalSide = 'front',
  scale: number,
  aspectRatio: number = 1.0
): { widthCm: number; heightCm: number; fits: boolean } {
  const box = sideBox(apparel, targetSide);
  const aspect = aspectRatio > 0 ? aspectRatio : 1.0;
  const mult = multiplierFor(apparel);
  const rawW = scale * mult;
  const rawH = rawW / aspect;
  const fitK = mobileFitScaleToSideBox(apparel, targetSide, scale, aspect);
  return {
    widthCm: Math.max(3.5, Math.round(rawW * fitK * 10) / 10),
    heightCm: Math.max(3.5, Math.round(rawH * fitK * 10) / 10),
    fits: rawW <= box.w + 1e-6 && rawH <= box.h + 1e-6,
  };
}

/** Kontur lengan per apparel — cermin web APPAREL_SLEEVE_SPECS (ringkas). */
const MOBILE_SLEEVE_SPECS: Record<
  string,
  {
    shoulder: { x: number; y: number; z: number; nx: number; ny: number };
    cuff: { x: number; y: number; z: number; nx: number; ny: number };
    depth: number;
    bow: number;
  }
> = {
  tshirt: {
    shoulder: { x: -0.18, y: 0.1, z: -0.019, nx: -0.8, ny: 0.61 },
    cuff: { x: -0.251, y: -0.045, z: -0.045, nx: -0.77, ny: -0.63 },
    depth: 0.075,
    bow: 0.015,
  },
  longsleeve: {
    shoulder: { x: -0.18, y: 0.1, z: -0.019, nx: -0.8, ny: 0.61 },
    cuff: { x: -0.425, y: -0.285, z: -0.017, nx: -1.0, ny: 0.07 },
    depth: 0.075,
    bow: 0.035,
  },
  crewneck: {
    shoulder: { x: -0.18, y: 0.1, z: -0.015, nx: -0.81, ny: 0.59 },
    cuff: { x: -0.525, y: -0.25, z: 0.03, nx: -0.84, ny: 0.53 },
    depth: 0.08,
    bow: 0.04,
  },
  sweater: {
    shoulder: { x: -0.18, y: 0.1, z: -0.015, nx: -0.81, ny: 0.59 },
    cuff: { x: -0.525, y: -0.25, z: 0.03, nx: -0.84, ny: 0.53 },
    depth: 0.08,
    bow: 0.04,
  },
  hoodie: {
    shoulder: { x: -0.189, y: 0.1, z: -0.036, nx: -0.73, ny: 0.67 },
    cuff: { x: -0.435, y: -0.245, z: 0.01, nx: -0.94, ny: 0.23 },
    depth: 0.08,
    bow: 0.035,
  },
  shirt: {
    shoulder: { x: -0.12, y: 0.035, z: -0.02, nx: -0.63, ny: 0.78 },
    cuff: { x: -0.3, y: -0.255, z: 0.03, nx: -0.87, ny: -0.4 },
    depth: 0.085,
    bow: 0.04,
  },
};

/** Hitung Euler (XYZ) dari normal permukaan — port web computeEulerFromNormal. */
function mobileEulerFromNormal(nx: number, ny: number, nz: number = 0): [number, number, number] {
  const lenZ = Math.hypot(nx, ny, nz) || 1;
  const zx = nx / lenZ;
  const zy = ny / lenZ;
  const zz = nz / lenZ;
  const lenX = Math.hypot(zz, -zx) || 1;
  const xx = zz / lenX;
  const xy = 0;
  const xz = -zx / lenX;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  const m00 = xx;
  const m01 = yx;
  const m02 = zx;
  const m12 = zy;
  const m22 = zz;
  const m11 = yy;
  const m21 = yz;
  const m20 = xz;
  void m20;
  const y = Math.asin(Math.max(-1, Math.min(1, m02)));
  let x: number;
  let z: number;
  if (Math.abs(m02) < 0.9999999) {
    x = Math.atan2(-m12, m22);
    z = Math.atan2(-m01, m00);
  } else {
    x = Math.atan2(m21, m11);
    z = 0;
  }
  return [x, y, z];
}

/** Jangkar X rusuk samping per apparel (cermin web sideAnchorX). */
const MOBILE_SIDE_ANCHOR_X: Record<string, number> = {
  tshirt: 0.185,
  longsleeve: 0.185,
  crewneck: 0.2,
  sweater: 0.2,
  hoodie: 0.2,
  shirt: 0.105,
  cap: 0.115,
  pants: 0.185,
  shorts: 0.185,
};

/** Jangkar tudung hoodie (cermin web hoodAnchorY/Z). */
const MOBILE_HOOD_ANCHOR = { y: 0.34, z: 0.095 };

/**
 * Parameter proyeksi 3D per sisi — port ringkas web getDecal3DPlacement.
 * Kedalaman dangkal anti-tembus + kontur lereng lengan + anti-shearing rusuk.
 */
export function mobileDecalPlacement(
  apparel: string,
  targetSide: MobileDecalSide,
  decalX: number,
  decalY: number,
  surfaceZ: number
): {
  position: [number, number, number];
  rotation: [number, number, number];
  projectionDepth: number;
} {
  const EPS = 0.004;

  if (targetSide === 'back') {
    const isCap = apparel === 'cap';
    const backZ = isCap ? 0.155 : surfaceZ;
    const depth = isCap ? 0.16 : Math.max(0.14, 0.32 - Math.max(0, Math.abs(decalX) - 0.08) * 1.5);
    return {
      position: [decalX, decalY, -(backZ + EPS)],
      rotation: [0, Math.PI, 0],
      projectionDepth: depth,
    };
  }

  if (targetSide === 'side_left' || targetSide === 'side_right') {
    const isCap = apparel === 'cap';
    const isPantsOrShorts = apparel === 'pants' || apparel === 'shorts';
    const sideX = MOBILE_SIDE_ANCHOR_X[apparel] ?? 0.185;
    const centerZ = isCap ? -0.055 : 0;
    const posZ = centerZ + Math.max(-0.08, Math.min(0.08, decalX));
    const depth = isCap ? 0.14 : isPantsOrShorts ? 0.2 : 0.16;
    const sign = targetSide === 'side_left' ? -1 : 1;
    return {
      position: [sign * (sideX + EPS), decalY, posZ],
      rotation: [0, sign * (Math.PI / 2), 0],
      projectionDepth: depth,
    };
  }

  if (targetSide === 'left_sleeve' || targetSide === 'right_sleeve') {
    const isRight = targetSide === 'right_sleeve';
    const sign = isRight ? -1 : 1;
    const sleeveSpec = MOBILE_SLEEVE_SPECS[apparel] ?? MOBILE_SLEEVE_SPECS['tshirt']!;
    const u = Math.max(0, Math.min(1, (0.35 - decalY) / 0.7));
    const sh = sleeveSpec.shoulder;
    const cf = sleeveSpec.cuff;
    const bow = Math.sin(u * Math.PI) * sleeveSpec.bow;
    const posXLeft = sh.x + (cf.x - sh.x) * u - bow;
    const posY = sh.y + (cf.y - sh.y) * u;
    const posZ = sh.z + (cf.z - sh.z) * u + decalX;
    const nx = sh.nx + (cf.nx - sh.nx) * u;
    const ny = sh.ny + (cf.ny - sh.ny) * u;
    return {
      position: [posXLeft * sign, posY, posZ],
      rotation: mobileEulerFromNormal(nx * sign, ny, 0),
      projectionDepth: sleeveSpec.depth,
    };
  }

  if (targetSide === 'hood') {
    const posX = Math.max(
      -MOBILE_DECAL_MOVE_LIMITS.hoodX,
      Math.min(MOBILE_DECAL_MOVE_LIMITS.hoodX, decalX)
    );
    const posY =
      MOBILE_HOOD_ANCHOR.y +
      Math.max(-MOBILE_DECAL_MOVE_LIMITS.hoodY, Math.min(MOBILE_DECAL_MOVE_LIMITS.hoodY, decalY));
    return {
      position: [posX, posY, -(MOBILE_HOOD_ANCHOR.z + EPS)],
      rotation: [0, Math.PI, 0],
      projectionDepth: 0.16,
    };
  }

  // Default: depan (dada).
  const depth = Math.max(0.14, 0.32 - Math.max(0, Math.abs(decalX) - 0.08) * 1.5);
  return {
    position: [decalX, decalY, surfaceZ + EPS],
    rotation: [0, 0, 0],
    projectionDepth: depth,
  };
}
