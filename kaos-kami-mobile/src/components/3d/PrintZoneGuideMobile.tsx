"use client";

import React from 'react';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import {
  MOBILE_SIDE_BOX_CM,
  MOBILE_DECAL_SIDE_LABELS,
} from '@/lib/3d/mobileScaleCalibration';

/**
 * Q7 — PrintZoneGuide ringan (overlay HTML, NOL biaya WebGL/VRAM/baterai).
 * Batas cetak dibaca dari SSOT `MOBILE_SIDE_BOX_CM` di
 * lib/3d/mobileScaleCalibration (box per apparel per sisi) — JANGAN duplikat
 * angka di file ini. Toggle on/off via store `showPrintZone`.
 * Mount HANYA di CanvasStageMobile.
 */
export function PrintZoneGuideMobile() {
  const apparelType = useMobileStudioStore((s) => s.apparelType);
  const pendingSide = useMobileStudioStore((s) => s.pendingSide);
  const showPrintZone = useMobileStudioStore((s) => s.showPrintZone);
  const setShowPrintZone = useMobileStudioStore((s) => s.setShowPrintZone);

  const box =
    MOBILE_SIDE_BOX_CM[apparelType]?.[pendingSide] ??
    MOBILE_SIDE_BOX_CM[apparelType]?.front ??
    { w: 30, h: 38 };
  const hasZone = box.w > 0 && box.h > 0;
  const sideLabel = MOBILE_DECAL_SIDE_LABELS[pendingSide] ?? pendingSide;

  return (
    <>
      {showPrintZone && hasZone && (
        <div className="pointer-events-none absolute inset-x-0 top-[18%] z-10 flex flex-col items-center">
          <div
            className="rounded-lg border-2 border-dashed border-[#FF6B35]/70 bg-[#FF6B35]/5"
            style={{ width: '44%', aspectRatio: `${box.w} / ${box.h}` }}
          />
          <p className="mt-1 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-mono font-bold text-[#FF6B35]">
            Batas cetak {box.w}×{box.h} cm • {sideLabel}
          </p>
        </div>
      )}
      {showPrintZone && !hasZone && (
        <p className="pointer-events-none absolute inset-x-0 top-[18%] z-10 text-center text-[9px] font-mono font-bold text-zinc-400">
          Sisi {sideLabel} tak ada zona cetak
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowPrintZone(!showPrintZone)}
        className="absolute bottom-2 left-2 z-10 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-mono font-bold text-zinc-300 border border-white/15"
        title="Tampilkan/sembunyikan batas cetak"
      >
        {showPrintZone ? 'Sembunyikan Batas Cetak' : 'Tampilkan Batas Cetak'}
      </button>
    </>
  );
}
