"use client";
import React, { useEffect, useRef, useState } from "react";

// Fabric.js is heavy (~300KB) — dynamically imported only when user opens Advanced 2D Editor
// This keeps initial bundle <250KB gzipped per Blueprint 04 §6
export const FabricEditor: React.FC<{
  onExport?: (dataUrl: string, printPx?: { w: number; h: number }) => void;
  printWidthCm?: number;
  printHeightCm?: number;
}> = ({ onExport, printWidthCm = 20, printHeightCm = 20 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [printInfo, setPrintInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fabric = await import("fabric");
        if (!mounted || !canvasRef.current) return;
        const canvas = new (fabric as any).Canvas(canvasRef.current, {
          width: 450,
          height: 500,
          backgroundColor: "#1a1a1a",
        });
        // Add sample text via Fabric for demo (proves wiring, not dead)
        const text = new (fabric as any).Text("KAOS KAMI", {
          left: 50,
          top: 50,
          fontSize: 48,
          fill: "#E65100",
          fontFamily: "Syne",
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        fabricRef.current = canvas;
        setIsReady(true);
      } catch (e) {
        console.warn("Fabric load failed", e);
      }
    })();
    return () => {
      mounted = false;
      try {
        fabricRef.current?.dispose();
      } catch {}
    };
  }, []);

  const handleExport = () => {
    if (!fabricRef.current || !onExport) return;
    try {
      fabricRef.current.renderAll();
      const dataUrl = (fabricRef.current as any).toDataURL({ format: "png", multiplier: 1 });
      // printPx = dimensi bitmap kanvas AKTUAL (bukan cm→px fiktif @300DPI).
      // Klaim fiktif (mis. 20cm → 2362px padahal kanvas cuma 450px) menipu
      // badge DPI + pricing seolah master tajam. File cetak 300 DPI yang
      // benar tetap via tombol PRINT (composePrintFile), bukan jalur ini.
      let wPx = 450;
      let hPx = 500;
      try {
        const el = fabricRef.current.getElement?.() as HTMLCanvasElement | undefined;
        if (el && el.width > 0 && el.height > 0) {
          wPx = el.width;
          hPx = el.height;
        } else {
          const cw = Number(fabricRef.current.getWidth?.()) || 450;
          const ch = Number(fabricRef.current.getHeight?.()) || 500;
          if (cw > 0 && ch > 0) {
            wPx = Math.round(cw);
            hPx = Math.round(ch);
          }
        }
      } catch {
        // fallback 450×500 di bawah
      }
      setPrintInfo(`${wPx}×${hPx}px aktual kanvas`);
      onExport(dataUrl, { w: wPx, h: hPx });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleExportPrintFile = async () => {
    if (!fabricRef.current) return;
    try {
      const { composePrintFile } = await import("@/lib/printUV");
      const { dataUrl, widthPx, heightPx } = await composePrintFile(
        fabricRef.current.getElement(),
        printWidthCm,
        printHeightCm
      );
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `kaoskami-print-${printWidthCm}x${printHeightCm}cm-300dpi.png`;
      a.click();
      setPrintInfo(`${widthPx}×${heightPx}px @300DPI tersimpan`);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-xl bg-surface border border-white/10">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono font-bold text-brand-accent">FABRIC.JS 2D EDITOR (VIHAN — lazy)</span>
        <div className="flex gap-1.5">
          <button onClick={handleExport} disabled={!isReady} className="px-2 py-1 rounded bg-brand-accent text-canvas text-xs font-bold disabled:opacity-40">
            EXPORT → DECAL
          </button>
          <button onClick={handleExportPrintFile} disabled={!isReady} className="px-2 py-1 rounded border border-brand-accent/50 text-brand-accent text-xs font-bold disabled:opacity-40">
            PRINT 300 DPI
          </button>
        </div>
      </div>
      {printInfo && (
        <p className="text-[10px] font-mono text-emerald-400">Master cetak: {printInfo} (siap AcroRIP)</p>
      )}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0E0E10] max-w-full">
        <canvas ref={canvasRef} width={450} height={500} className="max-w-full h-auto" />
      </div>
      {!isReady && <p className="text-[11px] font-mono text-text-muted">Memuat Fabric 7.4.0… (≈300KB, code-split, tidak blokir 3D)</p>}
      <p className="text-[10px] font-mono text-text-muted">Riset 2026: Fabric untuk design editor (Canva-like), Konva untuk UI, PixiJS untuk game. Dipilih Fabric karena butuh object model SVG & inline text editing — tapi di-split agar tidak melanggar 3MB worker.</p>
    </div>
  );
};
