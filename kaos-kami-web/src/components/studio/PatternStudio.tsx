"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import type { ApparelType, DecalLayer } from "@/lib/constants";
import {
  EDITOR_PX_PER_CM,
  getPanelGeometry,
  PX_PER_CM_300DPI,
  type PatternPanel,
} from "@/lib/patternGeometry";
import { getPatternSilhouette } from "@/lib/patternSilhouette";
import { decalToFabric, fabricToDecal } from "@/lib/patternSync";
import { uploadBase64ToR2 } from "@/lib/r2";

const PANELS: Array<{ id: PatternPanel; label: string }> = [
  { id: "front", label: "Depan" },
  { id: "back", label: "Belakang" },
  { id: "left_sleeve", label: "Lengan Kiri" },
  { id: "right_sleeve", label: "Lengan Kanan" },
];

function silhouetteDataUrl(apparel: ApparelType, panel: PatternPanel): string {
  const g = getPanelGeometry(apparel, panel);
  const s = getPatternSilhouette(apparel, panel);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox}" width="${g.wCm * EDITOR_PX_PER_CM}" height="${g.hCm * EDITOR_PX_PER_CM}">` +
    `<path d="${s.body}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" stroke-width="0.35"/>` +
    s.details.map((d) => `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.3"/>`).join("") +
    s.stitches.map((d) => `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.25" stroke-dasharray="1.2 1"/>`).join("") +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Ukuran alami gambar (untuk rasio aspek). */
function naturalSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = url;
  });
}

/**
 * POLA 2D — editor datar skala-cm per panel (depan/belakang/lengan).
 * Satu data dengan 3D: setiap objek di sini = satu DecalLayer di store
 * (geser di 2D → 3D ikut live, dan sebaliknya via refresh).
 */
export const PatternStudio: React.FC = () => {
  const {
    activeApparel,
    decals,
    addDecal,
    updateDecal,
    removeDecal,
    selectedDecalId,
    setSelectedDecalId,
  } = useConfiguratorStore();
  const [panel, setPanel] = useState<PatternPanel>("front");
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const syncingRef = useRef(false);
  const decalsRef = useRef(decals);
  decalsRef.current = decals;

  const geo = getPanelGeometry(activeApparel, panel);
  const canvasW = Math.round(geo.wCm * EDITOR_PX_PER_CM);
  const canvasH = Math.round(geo.hCm * EDITOR_PX_PER_CM);

  // Bangun ulang kanvas saat apparel/panel berubah.
  useEffect(() => {
    let mounted = true;
    let canvas: any = null;
    (async () => {
      try {
        const fabric = await import("fabric");
        if (!mounted || !canvasRef.current) return;
        if (fabricRef.current) {
          try { fabricRef.current.dispose(); } catch {}
          fabricRef.current = null;
        }
        canvas = new (fabric as any).Canvas(canvasRef.current, {
          width: canvasW,
          height: canvasH,
          backgroundColor: "#141416",
          preserveObjectStacking: true,
        });
        fabricRef.current = canvas;

        // Latar siluet pola + bingkai batas sablon (tak bisa dipilih).
        const bgUrl = silhouetteDataUrl(activeApparel, panel);
        const bgImg = await (fabric as any).FabricImage.fromURL(bgUrl);
        bgImg.set({ selectable: false, evented: false, excludeFromExport: false });
        canvas.backgroundImage = bgImg;

        const printW = geo.printWcm * EDITOR_PX_PER_CM;
        const printH = geo.printHcm * EDITOR_PX_PER_CM;
        const bounds = new (fabric as any).Rect({
          left: canvasW / 2,
          top: canvasH / 2,
          width: printW,
          height: printH,
          originX: "center",
          originY: "center",
          fill: "rgba(16,185,129,0.04)",
          stroke: "rgba(16,185,129,0.7)",
          strokeWidth: 1,
          strokeDashArray: [5, 4],
          selectable: false,
          evented: false,
          name: "__printBounds",
        });
        canvas.add(bounds);
        const label = new (fabric as any).Text(
          `${geo.printWcm}×${geo.printHcm}cm`,
          { left: canvasW / 2, top: canvasH / 2 - printH / 2 - 10, fontSize: 10, fill: "#10b981", originX: "center", originY: "center", selectable: false, evented: false, name: "__printLabel" }
        );
        canvas.add(label);

        // Muat decal sisi ini dari store.
        const sideDecals = decalsRef.current.filter((d) => (d.targetSide as string) === panel);
        for (const d of sideDecals) {
          try {
            const nat = await naturalSize(d.url);
            const p = decalToFabric(activeApparel, d, nat.w / nat.h);
            const img = await (fabric as any).FabricImage.fromURL(d.url);
            img.set({
              left: canvasW / 2 + p.cxPx,
              top: canvasH / 2 + p.cyPx,
              originX: "center",
              originY: "center",
              angle: p.rotation,
              opacity: p.opacity,
            });
            img.scaleToWidth(p.wPx);
            (img as any).decalId = d.id;
            canvas.add(img);
          } catch {}
        }

        const pushToStore = (obj: any) => {
          const id = (obj as any).decalId as string | undefined;
          if (!id || syncingRef.current) return;
          const target = decalsRef.current.find((x) => x.id === id);
          if (!target) return;
          const cxPx = (obj.left ?? 0) - canvasW / 2;
          const cyPx = (obj.top ?? 0) - canvasH / 2;
          const wPx = (obj.getScaledWidth?.() ?? 10);
          const hPx = (obj.getScaledHeight?.() ?? 10);
          const patch = fabricToDecal(activeApparel, cxPx, cyPx, wPx, hPx, obj.angle ?? 0);
          // Jepit ke batas wajar store (x/y ±0.35).
          patch.x = Math.max(-0.35, Math.min(0.35, patch.x));
          patch.y = Math.max(-0.35, Math.min(0.35, patch.y));
          updateDecal(id, patch);
        };
        canvas.on("object:moving", (e: any) => e.target && pushToStore(e.target));
        canvas.on("object:scaling", (e: any) => e.target && pushToStore(e.target));
        canvas.on("object:rotating", (e: any) => e.target && pushToStore(e.target));
        canvas.on("object:modified", (e: any) => e.target && pushToStore(e.target));
        canvas.on("selection:created", (e: any) => {
          const id = (e.selected?.[0] as any)?.decalId;
          if (id) setSelectedDecalId(id);
        });
        canvas.on("selection:cleared", () => {});
        canvas.renderAll();
      } catch (e: any) {
        setStatus(`Kanvas 2D gagal dimuat: ${e?.message || e}`);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApparel, panel]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  const handleUpload = useCallback(async (file: File) => {
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const nat = await naturalSize(dataUrl);
      // Buat di store dulu (3D ikut muncul), lalu pasang di kanvas.
      const id = addDecal({
        url: dataUrl,
        name: file.name.slice(0, 24) || "Upload 2D",
        targetSide: panel as DecalLayer["targetSide"],
        x: 0, y: 0.02, scale: 0.12, rotation: 0, opacity: 1,
      });
      const canvas = fabricRef.current;
      if (canvas) {
        const fabric = await import("fabric");
        const p = decalToFabric(activeApparel, { id, url: dataUrl, name: "", targetSide: panel as any, x: 0, y: 0.02, scale: 0.12, rotation: 0, opacity: 1 }, nat.w / nat.h);
        const img = await (fabric as any).FabricImage.fromURL(dataUrl);
        img.set({ left: canvasW / 2 + p.cxPx, top: canvasH / 2 + p.cyPx, originX: "center", originY: "center" });
        img.scaleToWidth(p.wPx);
        (img as any).decalId = id;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      flash("Gambar masuk pola + 3D.");
    } catch (e: any) {
      flash(`Upload gagal: ${e?.message || e}`);
    }
  }, [activeApparel, addDecal, canvasH, canvasW, panel]);

  const handleAddText = useCallback(async () => {
    const text = textInput.trim();
    if (!text) return;
    try {
      const fabric = await import("fabric");
      const canvas = fabricRef.current;
      // Raster teks jadi PNG agar 3D + produksi konsisten.
      const tmp = new (fabric as any).StaticCanvas(null, { width: 1024, height: 256 });
      const t = new (fabric as any).Textbox(text, {
        left: 512, top: 128, originX: "center", originY: "center",
        fontSize: 120, fill: "#ffffff", fontFamily: "Arial", textAlign: "center",
      });
      tmp.add(t);
      tmp.renderAll();
      const dataUrl = tmp.toDataURL({ format: "png" });
      tmp.dispose();
      setTextInput("");
      const draft = {
        url: dataUrl, name: text.slice(0, 24) || "Teks",
        targetSide: panel as DecalLayer["targetSide"],
        x: 0, y: 0.05, scale: 0.14, rotation: 0, opacity: 1,
      };
      const id = addDecal(draft);
      if (canvas) {
        // Teks raster 1024×256 → aspek 4.
        const p = decalToFabric(activeApparel, { id, ...draft }, 4);
        const img = await (fabric as any).FabricImage.fromURL(dataUrl);
        img.set({ left: canvasW / 2 + p.cxPx, top: canvasH / 2 + p.cyPx, originX: "center", originY: "center" });
        img.scaleToWidth(p.wPx);
        (img as any).decalId = id;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }
      flash("Teks masuk pola + 3D.");
    } catch (e: any) {
      flash(`Teks gagal: ${e?.message || e}`);
    }
  }, [activeApparel, addDecal, canvasH, canvasW, panel, textInput]);

  const handleDeleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject?.();
    const id = obj?.decalId as string | undefined;
    if (!id) { flash("Pilih dulu gambar/teks di pola."); return; }
    canvas.remove(obj);
    canvas.renderAll();
    removeDecal(id);
    flash("Dihapus dari pola + 3D.");
  }, [removeDecal]);

  /** Ekspor bbox artwork panel ini @300 DPI → R2. Kembalikan URL master. */
  const exportPanelMaster = useCallback(async (): Promise<string | null> => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    setExporting(true);
    try {
      const objs = canvas.getObjects().filter((o: any) => o.decalId);
      if (objs.length === 0) { flash("Panel ini kosong — tambah desain dulu."); return null; }
      // BBox gabungan (px editor) + bleed 1cm.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const o of objs) {
        const r = o.getBoundingRect(true, true);
        minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.left + r.width); maxY = Math.max(maxY, r.top + r.height);
      }
      const bleed = EDITOR_PX_PER_CM; // 1cm
      minX = Math.max(0, minX - bleed); minY = Math.max(0, minY - bleed);
      maxX = Math.min(canvasW, maxX + bleed); maxY = Math.min(canvasH, maxY + bleed);
      const wPx = Math.max(10, maxX - minX), hPx = Math.max(10, maxY - minY);
      // Faktor ke 300 DPI dari skala editor (px/cm).
      const k = PX_PER_CM_300DPI / EDITOR_PX_PER_CM;
      const fabric = await import("fabric");
      const off = new (fabric as any).StaticCanvas(null, {
        width: Math.round(wPx * k), height: Math.round(hPx * k),
        backgroundColor: "rgba(0,0,0,0)",
      });
      // Salin objek terpotong bbox dengan skala k.
      const cloneObjs: any[] = [];
      for (const o of objs) {
        const c: any = await new Promise((res) => o.clone(res, ["decalId"]));
        c.set({ left: (o.left - minX) * k, top: (o.top - minY) * k });
        c.scaleX = (o.scaleX || 1) * k;
        c.scaleY = (o.scaleY || 1) * k;
        cloneObjs.push(c);
      }
      for (const c of cloneObjs) off.add(c);
      off.renderAll();
      const dataUrl = off.toDataURL({ format: "png" });
      off.dispose();
      const wCm = Math.round((wPx / EDITOR_PX_PER_CM) * 10) / 10;
      const hCm = Math.round((hPx / EDITOR_PX_PER_CM) * 10) / 10;
      const up = await uploadBase64ToR2(dataUrl, `masters/${activeApparel}-${panel}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`);
      if (!up.success) { flash(`Ekspor gagal upload: ${up.error || ""}`); return null; }
      flash(`Master ${wCm}×${hCm}cm @300DPI tersimpan.`);
      return up.url;
    } catch (e: any) {
      flash(`Ekspor gagal: ${e?.message || e}`);
      return null;
    } finally {
      setExporting(false);
    }
  }, [activeApparel, canvasH, canvasW, panel]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
          Pola 2D skala cm — sinkron live ke 3D
        </p>
        <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
          {geo.wCm}×{geo.hCm}cm
        </span>
      </div>

      {/* Tab panel */}
      <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Panel pola">
        {PANELS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={panel === p.id}
            onClick={() => setPanel(p.id)}
            className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wide transition-all ${
              panel === p.id
                ? "bg-brand-accent text-canvas"
                : "bg-surface border border-white/10 text-text-muted hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Kanvas pola */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-[#141416] flex justify-center p-2">
        <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto", touchAction: "none" }} />
      </div>
      <p className="font-mono text-[10px] text-text-muted">
        Kotak hijau = batas sablon {geo.printWcm}×{geo.printHcm}cm. Geser/zoom karya di dalam kanvas — mockup 3D ikut bergerak.
      </p>

      {/* Toolbar */}
      <div className="grid grid-cols-2 gap-2">
        <label className="py-2.5 px-2 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-[11px] font-mono font-bold text-center cursor-pointer transition-all">
          ⬆ UPLOAD GAMBAR
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={handleDeleteSelected}
          className="py-2.5 px-2 rounded-xl bg-surface border border-white/10 hover:border-rose-500 text-[11px] font-mono font-bold transition-all"
        >
          🗑 HAPUS PILIHAN
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Tulis teks sablon…"
          maxLength={40}
          className="flex-1 px-3 py-2.5 rounded-xl bg-surface border border-white/10 text-white text-xs placeholder:text-text-muted"
        />
        <button
          onClick={() => void handleAddText()}
          className="px-4 rounded-xl bg-brand-accent text-canvas font-bold text-xs"
        >
          + TEKS
        </button>
      </div>

      {/* Ekspor master produksi */}
      <button
        onClick={() => void exportPanelMaster().then((url) => {
          if (url) {
            try {
              const raw = localStorage.getItem("kaoskami_master_assets") || "{}";
              const all = JSON.parse(raw);
              all[`${activeApparel}:${panel}`] = { url, at: new Date().toISOString() };
              localStorage.setItem("kaoskami_master_assets", JSON.stringify(all));
            } catch {}
          }
        })}
        disabled={exporting}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-display font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all"
      >
        {exporting ? "MENGEKSPOR 300 DPI…" : "💾 SIMPAN MASTER 300 DPI (PRODUKSI)"}
      </button>

      {status && (
        <p className="font-mono text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
          {status}
        </p>
      )}
      {selectedDecalId && (
        <p className="font-mono text-[10px] text-text-muted">
          Terpilih: {decals.find((d) => d.id === selectedDecalId)?.name || selectedDecalId.slice(0, 8)} (klik karya di kanvas untuk pilih)
        </p>
      )}
    </div>
  );
};
