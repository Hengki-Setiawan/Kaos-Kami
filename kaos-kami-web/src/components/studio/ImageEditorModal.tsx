"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Save, PenTool, X, RotateCcw } from "lucide-react";
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
    <div>
      <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1">
        <span className="font-bold uppercase">{props.label}</span>
        <span className="text-text-primary font-bold">{props.display}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-accent cursor-pointer"
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
          showPesan("⚠️ Master turun resolusi ke 3000px (cap aman HP) — file asli tetap di tombol Kembalikan asli.", 6000);
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
    <div className="space-y-4 font-mono text-xs">
      {/* Pratinjau */}
      <div className="rounded-xl overflow-hidden border border-border-subtle bg-black/50 flex items-center justify-center min-h-[180px] max-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={`Pratinjau edit ${decalName}`}
          className="max-h-[300px] w-auto object-contain"
        />
      </div>
      {isPreviewBusy && (
        <p className="text-[10px] text-text-muted -mt-2">Merender pratinjau…</p>
      )}

      {/* Tab */}
      <div className="flex gap-1.5" role="tablist" aria-label="Mode edit gambar">
        {(
          [
            { id: "sesuaikan", label: "🎚 SESUAIKAN" },
            { id: "potong", label: "✂ POTONG & PUTAR" },
            { id: "efek", label: "🎨 EFEK SABLON" },
          ] as Array<{ id: EditorTab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[44px] px-2 py-2 rounded-xl border text-[10px] font-bold transition-all ${
              tab === t.id
                ? "bg-brand-accent text-canvas border-brand-accent"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* F1 — Sesuaikan */}
      {tab === "sesuaikan" && (
        <div className="p-3 rounded-xl bg-surface/60 border border-border-subtle space-y-3">
          <SliderRow label="Kecerahan" value={a.brightness} min={-1} max={1} step={0.01}
            display={Math.round(a.brightness * 100).toString()} onChange={(v) => patchAdjust({ brightness: v })} />
          <SliderRow label="Kontras" value={a.contrast} min={-1} max={1} step={0.01}
            display={Math.round(a.contrast * 100).toString()} onChange={(v) => patchAdjust({ contrast: v })} />
          <SliderRow label="Saturasi" value={a.saturation} min={-1} max={1} step={0.01}
            display={Math.round(a.saturation * 100).toString()} onChange={(v) => patchAdjust({ saturation: v })} />
          <SliderRow label="Vibrance" value={a.vibrance} min={-1} max={1} step={0.01}
            display={Math.round(a.vibrance * 100).toString()} onChange={(v) => patchAdjust({ vibrance: v })} />
          <SliderRow label="Hue" value={a.hue} min={-180} max={180} step={1}
            display={`${Math.round(a.hue)}°`} onChange={(v) => patchAdjust({ hue: v })} />
          <SliderRow label="Gamma" value={a.gamma} min={0.2} max={3} step={0.01}
            display={a.gamma.toFixed(2)} onChange={(v) => patchAdjust({ gamma: v })} />
          <SliderRow label="Blur" value={a.blur} min={0} max={5} step={0.1}
            display={`${a.blur.toFixed(1)}px`} onChange={(v) => patchAdjust({ blur: v })} />
          <SliderRow label="Ketajaman" value={a.sharpen} min={0} max={1} step={0.01}
            display={`${Math.round(a.sharpen * 100)}%`} onChange={(v) => patchAdjust({ sharpen: v })} />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => patchAdjust({ grayscale: !a.grayscale })}
              className={`min-h-[44px] py-2 rounded-xl border text-[11px] font-bold transition-all ${
                a.grayscale ? "bg-text-primary text-canvas border-text-primary" : "bg-surface border-border-subtle text-text-primary"
              }`}
            >
              {a.grayscale ? "✓ GRAYSCALE" : "GRAYSCALE"}
            </button>
            <button
              type="button"
              onClick={() => patchAdjust({ sepia: !a.sepia })}
              className={`min-h-[44px] py-2 rounded-xl border text-[11px] font-bold transition-all ${
                a.sepia ? "bg-text-primary text-canvas border-text-primary" : "bg-surface border-border-subtle text-text-primary"
              }`}
            >
              {a.sepia ? "✓ SEPIA" : "SEPIA"}
            </button>
          </div>
        </div>
      )}

      {/* F2 — Potong & Putar */}
      {tab === "potong" && (
        <div className="p-3 rounded-xl bg-surface/60 border border-border-subtle space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRotate90}
              className="min-h-[44px] py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-[11px] font-bold hover:border-brand-accent transition-all"
            >
              🔄 PUTAR 90°
            </button>
            <button
              type="button"
              onClick={handleFlipX}
              className={`min-h-[44px] py-2 rounded-xl border text-[11px] font-bold transition-all ${
                job.flipX ? "bg-brand-accent/20 border-brand-accent text-brand-accent" : "bg-surface border-border-subtle text-text-primary hover:border-brand-accent"
              }`}
            >
              {job.flipX ? "✓ BALIK HORIZONTAL AKTIF" : "⇋ BALIK HORIZONTAL"}
            </button>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">
            Balik horizontal WAJIB untuk teks di punggung agar terbaca benar dari depan. Putaran
            tersimpan permanen di gambar (bukan sekadar rotasi gizmo 3D).
          </p>
          <SliderRow label="Putar bebas" value={job.rotateDeg} min={-180} max={180} step={1}
            display={`${Math.round(job.rotateDeg)}°`}
            onChange={(v) => commit({ ...job, rotateDeg: v })} />
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase">Bingkai potong (% dari gambar)</span>
              {crop && (
                <button type="button" onClick={handleClearCrop} className="text-[10px] text-brand-accent hover:underline font-bold">
                  HAPUS CROP
                </button>
              )}
            </div>
            {!crop ? (
              <button
                type="button"
                onClick={() => patchCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })}
                className="w-full min-h-[44px] py-2 rounded-xl border border-dashed border-border-strong text-text-muted text-[11px] font-bold hover:border-brand-accent hover:text-text-primary transition-all"
              >
                + MULAI POTONG (80% TENGAH)
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
        <div className="space-y-2">
          {SABLON_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePreset(p.id)}
              className={`w-full min-h-[48px] p-3 rounded-xl border text-left transition-all ${
                job.preset === p.id
                  ? "bg-brand-accent/15 border-brand-accent"
                  : "bg-surface border-border-subtle hover:border-brand-accent/50"
              }`}
            >
              <span className={`block text-[11px] font-bold ${job.preset === p.id ? "text-brand-accent" : "text-text-primary"}`}>
                {job.preset === p.id ? "✓ " : ""}{p.nama.toUpperCase()}
              </span>
              <span className="block text-[10px] text-text-muted mt-0.5">{p.deskripsi}</span>
            </button>
          ))}
          <p className="text-[10px] text-text-muted leading-relaxed">
            Efek dirender ke gambar final sehingga tampil sama di 3D maupun file master produksi.
          </p>
        </div>
      )}

      {pesan && (
        <div className="p-2.5 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-[11px] font-mono">
          {pesan}
        </div>
      )}

      {/* M3.3 — Kembalikan asli (tampil bila original tersimpan) */}
      {hasOriginal && (
        <button
          type="button"
          onClick={handleRestoreOriginal}
          className="w-full min-h-[44px] px-3 rounded-xl bg-surface border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase hover:bg-emerald-500/10 transition-all"
          title="Pulihkan file upload awal (batalkan semua BG/edit)"
        >
          ↩ KEMBALIKAN ASLI (FILE UPLOAD AWAL)
        </button>
      )}

      {/* Aksi: Undo + Reset + Batal + Simpan */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          title={`Urungkan (${history.length}/10)`}
          className="min-h-[48px] px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-[11px] font-bold disabled:opacity-40 hover:border-brand-accent transition-all"
        >
          {history.length}/10
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="min-h-[48px] px-3 rounded-xl bg-surface border border-border-subtle text-text-primary text-[11px] font-bold hover:border-brand-accent transition-all"
        >
          RESET
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[48px] px-3 rounded-xl bg-surface border border-border-subtle text-text-muted text-[11px] font-bold hover:text-text-primary transition-all"
        >
          BATAL
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="flex-[2] min-h-[48px] px-3 rounded-xl bg-brand-accent text-canvas text-xs font-bold uppercase disabled:opacity-50 hover:brightness-110 transition-all"
        >
          {isSaving ? "MENYIMPAN…" : "SIMPAN KE MOCKUP"}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet defaultSnap="full" onClose={onClose}>
        <div className="font-mono text-xs mb-2">
          <span className="text-[10px] text-brand-accent tracking-widest uppercase">{"// EDIT GAMBAR"}</span>
          <h3 className="text-sm font-black uppercase text-text-primary truncate">{decalName}</h3>
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-border-subtle shadow-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono text-brand-accent tracking-widest uppercase">{"// EDIT GAMBAR"}</span>
            <h3 className="text-base font-display font-black uppercase text-text-primary truncate">{decalName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup editor gambar"
            className="min-w-[44px] min-h-[44px] px-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary transition-all font-bold flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};
