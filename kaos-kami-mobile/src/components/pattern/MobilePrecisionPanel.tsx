"use client";

import React, { useMemo, useState } from 'react';
import { Ruler, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { useShallow } from 'zustand/shallow';
import {
  MOBILE_SIDE_LABELS,
  MobilePatternSide,
  dpiGate,
  estimateDpi,
  sideLimitsFor,
  validSidesFor,
  validatePrecisionInput,
  widthCmToScale,
  DTF_MAX_WIDTH_CM,
  FABRIC_WEBVIEW_FOLLOW_UP,
} from '@/lib/pattern/mobilePrecision';
import { planMobileTiles, getMobileMaster, setMobileMaster } from '@/lib/pattern/mobileMasterRegistry';
import { getCurrentDecalKeySync, getDecalPxForDesignSync } from '@/lib/offline/persistentKeys';
import { haptic } from '@/lib/bridge/haptics';

/**
 * P2 — Mode presisi-cm mobile (TANPA kanvas 2D penuh), multi-decal.
 * Panel angka per-sisi: lebar cm, tinggi cm, offset kerah → tulis langsung
 * ke decal store (updateDecal skala + setDecalTransform DPI + offset) +
 * validasi batas 30cm + estimasi DPI dari piksel upload + fondasi
 * master-registry (simpan master https per decal id).
 * Cermin pola web: PatternStudio (magnet-snap, master-registry, gate DPI,
 * tiled A3) — di sini disederhanakan jadi angka dulu. Skala dikunci uniform
 * dari LEBAR (cermin web pushToStoreSync: scaleY=scaleX); tinggi dipakai
 * validasi + meta master + label cm.
 */
export function MobilePrecisionPanel({ onNotify }: { onNotify?: (msg: string) => void }) {
  const {
    apparelType,
    decals,
    selectedDecalId,
    printWidthCm,
    printHeightCm,
    offsetFromCollarCm,
    decalDpi,
    decalPosition,
    decalRotation,
    setSelectedDecalId,
    setDecalTransform,
    setOffsetFromCollarCm,
  } = useMobileStudioStore(
    useShallow((s) => ({
      apparelType: s.apparelType,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
      printWidthCm: s.printWidthCm,
      printHeightCm: s.printHeightCm,
      offsetFromCollarCm: s.offsetFromCollarCm,
      decalDpi: s.decalDpi,
      decalPosition: s.decalPosition,
      decalRotation: s.decalRotation,
      setSelectedDecalId: s.setSelectedDecalId,
      setDecalTransform: s.setDecalTransform,
      setOffsetFromCollarCm: s.setOffsetFromCollarCm,
    })),
  );

  const sides = useMemo(() => validSidesFor(apparelType), [apparelType]);
  const [side, setSide] = useState<MobilePatternSide>('front');
  const activeSide: MobilePatternSide = sides.includes(side) ? side : 'front';

  // Decal sisi aktif: terpilih bila cocok, else terakhir di sisi itu.
  const sideDecal = useMemo(() => {
    const sel = decals.find((d) => d.id === selectedDecalId);
    if (sel && sel.targetSide === activeSide) return sel;
    const list = decals.filter((d) => d.targetSide === activeSide);
    return list[list.length - 1] ?? null;
  }, [decals, selectedDecalId, activeSide]);

  const [w, setW] = useState<string>(String(printWidthCm));
  const [h, setH] = useState<string>(String(printHeightCm));
  const [off, setOff] = useState<string>(String(offsetFromCollarCm));
  const [msg, setMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setW((prev) => {
      const n = Number(prev);
      return Number.isFinite(n) && Math.abs(n - printWidthCm) < 0.05 ? prev : String(printWidthCm);
    });
    setH((prev) => {
      const n = Number(prev);
      return Number.isFinite(n) && Math.abs(n - printHeightCm) < 0.05 ? prev : String(printHeightCm);
    });
    setOff((prev) => {
      const n = Number(prev);
      return Number.isFinite(n) && Math.abs(n - offsetFromCollarCm) < 0.05 ? prev : String(offsetFromCollarCm);
    });
  }, [printWidthCm, printHeightCm, offsetFromCollarCm]);

  const lim = sideLimitsFor(apparelType, activeSide);

  // Estimasi DPI dari piksel upload aktual (cermin web masterDpiAt30cm).
  const pxW = useMemo(() => {
    try {
      const cur = getCurrentDecalKeySync();
      if (cur) {
        const v = getDecalPxForDesignSync(cur);
        if (v > 0) return v;
      }
      if (typeof window !== 'undefined') return Number(localStorage.getItem('kaoskami_decal_px') || 0);
      return 0;
    } catch {
      return 0;
    }
  }, [decalDpi, printWidthCm]);

  const wNum = Number(w);
  const dpiEst = estimateDpi(pxW, Number.isFinite(wNum) && wNum > 0 ? wNum : printWidthCm);
  const gate = dpiGate(dpiEst ?? decalDpi);
  const errors = validatePrecisionInput(apparelType, activeSide, {
    widthCm: Number(w),
    heightCm: Number(h),
    offsetCm: Number(off),
  });
  const tiledPlan = planMobileTiles(Number(w) || 0, Number(h) || 0);
  const masterEntry = sideDecal ? getMobileMaster(sideDecal.id) : null;

  const apply = () => {
    if (!sideDecal) {
      const m = `Sisi ${MOBILE_SIDE_LABELS[activeSide]} belum punya desain — upload logo dulu (pilih sisi ${MOBILE_SIDE_LABELS[activeSide]} saat upload).`;
      setMsg(m);
      onNotify?.(m);
      return;
    }
    const errs = validatePrecisionInput(apparelType, activeSide, {
      widthCm: Number(w),
      heightCm: Number(h),
      offsetCm: Number(off),
    });
    // Keras: tolak bila DPI < 150 (cermin web gate ekspor).
    const dpiNow = estimateDpi(pxW, Number(w)) ?? decalDpi;
    if (typeof dpiNow === 'number' && dpiNow > 0 && dpiNow < 150) {
      const m = `DITOLAK: master ~${dpiNow} DPI @${w}cm (<150). Perkecil sablon / pakai file lebih tajam.`;
      setMsg(m);
      onNotify?.(m);
      return;
    }
    if (errs.length > 0) {
      const m = errs[0] as string;
      setMsg(m);
      onNotify?.(m);
      return;
    }
    haptic.tapMedium();
    // Tulis ke store: kunci uniform dari lebar → skala 3D sisi ini.
    const s = widthCmToScale(apparelType, activeSide, Number(w));
    setSelectedDecalId(sideDecal.id);
    setDecalTransform(decalPosition, [s, s, s], decalRotation, Number(w), Number(h));
    setOffsetFromCollarCm(Number(off));
    // Fondasi master-registry: catat ukuran presisi ke entri master decal
    // ini (siap tiled nanti; https diisi saat upload R2 dari panel QC/upload).
    try {
      const prev = getMobileMaster(sideDecal.id);
      setMobileMaster(sideDecal.id, prev?.url ?? sideDecal.url ?? '', {
        dpi: (estimateDpi(pxW, Number(w)) ?? decalDpi) ?? undefined,
        wCm: Number(Number(w).toFixed(1)),
        hCm: Number(Number(h).toFixed(1)),
      });
    } catch {}
    const ok = `Presisi ${MOBILE_SIDE_LABELS[activeSide]} tersimpan: ${Number(w).toFixed(1)}×${Number(h).toFixed(1)}cm, offset ${Number(off).toFixed(1)}cm.`;
    setMsg(ok);
    onNotify?.(ok);
    haptic.success();
  };

  const toneCls =
    gate.tone === 'good'
      ? 'border-emerald-500/40 text-emerald-300'
      : gate.tone === 'ok'
        ? 'border-amber-500/40 text-amber-300'
        : gate.tone === 'bad'
          ? 'border-rose-500/40 text-rose-300'
          : 'border-zinc-700 text-zinc-400';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-[#FF6B35]" /> Mode Presisi-cm (angka per-sisi)
        </h3>
        <span className="text-[10px] font-mono text-zinc-500">maks {DTF_MAX_WIDTH_CM}cm</span>
      </div>

      {/* Tab sisi */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Sisi pola">
        {sides.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={activeSide === s}
            onClick={() => {
              haptic.selection();
              setSide(s);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
              activeSide === s
                ? 'bg-[#FF6B35] text-white border-[#FF6B35]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {MOBILE_SIDE_LABELS[s]}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-zinc-500">
        Batas sisi {MOBILE_SIDE_LABELS[activeSide]}: {lim.maxWcm}×{lim.maxHcm}cm •{' '}
        {tiledPlan.tiled ? `rencana tiled ${tiledPlan.cols}×${tiledPlan.rows}` : 'single file cukup'} •{' '}
        {sideDecal ? `decal ${sideDecal.id.slice(0, 14)}…` : 'belum ada decal di sisi ini'}
      </p>

      {/* Input angka */}
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Lebar (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={30}
            step={0.1}
            value={w}
            onChange={(e) => setW(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Tinggi (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={42}
            step={0.1}
            value={h}
            onChange={(e) => setH(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Offset kerah (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={30}
            step={0.1}
            value={off}
            onChange={(e) => setOff(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          />
        </label>
      </div>

      {/* DPI + validasi */}
      <div className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold bg-black/40 ${toneCls}`}>
        {pxW > 0 ? `${pxW}px ÷ ${w}cm → ` : ''}{gate.label}
      </div>
      {errors.length > 0 && (
        <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* Master-registry status */}
      <div className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 flex items-start gap-1.5">
        <Database className="w-3.5 h-3.5 shrink-0 mt-px text-zinc-500" />
        <span>
          {masterEntry
            ? masterEntry.url.startsWith('https')
              ? `Master decal ini sudah https R2 (siap checkout${masterEntry.tiled ? `, tiled ${masterEntry.cols}×${masterEntry.rows}` : ''}).`
              : 'Master decal ini masih lokal — upload via QC / checkout agar https.'
            : 'Master-registry: belum ada master untuk decal sisi ini (tersimpan otomatis saat Terapkan).'}
        </span>
      </div>

      <button
        onClick={apply}
        className="w-full py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-4 h-4" /> Terapkan ke Decal Store
      </button>
      {msg && <p className="text-[10px] text-zinc-400 text-center">{msg}</p>}
      <p className="text-[9px] text-zinc-600 leading-relaxed">
        Skala 3D dikunci uniform dari lebar (cermin web). FOLLOW-UP: {FABRIC_WEBVIEW_FOLLOW_UP}
      </p>
    </div>
  );
}
