// src/lib/verletCloth.ts — Simulasi kain Verlet (integrasi + constraint distance).
// JS MURNI tanpa dependensi: aman di browser, HP, maupun Workers.
// Pola dari contoh resmi three.js (webgl_animation_cloth) + interaksi tarik
// (pick-nearest + hard-pull pada bidang kamera + sentakan saat lepas).
// FULL GARMENT sewing sim ala Marvelous (jahit pola + tabrakan badan) SENGAJA
// tidak dibuat: butuh R&D berbulan-bulan + pola jahit authored. Lab ini memberi
// "rasa kain" yang jujur: drape, tarikan, angin, dan beda GSM.

export interface VerletOptions {
  nx: number; // partikel horizontal
  ny: number; // partikel vertikal
  spacing: number; // jarak istirahat antar partikel (unit 3D)
  mass: number; // massa total (dipakai untuk inersia redaman)
  damping: number; // 0..1 (0.98 = katun, 0.995 = licin)
  iterations: number; // iterasi constraint (kaku; 8-20)
  pinTopRow: boolean; // gantung seperti di hanger
  gravity?: number; // default -9.81 (skala unit)
}

export interface VerletCloth {
  nx: number;
  ny: number;
  positions: Float32Array;
  step: (dt: number, time: number, wind: { x: number; y: number; z: number }) => void;
  /** Paksa partikel ke posisi (untuk tarik kursor). */
  forcePosition: (i: number, x: number, y: number, z: number) => void;
  /** Tambah kecepatan (sentakan saat lepas). */
  addVelocity: (i: number, vx: number, vy: number, vz: number) => void;
  /** Indeks partikel terdekat dari titik (abaikan yang di-pin). */
  pickNearest: (x: number, y: number, z: number, maxCount: number) => number[];
  reset: () => void;
}

export function createClothParticleGrid(o: VerletOptions): VerletCloth {
  const { nx, ny, spacing } = o;
  const count = (nx + 1) * (ny + 1);
  const positions = new Float32Array(count * 3);
  const previous = new Float32Array(count * 3);
  const invMass = new Float32Array(count);

  const idx = (i: number, j: number) => j * (nx + 1) + i;

  function reset() {
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const k = idx(i, j);
        const x = (i - nx / 2) * spacing;
        const y = -(j * spacing);
        positions[k * 3] = x;
        positions[k * 3 + 1] = y;
        positions[k * 3 + 2] = 0;
        previous[k * 3] = x;
        previous[k * 3 + 1] = y;
        previous[k * 3 + 2] = 0;
        invMass[k] = o.pinTopRow && j === 0 ? 0 : 1;
      }
    }
  }
  reset();

  interface Link { a: number; b: number; rest: number }
  const links: Link[] = [];
  const link = (a: number, b: number) => {
    const dx = positions[a * 3]! - positions[b * 3]!;
    const dy = positions[a * 3 + 1]! - positions[b * 3 + 1]!;
    const dz = positions[a * 3 + 2]! - positions[b * 3 + 2]!;
    links.push({ a, b, rest: Math.sqrt(dx * dx + dy * dy + dz * dz) });
  };
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      if (i < nx) link(idx(i, j), idx(i + 1, j));
      if (j < ny) link(idx(i, j), idx(i, j + 1));
      // Shear (diagonal) agar tidak melar aneh saat ditarik.
      if (i < nx && j < ny) {
        link(idx(i, j), idx(i + 1, j + 1));
        link(idx(i + 1, j), idx(i, j + 1));
      }
    }
  }

  const gravity = o.gravity ?? -9.81;

  function step(dt: number, time: number, wind: { x: number; y: number; z: number }) {
    const dtC = Math.min(dt, 1 / 30);
    const damp = o.damping;
    // Tiupan angin berombak (deterministik dari waktu) × slider user.
    const gust = 0.6 + 0.4 * Math.sin(time * 1.7) * Math.sin(time * 0.6 + 1.3);
    const wx = wind.x * gust;
    const wy = wind.y * gust;
    const wz = (wind.z + 0.35 * Math.sin(time * 2.3)) * gust;
    for (let k = 0; k < count; k++) {
      if (invMass[k] === 0) continue;
      const i3 = k * 3;
      const px = positions[i3]!;
      const py = positions[i3 + 1]!;
      const pz = positions[i3 + 2]!;
      // Verlet: x' = x + (x - xPrev) * damping + a * dt^2
      positions[i3] = px + (px - previous[i3]!) * damp + wx * dtC * dtC;
      positions[i3 + 1] = py + (py - previous[i3 + 1]!) * damp + (gravity * 0.12 + wy) * dtC * dtC;
      positions[i3 + 2] = pz + (pz - previous[i3 + 2]!) * damp + wz * dtC * dtC;
      previous[i3] = px;
      previous[i3 + 1] = py;
      previous[i3 + 2] = pz;
    }
    // Relaksasi constraint (stiffness via iterasi).
    for (let it = 0; it < o.iterations; it++) {
      for (const L of links) {
        const a3 = L.a * 3;
        const b3 = L.b * 3;
        const wa = invMass[L.a]!;
        const wb = invMass[L.b]!;
        const wsum = wa + wb;
        if (wsum === 0) continue;
        let dx = positions[b3]! - positions[a3]!;
        let dy = positions[b3 + 1]! - positions[a3 + 1]!;
        let dz = positions[b3 + 2]! - positions[a3 + 2]!;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = ((dist - L.rest) / dist / wsum) * 0.5;
        dx *= diff; dy *= diff; dz *= diff;
        positions[a3]! += dx * wa;
        positions[a3 + 1]! += dy * wa;
        positions[a3 + 2]! += dz * wa;
        positions[b3]! -= dx * wb;
        positions[b3 + 1]! -= dy * wb;
        positions[b3 + 2]! -= dz * wb;
      }
    }
  }

  function forcePosition(i: number, x: number, y: number, z: number) {
    if (invMass[i] === 0) return;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  function addVelocity(i: number, vx: number, vy: number, vz: number) {
    if (invMass[i] === 0) return;
    // Verlet velocity tersirat di (pos - prev): geser prev berlawanan arah.
    previous[i * 3]! -= vx * 0.016;
    previous[i * 3 + 1]! -= vy * 0.016;
    previous[i * 3 + 2]! -= vz * 0.016;
  }

  function pickNearest(x: number, y: number, z: number, maxCount: number): number[] {
    const radius = spacing * 3;
    const r2 = radius * radius;
    const scored: Array<{ i: number; d: number }> = [];
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < count; k++) {
      if (invMass[k] === 0) continue;
      const dx = positions[k * 3]! - x;
      const dy = positions[k * 3 + 1]! - y;
      const dz = positions[k * 3 + 2]! - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = k; }
      if (d <= r2) scored.push({ i: k, d });
    }
    if (scored.length === 0 && best >= 0) scored.push({ i: best, d: bestD });
    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, maxCount).map((s) => s.i);
  }

  return { nx, ny, positions, step, forcePosition, addVelocity, pickNearest, reset };
}

/** Preset rasa kain dari data MaterialFinish (GSM). */
export function gsmPreset(slug: string): { damping: number; iterations: number; windGain: number; label: string } {
  switch (slug) {
    case "french-terry":
      return { damping: 0.985, iterations: 10, windGain: 0.7, label: "Fleece 380 — jatuh berat" };
    case "acid-wash":
      return { damping: 0.975, iterations: 14, windGain: 1.0, label: "Acid 240 — renyah" };
    case "combed-cotton":
    default:
      return { damping: 0.98, iterations: 12, windGain: 0.85, label: "Combed 240/280 — seimbang" };
  }
}
