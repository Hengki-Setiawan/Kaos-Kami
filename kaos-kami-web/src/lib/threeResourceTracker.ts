"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * ResourceTracker — pola dispose terpusat resmi three.js (FASE B3, Sep 2026).
 *
 * Masalah yang diobati (audit #6–#9): tiap komponen model dispose manual
 * dengan `try { x.dispose() } catch {}` tersebar — clone multi-part bocor
 * tiap ganti warna, material+merged leak di hoodie/shirt, dan effect
 * gabungan dispose geometri yang MASIH hidup saat material berubah
 * (mesh blank = use-after-dispose).
 *
 * Cara pakai resmi ( manual three.js "How to dispose of objects"):
 * 1. `track()` setiap geometry/material/texture MILIK SENDIRI
 *    (hasil `clone()`, `mergeGeometries()`, `new Material()`).
 * 2. JANGAN track cache GLB drei (`useGLTF`) / cache tekstur drei
 *    (`useTexture`) — itu milik bersama, dispose = flicker di tempat lain.
 * 3. `replace(lama, baru)` saat resource berganti generasi (ganti warna/
 *    mode) — yang lama langsung dispose, yang baru di-track.
 * 4. `dispose()` (atau hook `useResourceTracker`) saat unmount.
 *
 * Tracker per JENIS resource (geometri sendiri, material sendiri) — jangan
 * satu tracker untuk keduanya bila umurnya beda, kalau tidak ganti material
 * ikut membuang geometri yang masih dipakai.
 */

type DisposableResource = {
  dispose?: () => void;
};

function buangSumberDaya(resource: DisposableResource | null | undefined): void {
  if (!resource) return;
  try {
    resource.dispose?.();
  } catch {
    /* dispose idempoten three.js — abaikan bila sudah dibuang */
  }
}

export class ResourceTracker {
  private readonly tracked = new Set<DisposableResource>();

  /** Catat resource milik sendiri; kembalikan resource yang sama (bisa inline). */
  track<T extends DisposableResource>(resource: T): T {
    if (resource) this.tracked.add(resource);
    return resource;
  }

  /** Berhenti mencatat TANPA dispose (resource dialihkan ke pemilik lain). */
  untrack(resource: DisposableResource | null | undefined): void {
    if (resource) this.tracked.delete(resource);
  }

  /**
   * Ganti generasi: buang `lama` (bila beda dari `baru`), catat `baru`.
   * Dipakai di effect `[resource]` agar ganti warna/mode tak bocor VRAM.
   */
  replace(
    lama: DisposableResource | null | undefined,
    baru: DisposableResource | null | undefined
  ): void {
    if (lama && lama !== baru) {
      this.untrack(lama);
      buangSumberDaya(lama);
    }
    if (baru) this.track(baru);
  }

  /** Buang SEMUA yang tercatat (dipanggil saat unmount). Idempoten. */
  dispose(): void {
    for (const resource of Array.from(this.tracked)) {
      buangSumberDaya(resource);
    }
    this.tracked.clear();
  }

  /** Jumlah resource yang sedang dicatat (untuk uji kebocoran manual). */
  get size(): number {
    return this.tracked.size;
  }
}

/**
 * Hook React: satu tracker stabil per komponen + dispose otomatis saat unmount.
 * Verifikasi B3: ganti model 20x → `renderer.info.memory.geometries/materials`
 * datar (tracker membuang tiap generasi lama, bukan menumpuk).
 */
export function useResourceTracker(): ResourceTracker {
  const tracker = useMemo(() => new ResourceTracker(), []);
  useEffect(() => {
    return () => {
      tracker.dispose();
    };
  }, [tracker]);
  return tracker;
}

/**
 * Hook React: lacak SATU resource lintas generasi (ganti → buang lama).
 * Dipakai tiap komponen model: satu untuk geometri, satu untuk material
 * (umur beda — lihat peringatan di atas).
 */
export function useTrackedResource<T extends DisposableResource | null | undefined>(
  tracker: ResourceTracker,
  resource: T
): void {
  const prevRef = useRef<T | null>(null);
  useEffect(() => {
    tracker.replace(prevRef.current as DisposableResource | null, resource as DisposableResource | null);
    prevRef.current = resource;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker, resource]);
}
