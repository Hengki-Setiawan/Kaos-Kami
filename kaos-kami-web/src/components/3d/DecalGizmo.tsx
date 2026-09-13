"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_PHYSICAL_SPECS, maxDecalScaleUnits, REAL_WORLD_PRINT_LIMITS, surfaceZForApparel, DECAL_MOVE_LIMITS, clampDecalXY, computePhysicalPrintDimensions } from "@/lib/scaleCalibration";
import { Move, ZoomIn, RotateCw } from "lucide-react";

interface DecalGizmoProps {
  surfaceZ?: number;
}

/**
 * Toleransi snap magnetis (unit 3D): |x|≤0,01 → x=0 (tengah horizontal),
 * |y|≤0,01 → y=0 (tengah vertikal = pusat koordinat, bukan default -0,05).
 * Rumus cm tak diubah — snap hanya menggeser INPUT x/y ≤0,01 unit
 * (≈≤1cm tergantung multiplier apparel).
 */
const SNAP_TOL = 0.01;

export const DecalGizmo: React.FC<DecalGizmoProps> = ({ surfaceZ }) => {
  const {
    viewMode,
    isHideWebsiteUI,
    decals,
    selectedDecalId,
    isGizmoVisible,
    toggleGizmoVisible,
    updateDecal,
    setGizmoDragging,
    activeApparel,
  } = useConfiguratorStore(
    useShallow((s) => ({
      viewMode: s.viewMode,
      isHideWebsiteUI: s.isHideWebsiteUI,
      decals: s.decals,
      selectedDecalId: s.selectedDecalId,
      isGizmoVisible: s.isGizmoVisible,
      toggleGizmoVisible: s.toggleGizmoVisible,
      updateDecal: s.updateDecal,
      setGizmoDragging: s.setGizmoDragging,
      activeApparel: s.activeApparel,
    }))
  );
  const { size, camera } = useThree();

  const [activeGizmoTool, setActiveGizmoTool] = useState<"move" | "scale" | "rotate" | null>(null);
  // Sumbu yang sedang snap (untuk garis panduan tipis). Dibersihkan saat lepas.
  const [snapAxis, setSnapAxis] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? decals[0];

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
    initialRotation: number;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialScale: 1,
    initialRotation: 0,
  });

  // Two-finger pinch tracking (native PointerEvents, no Hammer.js — blueprint §2)
  const pinchRef = useRef<{ initialDist: number; initialScale: number; initialAngle: number; initialRot: number } | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  // PERF #8: coalesce updateDecal per frame — pointermove bisa 60–120Hz; tiap
  // event = 1 commit zustand + re-render React + re-render 3D (jank saat drag).
  // Patch digabung (merge) lalu flush SEKALI via rAF; pointer-up flush sinkron
  // agar posisi akhir pasti ke-commit sebelum drag state dibersihkan.
  const pendingDecalPatchRef = useRef<{ id: string; patch: { x?: number; y?: number; scale?: number; rotation?: number } } | null>(null);
  const decalRafRef = useRef<number>(0);
  const queueDecalUpdate = (id: string, patch: { x?: number; y?: number; scale?: number; rotation?: number }) => {
    const prev = pendingDecalPatchRef.current;
    pendingDecalPatchRef.current =
      prev && prev.id === id ? { id, patch: { ...prev.patch, ...patch } } : { id, patch };
    if (decalRafRef.current) return;
    decalRafRef.current = requestAnimationFrame(() => {
      decalRafRef.current = 0;
      const pending = pendingDecalPatchRef.current;
      pendingDecalPatchRef.current = null;
      if (pending) {
        try {
          updateDecal(pending.id, pending.patch);
        } catch {}
      }
    });
  };
  const flushDecalUpdate = () => {
    try {
      if (decalRafRef.current) cancelAnimationFrame(decalRafRef.current);
    } catch {}
    decalRafRef.current = 0;
    const pending = pendingDecalPatchRef.current;
    pendingDecalPatchRef.current = null;
    if (pending) {
      try {
        updateDecal(pending.id, pending.patch);
      } catch {}
    }
  };
  useEffect(() => {
    return () => {
      try {
        if (decalRafRef.current) cancelAnimationFrame(decalRafRef.current);
      } catch {}
      decalRafRef.current = 0;
      pendingDecalPatchRef.current = null;
    };
  }, []);
  const maxScaleUnits = () =>
    maxDecalScaleUnits(activeApparel, activeDecal?.targetSide ?? "front");

  const getTouchDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const getTouchAngle = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;

  const onPointerDown = (tool: "move" | "scale" | "rotate", e: React.PointerEvent) => {
    e.stopPropagation();
    if (!activeDecal) return;    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // If two pointers on gizmo, start pinch
    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      if (pts.length === 2 && pts[0] && pts[1]) {
        pinchRef.current = {
          initialDist: getTouchDistance(pts[0], pts[1]),
          initialScale: activeDecal.scale,
          initialAngle: getTouchAngle(pts[0], pts[1]),
          initialRot: activeDecal.rotation,
        };
        setActiveGizmoTool("scale");
        setGizmoDragging(true);
        return;
      }
    }

    setActiveGizmoTool(tool);
    setGizmoDragging(true);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: activeDecal.x,
      initialY: activeDecal.y,
      initialScale: activeDecal.scale,
      initialRotation: activeDecal.rotation,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeDecal) return;
    e.stopPropagation();

    // Update pointer position
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch handling
    if (activePointers.current.size === 2 && pinchRef.current) {
      const pts = Array.from(activePointers.current.values());
      if (pts.length === 2 && pts[0] && pts[1]) {
        const curDist = getTouchDistance(pts[0], pts[1]);
        const curAngle = getTouchAngle(pts[0], pts[1]);
        const scaleFactor = curDist / Math.max(1, pinchRef.current.initialDist);
        const nextScale = Math.max(REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits, Math.min(maxScaleUnits(), pinchRef.current.initialScale * scaleFactor));
        const angleDelta = curAngle - pinchRef.current.initialAngle;
        const nextRot = Math.round(((pinchRef.current.initialRot + angleDelta + 180) % 360) - 180);
        queueDecalUpdate(activeDecal.id, { scale: nextScale, rotation: nextRot });
        return;
      }
    }

    if (!activeGizmoTool) return;

    // Drag akurat-cm (audit #4): konversi piksel → unit dunia via kamera
    // (bukan fraksi viewport mentah yang beda arti tiap zoom).
    const cam = camera as any;
    const dist = cam?.position ? Math.hypot(cam.position.x, cam.position.y, cam.position.z) : 2.9;
    const fov = ((cam?.fov ?? 40) * Math.PI) / 180;
    const worldPerPixel = (2 * dist * Math.tan(fov / 2)) / Math.max(1, size.height);
    const dx = (e.clientX - dragRef.current.startX) * worldPerPixel;
    const dy = (e.clientY - dragRef.current.startY) * worldPerPixel;

    if (activeGizmoTool === "move") {
      // Jepit SSOT per sisi (audit #4 — dulu TIGA angka beda: gizmo ±0.25,
      // guide 0.08, store ±0.35). clampDecalXY = DECAL_MOVE_LIMITS di
      // scaleCalibration.ts; renderer memakai angka yang SAMA untuk jangkar
      // tampil agar gizmo tak pernah lepas dari gambar sablon.
      const jepit = clampDecalXY(
        activeDecal.targetSide,
        dragRef.current.initialX + dx,
        dragRef.current.initialY - dy
      );
      // Snap magnetis: X≈0 → 0, Y tengah (≈0) → 0 bila dalam ±0,01.
      // Garis panduan tipis tampil via snapAxis selama snap aktif.
      const snappedX = Math.abs(jepit.x) <= SNAP_TOL;
      const snappedY = Math.abs(jepit.y) <= SNAP_TOL;
      setSnapAxis({ x: snappedX, y: snappedY });
      queueDecalUpdate(activeDecal.id, {
        x: snappedX ? 0 : jepit.x,
        y: snappedY ? 0 : jepit.y,
      });
    } else if (activeGizmoTool === "scale") {
      const deltaScale = 1 + dx * 1.5;
      const nextScale = Math.max(REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits, Math.min(maxScaleUnits(), dragRef.current.initialScale * deltaScale));
      queueDecalUpdate(activeDecal.id, { scale: nextScale });
    } else if (activeGizmoTool === "rotate") {
      const deltaDeg = dx * 180;
      const nextRot = Math.round(((dragRef.current.initialRotation + deltaDeg + 180) % 360) - 180);
      queueDecalUpdate(activeDecal.id, { rotation: nextRot });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (activePointers.current.size === 0) {
      flushDecalUpdate();
      setActiveGizmoTool(null);
      setGizmoDragging(false);
      // Panduan snap hanya bermakna saat drag — bersihkan saat lepas.
      setSnapAxis({ x: false, y: false });
    }
  };

  // Only render gizmo in studio mode when visible and decal exists
  if (viewMode !== "studio" || isHideWebsiteUI || !isGizmoVisible || !activeDecal) {
    return null;
  }

  const isBack = activeDecal.targetSide === "back";
  const isLeftSleeve = activeDecal.targetSide === "left_sleeve";
  const isRightSleeve = activeDecal.targetSide === "right_sleeve";
  const isHood = activeDecal.targetSide === "hood";

  // surfaceZ SSOT per apparel (audit #6 — default lama 0.18 beda dari guide
  // 0.155 & renderer shirt 0.24 = selisih ±2.5–6cm). Prop parent
  // (ApparelMeshRenderer) menang bila ada; fallback = SSOT apparel aktif.
  const zBase = surfaceZ ?? surfaceZForApparel(activeApparel);

  let gizmoPos: [number, number, number] = [activeDecal.x, activeDecal.y, zBase + 0.01];
  let gizmoRot: [number, number, number] = [0, 0, 0];

  if (isBack) {
    gizmoPos = [activeDecal.x, activeDecal.y, -(zBase + 0.01)];
    gizmoRot = [0, Math.PI, 0];
  }

  // Badge cm dari SSOT kalibrasi terukur (SAMA dengan pricing engine).
  // Kerah per-apparel dari spek (audit #4 — hardcode 0.18 salah s/d 1,4cm).
  // Jangkar lengan per apparel (bukan ±0.27 global).
  const spec = APPAREL_PHYSICAL_SPECS[activeApparel];
  const sleeveX = spec?.sleeveAnchorX ?? 0.27;
  // Batas geser lengan/tudung dari SSOT (SAMA dengan renderer — lihat atas).
  const sleeveSlide = Math.max(
    -DECAL_MOVE_LIMITS.sleeveSlideX,
    Math.min(DECAL_MOVE_LIMITS.sleeveSlideX, activeDecal.x)
  );

  if (isLeftSleeve) {
    // Tanpa rotasi grup: Html drei selalu menghadap kamera; rotasi 90° bikin
    // panel edge-on tak bisa diklik (audit #4). Posisi saja yang dijangkar.
    gizmoPos = [-sleeveX, activeDecal.y, sleeveSlide];
    gizmoRot = [0, 0, 0];
  } else if (isRightSleeve) {
    gizmoPos = [sleeveX, activeDecal.y, sleeveSlide];
    gizmoRot = [0, 0, 0];
  } else if (isHood) {
    const hoodY = spec?.hoodAnchorY ?? 0.34;
    const hoodZ = spec?.hoodAnchorZ ?? 0.095;
    gizmoPos = [
      Math.max(-DECAL_MOVE_LIMITS.hoodX, Math.min(DECAL_MOVE_LIMITS.hoodX, activeDecal.x)),
      hoodY + Math.max(-DECAL_MOVE_LIMITS.hoodY, Math.min(DECAL_MOVE_LIMITS.hoodY, activeDecal.y)),
      -(hoodZ + 0.01),
    ];
    gizmoRot = [0, Math.PI, 0];
  }
  // B-05: badge cm = SSOT computePhysicalPrintDimensions (SAMA dengan renderer
  // DecalLayerRenderer + pricingEngine + confirmOrder — badge = render = cetak).
  // Aspek riil dari printPx master upload (B-01); fallback 1.0 untuk decal
  // legacy tanpa printPx. fitScale ke box sisi + offset kerah via multiplier
  // apparel dikerjakan DI DALAM helper. Rumus cm tak diubah — hanya pemakaian.
  const printPw = Number((activeDecal as any)?.printPx?.w);
  const printPh = Number((activeDecal as any)?.printPx?.h);
  const realAspect = printPw > 0 && printPh > 0 ? printPw / printPh : 1.0;
  const physical = computePhysicalPrintDimensions(
    activeApparel,
    activeDecal.scale,
    activeDecal.y,
    realAspect,
    activeDecal.targetSide
  );
  const widthCm = physical.widthCm;
  const heightCm = physical.heightCm;
  const offsetCollarCm = physical.offsetFromCollarCm;

  return (
    <group position={gizmoPos} rotation={gizmoRot}>
      <Html center transform distanceFactor={2.2} zIndexRange={[100, 0]}>
        <div
          className="relative pointer-events-auto select-none transition-all duration-150 group"
          style={{
            width: `${Math.max(50, activeDecal.scale * 600)}px`,
            height: `${Math.max(50, activeDecal.scale * 600)}px`,
            transform: `rotate(${activeDecal.rotation}deg)`,
          }}
        >
          {/* Live Physical Centimeter Dimension Badge (Top) */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/90 backdrop-blur-md text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/40 shadow-xl pointer-events-none whitespace-nowrap">
            <span>↔ {widthCm}×{heightCm} cm</span>
          </div>

          {/* Distance from Collar Badge (Bottom) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md text-[9px] font-mono text-neutral-300 border border-white/10 shadow-lg pointer-events-none whitespace-nowrap">
            <span>↓ {offsetCollarCm} cm dari kerah</span>
          </div>

          {/* Bounding Box Outline */}
          <div className="absolute inset-0 border-2 border-dashed border-brand-accent/70 rounded-lg bg-brand-accent/5 shadow-[0_0_12px_rgba(230,81,0,0.3)] transition-colors hover:border-brand-accent" />

          {/* Garis panduan snap magnetis (tipis 1px, hanya saat snap aktif). */}
          {snapAxis.x && (
            <div aria-hidden className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-cyan-300/80 pointer-events-none" />
          )}
          {snapAxis.y && (
            <div aria-hidden className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-cyan-300/80 pointer-events-none" />
          )}

          {/* Move Center Handle (Semi-transparent with hover highlight) */}
          <div
            onPointerDown={(e) => onPointerDown("move", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-brand-accent/80 hover:bg-brand-accent text-canvas backdrop-blur-sm flex items-center justify-center cursor-move shadow-md hover:scale-110 active:scale-95 transition-all"
            title="Klik & tahan untuk menggeser sablon"
          >
            <Move size={13} className="stroke-[2.5]" />
          </div>

          {/* Close/Hide Gizmo Handle (Top Left) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleGizmoVisible();
            }}
            className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-neutral-900/90 text-neutral-300 hover:text-white border border-white/20 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform"
            title="Sembunyikan kotak kontrol gizmo"
          >
            <span className="text-[10px] font-bold leading-none">✕</span>
          </button>

          {/* Scale Corner Handle (Top Right) */}
          <div
            onPointerDown={(e) => onPointerDown("scale", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white text-neutral-900 border border-neutral-300 flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
            title="Tarik untuk memperbesar/memperkecil sablon"
          >
            <ZoomIn size={11} className="stroke-[2.5]" />
          </div>

          {/* Rotate Corner Handle (Bottom Right) */}
          <div
            onPointerDown={(e) => onPointerDown("rotate", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-neutral-900 text-brand-accent border border-brand-accent/50 flex items-center justify-center cursor-alias shadow-md hover:scale-125 transition-transform"
            title="Tarik untuk memutar sudut sablon"
          >
            <RotateCw size={11} className="stroke-[2.5]" />
          </div>
        </div>
      </Html>
    </group>
  );
};
