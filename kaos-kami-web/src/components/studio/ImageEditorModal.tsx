"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  RotateCcw,
  SlidersHorizontal,
  Crop,
  Sparkles,
  RotateCw,
  FlipHorizontal,
  Undo2,
} from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  DEFAULT_EDIT_JOB,
  SABLON_PRESETS,
  applyImageEdits,
  evaluateEditedQuality,
  getOriginalMasterDataUrl,
  hasOriginalMaster,
  setMasterDataUrl,
  setOriginalMasterDataUrl,
  type AdjustParams,
  type CropState,
  type EditJob,
  type SablonPresetId,
  type EditedQuality,
} from "@/lib/imageEditPipeline";

export interface ImageEditorModalProps {
  decalId: string;
  /** URL sumber edit — idealnya MASTER (resolusi penuh), bukan preview 1200px. */
  sourceUrl: string;
  decalName: string;
  printWidthCm?: number;
  printHeightCm?: number;
  onClose: () => void;
  onSaved?: (info: { dataUrl: string; quality: EditedQuality }) => void;
}

type EditorTab = "sesuaikan" | "potong" | "efek";

const HISTORY_LIMIT = 10;

function cloneJob(j: EditJob): EditJob {
  return {
    ...j,
    adjust: { ...j.adjust },
    crop: j.crop ? { ...j.crop } : null,
  };
}

/* ---------- Komponen baris slider (Bahasa Indonesia) ---------- */

function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-sans text-text-muted">
        <span className="font-semibold">{props.label}</span>
        <span className="text-text-primary font-bold font-mono text-[11px] tabular-nums">{props.display}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-accent cursor-pointer h-1.5"
      />
    </div>
  );
}

/* ---------- Modal / bottom-sheet ---------- */

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  decalId,
  sourceUrl,
  decalName,
  printWidthCm,
  printHeightCm,
  onClose,
  onSaved,
}) => {
  const updateDecal = useConfiguratorStore((s) => s.updateDecal);
  const { isMobile } = useDeviceTier();

  const [tab, setTab] = useState<EditorTab>("sesuaikan");
  const [jobState, setJobState] = useState<EditJob>(() => cloneJob(DEFAULT_EDIT_JOB));
  const [historyState, setHistoryState] = useState<EditJob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>(sourceUrl);
  const [isPreviewBusy, setIsPreviewBusy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const lastPushAt = useRef(0);
  const previewToken = useRef(0);
  // Mirror ref: updater setState wajib murni (StrictMode memanggilnya 2x) —
  // semua push history lewat ref agar tak ada setState di dalam updater.
  const jobRef = useRef<EditJob>(jobState);
  const historyRef = useRef<EditJob[]>(historyState);
  const job = jobState;
  const history = historyState;

  const pushHistory = (snapshot: EditJob) => {
    const next = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), cloneJob(snapshot)];
    historyRef.current = next;
    setHistoryState(next);
  };

  const applyJob = (next: EditJob) => {
    jobRef.current = next;
    setJobState(next);
  };

  const showPesan = useCallback((text: string, ms = 4000) => {
    setPesan(text);
    window.setTimeout(() => setPesan(null), ms);
  }, []);

  /** Commit job baru; snapshot ringan (time-guard) agar drag slider tak penuhi stack. */
  const commit = (
    next: EditJob,
    snapshot: "auto" | "force" | "skip" = "auto",
  ) => {
    if (snapshot !== "skip") {
      const now = Date.now();
      if (snapshot === "force" || now - lastPushAt.current > 600) {
        lastPushAt.current = now;
        pushHistory(jobRef.current);
      }
    }
    applyJob(next);
  };

  const patchAdjust = (partial: Partial<AdjustParams>) => {
    const now = Date.now();
    if (now - lastPushAt.current > 600) {
      lastPushAt.current = now;
      pushHistory(jobRef.current);
    }
    applyJob({ ...jobRef.current, adjust: { ...jobRef.current.adjust, ...partial } });
  };

  const handleUndo = () => {
    const h = historyRef.current;
    if (h.length === 0) return;
    const prev = cloneJob(h[h.length - 1]!);
    const next = h.slice(0, -1);
    historyRef.current = next;
    setHistoryState(next);
    applyJob(prev);
  };

  const handleReset = () => {
    commit(cloneJob(DEFAULT_EDIT_JOB), "force");
    showPesan("Semua pengaturan dikembalikan ke gambar asli.");
  };

  // Basis edit = prop sourceUrl (master resolusi penuh).
  const editBaseRef = useRef<string>(sourceUrl);
  useEffect(() => {
    editBaseRef.current = sourceUrl;
  }, [sourceUrl]);

  // M3.3 — Original tak tersentuh: simpan master awal SEKALI (first-write-wins)
  // agar "Kembalikan asli" selalu bisa pulihkan file upload awal walau user
  // sudah BG/sharp/edit berkali-kali. Best-effort, tak gagalkan buka modal.
  useEffect(() => {
    try {
      if (sourceUrl && sourceUrl.startsWith("data:image")) {
        setOriginalMasterDataUrl(decalId, sourceUrl);
      } else if (sourceUrl) {
        // Master https pun disimpan (restore tetap bisa tanpa re-upload).
        try { setOriginalMasterDataUrl(decalId, sourceUrl); } catch {}
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decalId]);
  const [hasOriginal, setHasOriginal] = useState<boolean>(() => {
    try { return hasOriginalMaster(decalId); } catch { return false; }
  });
  useEffect(() => {
    try { setHasOriginal(hasOriginalMaster(decalId)); } catch {}
  }, [decalId, previewUrl]);

  const handleRestoreOriginal = useCallback(() => {
    try {
      const orig = getOriginalMasterDataUrl(decalId);
      if (!orig) {
        showPesan("Original belum tersimpan untuk decal ini.");
        return;
      }
      pushHistory(jobRef.current);
      editBaseRef.current = orig;
      applyJob(cloneJob(DEFAULT_EDIT_JOB));
      // Simpan langsung ke kaos + master agar 3D/produksi sinkron.
      void (async () => {
        try {
          updateDecal(decalId, { url: orig });
          setMasterDataUrl(decalId, orig);
          try {
            const { getImageSize: _sz } = await import("@/lib/imageEditPipeline");
            const s = await _sz(orig);
            updateDecal(decalId, { printPx: { w: s.w, h: s.h } });
          } catch {}
          showPesan("Dikembalikan ke file asli upload awal.");
          setHasOriginal(true);
        } catch (e: any) {
          showPesan(`Gagal kembalikan: ${e?.message ?? e}`);
        }
      })();
    } catch (e: any) {
      showPesan(`Gagal kembalikan: ${e?.message ?? e}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decalId]);

  // ESC menutup (desktop; BottomSheet HP sudah punya ESC sendiri).
  useEffect(() => {
    if (isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobile, onClose]);

  const handleRotate90 = () => {
    pushHistory(jobRef.current);
    let next = jobRef.current.rotateDeg + 90;
    if (next > 180) next -= 360;
    applyJob({ ...jobRef.current, rotateDeg: next });
  };

  const handleFlipX = () => {
    pushHistory(jobRef.current);
    applyJob({ ...jobRef.current, flipX: !jobRef.current.flipX });
  };

  const handleClearCrop = () => {
    pushHistory(jobRef.current);
    applyJob({ ...jobRef.current, crop: null });
  };

  const patchCrop = (partial: Partial<CropState>) => {
    const base: CropState = jobRef.current.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    const next: CropState = {
      x: Math.min(0.9, Math.max(0, partial.x ?? base.x)),
      y: Math.min(0.9, Math.max(0, partial.y ?? base.y)),
      w: Math.min(1, Math.max(0.05, partial.w ?? base.w)),
      h: Math.min(1, Math.max(0.05, partial.h ?? base.h)),
    };
    if (next.x + next.w > 1) next.w = 1 - next.x;
    if (next.y + next.h > 1) next.h = 1 - next.y;
    applyJob({ ...jobRef.current, crop: next });
  };

  const handlePreset = (id: SablonPresetId) => {
    commit({ ...jobRef.current, preset: id }, "force");
    const found = SABLON_PRESETS.find((p) => p.id === id);
    if (found && id !== "none") showPesan(`Efek "${found.nama}" diterapkan di pratinjau. Klik Simpan untuk pakai.`);
  };

  // Preview live (debounce ~90ms, target <100ms per spek F1) dari basis aktif.
  useEffect(() => {
    const base = editBaseRef.current;
    const token = ++previewToken.current;
    setIsPreviewBusy(true);
    const t = window.setTimeout(() => {
      void applyImageEdits(base, job)
        .then((url) => {
          if (previewToken.current === token) setPreviewUrl(url);
        })
        .catch(() => {
          if (previewToken.current === token) setPreviewUrl(base);
        })
        .finally(() => {
          if (previewToken.current === token) setIsPreviewBusy(false);
        });
    }, 90);
    return () => window.clearTimeout(t);
    // `sourceUrl` ikut deps agar ganti decal me-render ulang pratinjau.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, sourceUrl]);

  // F5 — Simpan: render final dari piksel BARU → updateDecal → master → DPI re-check.
  // M3.3: BG/sharp/edit tulis MASTER PENUH (EDIT_MAX_SIDE=3000 = batas master,
  // tanpa cap 1600/2400 diam-diam). Bila sumber >3000 (import besar), hasil
  // di-cap + badge "master turun resolusi" tampil via pesan (jujur).
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Pastikan original tersimpan SEBELUM timpa (first-write-wins aman).
      try { setOriginalMasterDataUrl(decalId, editBaseRef.current); } catch {}
      const finalUrl = await applyImageEdits(editBaseRef.current, job);
      updateDecal(decalId, { url: finalUrl });
      setMasterDataUrl(decalId, finalUrl);
      try {
        const srcSz = await (await import("@/lib/imageEditPipeline")).getImageSize(editBaseRef.current).catch(() => null);
        const outSz = await (await import("@/lib/imageEditPipeline")).getImageSize(finalUrl).catch(() => null);
        if (srcSz && outSz && Math.max(srcSz.w, srcSz.h) > 3000 && Math.max(outSz.w, outSz.h) <= 3000) {
          showPesan("Master turun resolusi ke 3000px (cap aman HP) — file asli tetap di tombol Kembalikan asli.", 6000);
        }
      } catch {}
      let quality: EditedQuality | null = null;
      try {
        quality = await evaluateEditedQuality(
          finalUrl,
          printWidthCm && printWidthCm > 0 ? printWidthCm : 21,
          printHeightCm && printHeightCm > 0 ? printHeightCm : undefined
        );
      } catch {
        quality = null;
      }
      if (quality) {
        onSaved?.({ dataUrl: finalUrl, quality });
      } else {
        onSaved?.({
          dataUrl: finalUrl,
          quality: {
            dpi: 0,
            tier: "GOOD",
            badgeLabel: "Tersimpan — badge DPI menyusul",
            badgeColor: "",
            recommendation: "",
            pxW: 0,
            pxH: 0,
          },
        });
      }
      onClose();
    } catch (err: any) {
      showPesan(`Gagal menyimpan: ${err?.message ?? "kesalahan tak dikenal"}`, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [decalId, isSaving, job, onClose, onSaved, printHeightCm, printWidthCm, showPesan, updateDecal]);

  const a = job.adjust;
  const crop = job.crop;

  const content = (
    <div className="space-y-3 font-sans text-xs">
      {/* Pratinjau Gambar */}
      <div className="rounded-2xl overflow-hidden border border-border-subtle bg-neutral-950 flex items-center justify-center min-h-[130px] max-h-[180px] p-2 relative shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={`Pratinjau edit ${decalName}`}
          className="max-h-[160px] w-auto object-contain select-none"
        />
        {isPreviewBusy && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-[10px] text-white font-medium">
            Merender pratinjau…
          </div>
        )}
      </div>

      {/* Tab Navigasi */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-elevated/40 border border-border-subtle/50" role="tablist" aria-label="Mode edit gambar">
        {(
          [
            { id: "sesuaikan", label: "Sesuaikan", icon: SlidersHorizontal },
            { id: "potong", label: "Potong & Putar", icon: Crop },
            { id: "efek", label: "Efek Warna", icon: Sparkles },
          ] as Array<{ id: EditorTab; label: string; icon: any }>
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-brand-accent text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/60"
              }`}
            >
              <Icon size={12} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* F1 — Sesuaikan */}
      {tab === "sesuaikan" && (
        <div className="p-3 rounded-2xl bg-surface/60 border border-border-subtle space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
            <SliderRow label="Kecerahan" value={a.brightness} min={-1} max={1} step={0.01}
              display={Math.round(a.brightness * 100).toString()} onChange={(v) => patchAdjust({ brightness: v })} />
            <SliderRow label="Kontras" value={a.contrast} min={-1} max={1} step={0.01}
              display={Math.round(a.contrast * 100).toString()} onChange={(v) => patchAdjust({ contrast: v })} />
            <SliderRow label="Saturasi" value={a.saturation} min={-1} max={1} step={0.01}
              display={Math.round(a.saturation * 100).toString()} onChange={(v) => patchAdjust({ saturation: v })} />
            <SliderRow label="Vibrance" value={a.vibrance} min={-1} max={1} step={0.01}
              display={Math.round(a.vibrance * 100).toString()} onChange={(v) => patchAdjust({ vibrance: v })} />
            <SliderRow label="Hue Warna" value={a.hue} min={-180} max={180} step={1}
              display={`${Math.round(a.hue)}°`} onChange={(v) => patchAdjust({ hue: v })} />
            <SliderRow label="Gamma" value={a.gamma} min={0.2} max={3} step={0.01}
              display={a.gamma.toFixed(2)} onChange={(v) => patchAdjust({ gamma: v })} />
            <SliderRow label="Blur" value={a.blur} min={0} max={5} step={0.1}
              display={`${a.blur.toFixed(1)}px`} onChange={(v) => patchAdjust({ blur: v })} />
            <SliderRow label="Ketajaman" value={a.sharpen} min={0} max={1} step={0.01}
              display={`${Math.round(a.sharpen * 100)}%`} onChange={(v) => patchAdjust({ sharpen: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle/50">
            <button
              type="button"
              onClick={() => patchAdjust({ grayscale: !a.grayscale })}
              className={`py-1.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                a.grayscale ? "bg-text-primary text-canvas border-text-primary" : "bg-surface border-border-subtle text-text-primary hover:bg-surface-elevated"
              }`}
            >
              {a.grayscale ? "Grayscale (Aktif)" : "Grayscale"}
            </button>
            <button
              type="button"
              onClick={() => patchAdjust({ sepia: !a.sepia })}
              className={`py-1.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                a.sepia ? "bg-text-primary text-canvas border-text-primary" : "bg-surface border-border-subtle text-text-primary hover:bg-surface-elevated"
              }`}
            >
              {a.sepia ? "Sepia (Aktif)" : "Sepia"}
            </button>
          </div>
        </div>
      )}

      {/* F2 — Potong & Putar */}
      {tab === "potong" && (
        <div className="p-3 rounded-2xl bg-surface/60 border border-border-subtle space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRotate90}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-semibold hover:border-brand-accent transition-all cursor-pointer"
            >
              <RotateCw size={13} />
              <span>Putar 90°</span>
            </button>
            <button
              type="button"
              onClick={handleFlipX}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                job.flipX ? "bg-brand-accent/15 border-brand-accent text-brand-accent" : "bg-surface border-border-subtle text-text-primary hover:border-brand-accent"
              }`}
            >
              <FlipHorizontal size={13} />
              <span>{job.flipX ? "Balik Aktif" : "Balik Horizontal"}</span>
            </button>
          </div>
          <p className="text-[11px] font-sans text-text-muted leading-relaxed">
            Balik horizontal untuk teks sablon agar terbaca benar. Putaran tersimpan permanen di gambar master.
          </p>
          <SliderRow label="Putar Bebas" value={job.rotateDeg} min={-180} max={180} step={1}
            display={`${Math.round(job.rotateDeg)}°`}
            onChange={(v) => commit({ ...job, rotateDeg: v })} />
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs font-sans">Bingkai Potong (% Gambar)</span>
              {crop && (
                <button type="button" onClick={handleClearCrop} className="text-xs text-brand-accent hover:underline font-semibold cursor-pointer">
                  Hapus Potong
                </button>
              )}
            </div>
            {!crop ? (
              <button
                type="button"
                onClick={() => patchCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })}
                className="w-full py-2 rounded-xl border border-dashed border-border-strong text-text-muted text-xs font-semibold hover:border-brand-accent hover:text-text-primary transition-all cursor-pointer"
              >
                + Mulai Potong (80% Area Tengah)
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <SliderRow label="Kiri %" value={Math.round(crop.x * 100)} min={0} max={90} step={1}
                  display={`${Math.round(crop.x * 100)}%`} onChange={(v) => patchCrop({ x: v / 100 })} />
                <SliderRow label="Atas %" value={Math.round(crop.y * 100)} min={0} max={90} step={1}
                  display={`${Math.round(crop.y * 100)}%`} onChange={(v) => patchCrop({ y: v / 100 })} />
                <SliderRow label="Lebar %" value={Math.round(crop.w * 100)} min={5} max={100} step={1}
                  display={`${Math.round(crop.w * 100)}%`} onChange={(v) => patchCrop({ w: v / 100 })} />
                <SliderRow label="Tinggi %" value={Math.round(crop.h * 100)} min={5} max={100} step={1}
                  display={`${Math.round(crop.h * 100)}%`} onChange={(v) => patchCrop({ h: v / 100 })} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* F4 — Efek Sablon */}
      {tab === "efek" && (
        <div className="space-y-1.5">
          {SABLON_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePreset(p.id)}
              className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                job.preset === p.id
                  ? "bg-brand-accent/15 border-brand-accent shadow-sm"
                  : "bg-surface border-border-subtle hover:border-brand-accent/50"
              }`}
            >
              <span className={`block text-xs font-semibold ${job.preset === p.id ? "text-brand-accent font-bold" : "text-text-primary"}`}>
                {job.preset === p.id ? "• " : ""}{p.nama}
              </span>
              <span className="block text-[11px] text-text-muted mt-0.5">{p.deskripsi}</span>
            </button>
          ))}
        </div>
      )}

      {pesan && (
        <div className="p-2.5 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-xs font-medium">
          {pesan}
        </div>
      )}

      {/* Kembalikan Asli */}
      {hasOriginal && (
        <button
          type="button"
          onClick={handleRestoreOriginal}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/10 transition-all cursor-pointer"
          title="Pulihkan file upload awal (batalkan semua edit)"
        >
          <RotateCcw size={13} />
          <span>Kembalikan ke File Asli</span>
        </button>
      )}

      {/* Footer Aksi */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          title={`Urungkan (${history.length}/10)`}
          className="flex items-center gap-1 py-2 px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-semibold disabled:opacity-40 hover:border-brand-accent transition-all cursor-pointer"
        >
          <Undo2 size={13} />
          <span>{history.length}/10</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="py-2 px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-semibold hover:border-brand-accent transition-all cursor-pointer"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 px-3 rounded-xl bg-surface border border-border-subtle text-text-muted text-xs font-semibold hover:text-text-primary transition-all cursor-pointer"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="flex-[2] py-2 px-4 rounded-xl bg-brand-accent text-canvas text-xs font-bold disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          {isSaving ? "Menyimpan…" : "Simpan ke Mockup"}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet defaultSnap="full" onClose={onClose}>
        <div className="text-xs mb-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-brand-accent/15 text-brand-accent">Edit Gambar</span>
          <h3 className="text-sm font-bold text-text-primary truncate mt-1">{decalName}</h3>
        </div>
        {content}
      </BottomSheet>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit gambar ${decalName}`}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-3xl bg-surface/95 border border-border-subtle shadow-2xl p-4 sm:p-5 backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle/50">
          <div className="min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-brand-accent/15 text-brand-accent">
              Edit Gambar Sablon
            </span>
            <h3 className="text-sm sm:text-base font-sans font-bold text-text-primary truncate mt-0.5">{decalName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup editor gambar"
            className="w-8 h-8 rounded-full bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            <X size={15} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};
