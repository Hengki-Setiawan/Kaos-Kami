"use client";

import React, { useRef, useState, useCallback } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Move, ZoomIn, RotateCw } from "lucide-react";

interface DecalGizmoProps {
  surfaceZ?: number;
}

export const DecalGizmo: React.FC<DecalGizmoProps> = ({ surfaceZ = 0.18 }) => {
  const { viewMode, isHideWebsiteUI, decals, selectedDecalId, updateDecal } = useConfiguratorStore();
  const { size } = useThree();

  const [activeGizmoTool, setActiveGizmoTool] = useState<"move" | "scale" | "rotate" | null>(null);

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

  const onPointerDown = (tool: "move" | "scale" | "rotate", e: React.PointerEvent) => {
    e.stopPropagation();
    if (!activeDecal) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveGizmoTool(tool);

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
    if (!activeGizmoTool || !activeDecal) return;
    e.stopPropagation();

    const dx = (e.clientX - dragRef.current.startX) / (size.width * 0.45);
    const dy = (e.clientY - dragRef.current.startY) / (size.height * 0.45);

    if (activeGizmoTool === "move") {
      const nextX = Math.max(-0.35, Math.min(0.35, dragRef.current.initialX + dx));
      const nextY = Math.max(-0.35, Math.min(0.35, dragRef.current.initialY - dy));
      updateDecal(activeDecal.id, { x: nextX, y: nextY });
    } else if (activeGizmoTool === "scale") {
      const deltaScale = 1 + dx * 1.8;
      const nextScale = Math.max(0.15, Math.min(1.1, dragRef.current.initialScale * deltaScale));
      updateDecal(activeDecal.id, { scale: nextScale });
    } else if (activeGizmoTool === "rotate") {
      const deltaDeg = dx * 180;
      const nextRot = Math.round(((dragRef.current.initialRotation + deltaDeg + 180) % 360) - 180);
      updateDecal(activeDecal.id, { rotation: nextRot });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveGizmoTool(null);
  };

  // Only render gizmo in studio interactive mode when decal exists
  if (viewMode !== "studio" || isHideWebsiteUI || !activeDecal) {
    return null;
  }

  const isBack = activeDecal.targetSide === "back";
  const zPosition = isBack ? -(surfaceZ + 0.01) : surfaceZ + 0.01;

  return (
    <group position={[activeDecal.x, activeDecal.y, zPosition]}>
      <Html center transform distanceFactor={2.2} zIndexRange={[100, 0]}>
        <div
          className="relative pointer-events-auto select-none transition-all duration-150"
          style={{
            width: `${Math.max(70, activeDecal.scale * 150)}px`,
            height: `${Math.max(70, activeDecal.scale * 150)}px`,
            transform: `rotate(${activeDecal.rotation}deg)`,
          }}
        >
          {/* Bounding Box Outline */}
          <div className="absolute inset-0 border-2 border-dashed border-brand-accent/80 rounded-lg bg-brand-accent/5 shadow-[0_0_12px_rgba(230,81,0,0.35)]" />

          {/* Move Center Handle */}
          <div
            onPointerDown={(e) => onPointerDown("move", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-brand-accent text-canvas flex items-center justify-center cursor-move shadow-lg hover:scale-110 active:scale-95 transition-transform"
            title="Geser posisi sablon di kaos"
          >
            <Move size={15} className="stroke-[2.5]" />
          </div>

          {/* Scale Corner Handle (Top Right) */}
          <div
            onPointerDown={(e) => onPointerDown("scale", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white text-neutral-900 border border-neutral-300 flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
            title="Ubah skala / ukuran sablon"
          >
            <ZoomIn size={12} className="stroke-[2.5]" />
          </div>

          {/* Rotate Corner Handle (Bottom Right) */}
          <div
            onPointerDown={(e) => onPointerDown("rotate", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-neutral-900 text-brand-accent border border-brand-accent/50 flex items-center justify-center cursor-alias shadow-md hover:scale-125 transition-transform"
            title="Putar sudut rotasi sablon"
          >
            <RotateCw size={12} className="stroke-[2.5]" />
          </div>
        </div>
      </Html>
    </group>
  );
};
