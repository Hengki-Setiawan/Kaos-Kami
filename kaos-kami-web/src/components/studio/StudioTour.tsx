"use client";

/**
 * M4.3 + pola eksklusif Sep 2026 — TUR 3 LANGKAH studio: Unggah → Atur → Order/Unduh.
 * Stepper PERSISTEN non-blocking: kartu penuh bisa diciutkan, bilah mini
 * 1·2·3 selalu ada di bawah (klik angka = lompat ke langkah itu).
 * Langkah 2 membawa tombol Paskan (Fit) & Penuhi (Fill) ASLI yang bekerja
 * pada decal aktif via SSOT skala cm (fitScaleToSideBox / maxDecalScaleUnits)
 * + jalan pintas Detail Makro kerah (cameraPreset collar).
 * Snapping guidelines magnetis SENGAJA tak di sini (follow-up, lihat laporan).
 */

import React, { useCallback, useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft, Maximize2, Expand, ZoomIn } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  fitScaleToSideBox,
  maxDecalScaleUnits,
} from "@/lib/scaleCalibration";

const LS_KEY = "kaoskami_studio_tour_v1";
const STEP_KEY = "kaoskami_studio_step_v1";
export const STUDIO_TOUR_OPEN_EVENT = "kaoskami:open-tour";

const STEPS = [
  {
    judul: "1 · UNGGAH DESAIN",
    isi: "Buka tab SABLON → unggah gambar (otomatis cek ketajaman & hapus latar) atau tulis teks. Tunggu tanda hijau “Siap cetak” sebelum lanjut.",
  },
  {
    judul: "2 · ATUR POSISI & UKURAN",
    isi: "Seret gambarnya langsung di kaos 3D. Atau pakai tombol cepat di bawah untuk sablon yang sedang dipilih — dihitung dari batas cetak asli tiap sisi.",
  },
  {
    judul: "3 · ORDER / UNDUH",
    isi: "Puas? Buka tab EXPORT untuk unduh PNG / bagikan mockup, atau SIMPAN desain lalu checkout — task produksi dibuat otomatis per sablon.",
  },
] as const;

export const StudioTour: React.FC = () => {
  const { activeDecal, activeApparel, updateDecal, setCameraPreset } = useConfiguratorStore(
    useShallow((s) => ({
      activeDecal: s.decals.find((d) => d.id === s.selectedDecalId) ?? s.decals[0] ?? null,
      activeApparel: s.activeApparel,
      updateDecal: s.updateDecal,
      setCameraPreset: s.setCameraPreset,
    }))
  );
  const [terbuka, setTerbuka] = useState(false);
  const [langkah, setLangkah] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);

  // Langkah terakhir diingat di HP ini (buka-tutup tak mengulang dari awal).
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(STEP_KEY);
      const n = s ? parseInt(s, 10) : NaN;
      if (Number.isFinite(n) && (n as number) >= 0 && (n as number) <= 2) setLangkah(n as number);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STEP_KEY, String(langkah));
    } catch {}
  }, [langkah]);

  useEffect(() => {
    let alive = true;
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(LS_KEY)) {
        const t = setTimeout(() => {
          if (alive) setTerbuka(true);
        }, 1200);
        const onOpen = () => {
          setLangkah(0);
          setTerbuka(true);
        };
        window.addEventListener(STUDIO_TOUR_OPEN_EVENT, onOpen);
        return () => {
          alive = false;
          clearTimeout(t);
          window.removeEventListener(STUDIO_TOUR_OPEN_EVENT, onOpen);
        };
      }
    } catch {}
    const onOpen = () => {
      setLangkah(0);
      setTerbuka(true);
    };
    window.addEventListener(STUDIO_TOUR_OPEN_EVENT, onOpen);
    return () => {
      alive = false;
      window.removeEventListener(STUDIO_TOUR_OPEN_EVENT, onOpen);
    };
  }, []);

  const tutup = useCallback((ingat: boolean) => {
    setTerbuka(false);
    if (ingat) {
      try {
        window.localStorage.setItem(LS_KEY, "done");
      } catch {}
    }
  }, []);

  const terapkanSkala = useCallback(
    (mode: "fit" | "fill") => {
      setPesan(null);
      if (!activeDecal) {
        setPesan("Belum ada sablon — unggah dulu di tab SABLON (langkah 1).");
        return;
      }
      const aspek =
        activeDecal.printPx && activeDecal.printPx.h > 0
          ? activeDecal.printPx.w / activeDecal.printPx.h
          : 1;
      const maks = maxDecalScaleUnits(activeApparel, activeDecal.targetSide);
      const baru =
        mode === "fit"
          ? activeDecal.scale * fitScaleToSideBox(activeApparel, activeDecal.targetSide, activeDecal.scale, aspek)
          : maks;
      const jepit = Math.max(0.04, Math.min(maks, baru));
      updateDecal(activeDecal.id, { scale: jepit });
      setPesan(
        mode === "fit"
          ? `Dipaskan: skala ${jepit.toFixed(3)} (muat penuh tanpa kepotong).`
          : `Dipenuhi: skala ${jepit.toFixed(3)} (mentok batas cetak sisi).`
      );
    },
    [activeDecal, activeApparel, updateDecal]
  );

  // Jalan pintas Detail Makro kerah — logika sama seperti tombol KERAH header.
  const lihatMakroKerah = useCallback(() => {
    try {
      setCameraPreset("collar");
    } catch {}
    setPesan("Kamera didekatkan ke kerah — cek jahitannya, lalu lanjut atur sablonmu.");
  }, [setCameraPreset]);

  // Stepper PERSISTEN non-blocking: kartu tutup → bilah mini 1·2·3 tetap ada.
  if (!terbuka) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto">
        <div
          className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-canvas/90 border border-border-subtle backdrop-blur-xl shadow-xl"
          role="navigation"
          aria-label="Langkah studio (bilah mini)"
        >
          <span className="text-[10px] font-mono font-black text-text-muted uppercase">LANGKAH {langkah + 1}/3</span>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setPesan(null);
                setLangkah(i);
                setTerbuka(true);
              }}
              aria-label={`Buka ${s.judul.toLowerCase()}`}
              className={`w-7 h-7 rounded-full text-[11px] font-mono font-black transition-all ${
                i === langkah
                  ? "bg-brand-accent text-canvas shadow-[0_0_10px_rgba(230,81,0,0.4)]"
                  : i < langkah
                    ? "bg-brand-accent/25 text-brand-accent"
                    : "bg-surface text-text-muted hover:text-text-primary"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setTerbuka(true)}
            className="px-3 py-1.5 rounded-full bg-brand-accent text-canvas text-[10px] font-mono font-black uppercase"
          >
            PANDUAN
          </button>
        </div>
      </div>
    );
  }
  const step = STEPS[langkah]!;

  return (
    <div
      role="dialog"
      aria-label="Panduan studio 3 langkah"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md p-4 rounded-2xl bg-surface/95 border border-brand-accent/40 shadow-[0_0_30px_rgba(230,81,0,0.35)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-mono font-black text-brand-accent uppercase">{step.judul}</p>
        <button
          onClick={() => tutup(true)}
          aria-label="Ciutkan panduan (bilah mini tetap ada di bawah)"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-xs font-mono text-text-primary leading-relaxed">{step.isi}</p>

      {langkah === 1 && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => terapkanSkala("fit")}
              className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-[11px] font-mono font-bold text-text-primary transition-all flex items-center justify-center gap-1.5"
            >
              <Maximize2 size={13} className="text-brand-accent" /> PASKAN (FIT)
            </button>
            <button
              onClick={() => terapkanSkala("fill")}
              className="py-2.5 px-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-[11px] font-mono font-bold text-text-primary transition-all flex items-center justify-center gap-1.5"
            >
              <Expand size={13} className="text-brand-accent" /> PENUHI (FILL)
            </button>
          </div>
          {/* Macro callout: cek jahitan kerah dari dekat sebelum mengunci ukuran. */}
          <button
            onClick={lihatMakroKerah}
            title="Kamera zoom ke kerah — cek jahitan rib dari dekat"
            className="w-full py-2.5 px-2 rounded-xl bg-brand-accent/15 border border-brand-accent/40 hover:bg-brand-accent/25 text-[11px] font-mono font-bold text-brand-accent transition-all flex items-center justify-center gap-1.5"
          >
            <ZoomIn size={13} />
            <span>LIHAT DETAIL KERAH (MAKRO)</span>
          </button>
        </div>
      )}
      {pesan && (
        <p className="mt-2 text-[11px] font-mono text-emerald-300" role="status">{pesan}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === langkah ? "w-6 bg-brand-accent" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {langkah > 0 && (
            <button
              onClick={() => {
                setPesan(null);
                setLangkah((l) => Math.max(0, l - 1));
              }}
              className="p-2 rounded-lg bg-surface border border-border-subtle text-text-muted hover:text-text-primary"
              aria-label="Langkah sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {langkah < STEPS.length - 1 ? (
            <button
              onClick={() => {
                setPesan(null);
                setLangkah((l) => Math.min(STEPS.length - 1, l + 1));
              }}
              className="px-4 py-2 rounded-lg bg-brand-accent text-canvas text-[11px] font-mono font-black uppercase flex items-center gap-1"
            >
              Lanjut <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={() => tutup(true)}
              className="px-4 py-2 rounded-lg bg-brand-accent text-canvas text-[11px] font-mono font-black uppercase"
            >
              Mengerti!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Dipakai tombol "?" header studio untuk membuka ulang tur. */
export function openStudioTour() {
  try {
    window.dispatchEvent(new CustomEvent(STUDIO_TOUR_OPEN_EVENT));
  } catch {}
}
