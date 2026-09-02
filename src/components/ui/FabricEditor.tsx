"use client";
import React, { useEffect, useRef, useState } from "react";

// Fabric.js is heavy (~300KB) — dynamically imported only when user opens Advanced 2D Editor
// This keeps initial bundle <250KB gzipped per Blueprint 04 §6
export const FabricEditor: React.FC<{ onExport?: (dataUrl: string) => void }> = ({ onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

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
      onExport(dataUrl);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-xl bg-surface border border-white/10">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono font-bold text-brand-accent">FABRIC.JS 2D EDITOR (VIHAN — lazy)</span>
        <button onClick={handleExport} disabled={!isReady} className="px-2 py-1 rounded bg-brand-accent text-canvas text-xs font-bold disabled:opacity-40">
          EXPORT → DECAL
        </button>
      </div>
      <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0E0E10]">
        <canvas ref={canvasRef} width={450} height={500} />
      </div>
      {!isReady && <p className="text-[11px] font-mono text-text-muted">Memuat Fabric 7.4.0… (≈300KB, code-split, tidak blokir 3D)</p>}
      <p className="text-[10px] font-mono text-text-muted">Riset 2026: Fabric untuk design editor (Canva-like), Konva untuk UI, PixiJS untuk game. Dipilih Fabric karena butuh object model SVG & inline text editing — tapi di-split agar tidak melanggar 3MB worker.</p>
    </div>
  );
};
