"use client";

import * as THREE from "three";

/**
 * Persiapan geometri garmen sebelum render:
 * 1. ensureWindWeights — atribut `windWeight` per-vertex (0 di kerah/bahu,
 *    1 di hem/lengan bawah). TANPA ini shader wind tidak bergerak sama sekali
 *    (atribut kosong = 0 di WebGL). Dihitung SEKALI dari bounding box.
 * 2. ensureBoxUV — proyeksi UV box ala drcmda bila mesh TIDAK punya UV
 *    (kasus hoodie/jacket). Tanpa UV, normalMap anyaman diam-diam mati
 *    (three.js pakai UV default → normal konstan → terlihat plastik).
 *    Catatan: box-UV cukup untuk weave normal, BUKAN untuk cetakan akurat
 *    (lihat lib/printUV.ts untuk jalur cetak).
 */

export function ensureWindWeights(
  geo: THREE.BufferGeometry,
  pinY?: number,
  hemY?: number
): THREE.BufferGeometry {
  if (geo.getAttribute("windWeight")) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const top = pinY ?? (bb.min.y + (bb.max.y - bb.min.y) * 0.72);
  const bottom = hemY ?? bb.min.y;
  const span = Math.max(1e-5, top - bottom);
  const weights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // smoothstep: 0 di atas garis pin (bahu/kerah), 1 di hem
    const t = Math.max(0, Math.min(1, (top - y) / span));
    weights[i] = t * t * (3 - 2 * t);
  }
  geo.setAttribute("windWeight", new THREE.BufferAttribute(weights, 1));
  return geo;
}

export function ensureBoxUV(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.getAttribute("uv")) return geo;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  const nor = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!pos || !nor) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const maxSide = Math.max(size.x, size.y, size.z, 1e-5);
  const uv = new Float32Array(pos.count * 2);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    let u = 0;
    let v = 0;
    if (ax >= ay && ax >= az) {
      u = (p.z - bb.min.z) / maxSide;
      v = (p.y - bb.min.y) / maxSide;
    } else if (ay >= ax && ay >= az) {
      u = (p.x - bb.min.x) / maxSide;
      v = (p.z - bb.min.z) / maxSide;
    } else {
      u = (p.x - bb.min.x) / maxSide;
      v = (p.y - bb.min.y) / maxSide;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}
