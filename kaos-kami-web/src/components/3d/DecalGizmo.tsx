"use client";

import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";
import { Html } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  APPAREL_PHYSICAL_SPECS,
  maxDecalScaleUnits,
  REAL_WORLD_PRINT_LIMITS,
  surfaceZForApparel,
  DECAL_MOVE_LIMITS,
  clampDecalXY,
  getDecal3DPlacement,
  computePhysicalPrintDimensions,
} from "@/lib/scaleCalibration";
import { RotateCw, X } from "lucide-react";

interface DecalGizmoProps {
  surfaceZ?: number;
}

const SNAP_TOL = 0.01;

/**
 * Modern Graphic Decal Gizmo (Canva / Figma Style):
 * - Screen-space crisp rendering (no blurry CSS matrix3d distortion).
 * - Exact aspect-ratio bounding box that fits the graphic tightly without empty space.
 * - 4 sleek corner resize dots (10px) with generous touch buffers (24px).
 * - Stemmed rotation handle above the top edge (Math.atan2 1:1 smooth rotation).
 * - Entire inner area is draggable (cursor-grab / grabbing) with 0% visual obstruction.
 * - Auto-zone transition when dragging across front/side/sleeve/back boundaries.
 * - Clean & unobtrusive: all side positions and dimensions are managed in the customizer drawer.
 * - Window-level pointer tracking that never loses drag or freezes.
 */
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
    modelPosX,
    modelPosY,
    modelScale,
    setCameraPreset,
    animationPreset,
    isRotating,
    setActiveViewSide,
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
      modelPosX: s.modelPosX,
      modelPosY: s.modelPosY,
      modelScale: s.modelScale,
      setCameraPreset: s.setCameraPreset,
      animationPreset: s.animationPreset,
      isRotating: s.isRotating,
      setActiveViewSide: s.setActiveViewSide,
    }))
  );

  const { size, camera } = useThree();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeGizmoTool, setActiveGizmoTool] = useState<"move" | "scale" | "rotate" | null>(null);
  const [snapAxis, setSnapAxis] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  // Sinkronisasi View Offset Kamera (Three.js camera.setViewOffset) dengan Drei <Html transform>:
  // Kamera menerapkan camera.setViewOffset (-280px saat drawer kiri terbuka, +280px saat drawer kanan terbuka)
  // untuk menggeser panggung 3D agar baju tidak tertutup drawer samping.
  // Namun, Drei <Html transform> hanya membaca camera.matrixWorldInverse dan mengabaikan view offset
  // projectionMatrix, menyebabkan gizmo tertinggal di tengah layar (terpisah jauh dari sablon di atas baju).
  // Dengan mentranslasikan wrapper Drei <Html> sebesar (-camera.view.offsetX, -camera.view.offsetY),
  // posisi gizmo 100% terkunci presisi di atas sablon di semua sudut kamera dan status drawer.
  // (WAJIB dideklarasikan di top-level sebelum early-return agar mematuhi Rules of Hooks).
  const syncWrapperOffset = useCallback(() => {
    if (!containerRef.current) return;
    const wrapper = containerRef.current.closest<HTMLElement>(".decal-gizmo-html-wrapper");
    if (!wrapper) return;

    const cam = camera as any;
    if (cam.view && cam.view.enabled) {
      const offX = -cam.view.offsetX;
      const offY = -cam.view.offsetY;
      const targetTransform = `translate3d(${offX}px, ${offY}px, 0)`;
      if (wrapper.style.transform !== targetTransform) {
        wrapper.style.transform = targetTransform;
      }
      if (wrapper.style.overflow !== "visible") {
        wrapper.style.overflow = "visible";
      }
    } else if (wrapper.style.transform) {
      wrapper.style.transform = "";
    }
  }, [camera]);

  useLayoutEffect(() => {
    syncWrapperOffset();
  }, [syncWrapperOffset]);

  useFrame(() => {
    syncWrapperOffset();
  });

  useEffect(() => {
    return () => {
      const wrapper = containerRef.current?.closest<HTMLElement>(".decal-gizmo-html-wrapper");
      if (wrapper) {
        wrapper.style.transform = "";
      }
    };
  }, []);

  const activeDecal = decals.find((d) => d.id === selectedDecalId) ?? decals[0];

  // Only render gizmo in studio mode when visible, decal exists, model is static (not running physics simulation)
  if (
    viewMode !== "studio" ||
    isHideWebsiteUI ||
    !isGizmoVisible ||
    !activeDecal ||
    animationPreset !== "static"
  ) {
    return null;
  }

  const isBack = activeDecal.targetSide === "back";
  const isLeftSleeve = activeDecal.targetSide === "left_sleeve";
  const isRightSleeve = activeDecal.targetSide === "right_sleeve";
  const isSideLeft = activeDecal.targetSide === "side_left";
  const isSideRight = activeDecal.targetSide === "side_right";
  const isHood = activeDecal.targetSide === "hood";

  const zBase = surfaceZ ?? surfaceZForApparel(activeApparel);
  const placement = getDecal3DPlacement(activeApparel, activeDecal.targetSide, activeDecal.x, activeDecal.y, zBase);
  const localPos = placement.position;

  // Model group transform offset alignment (TshirtModel, LongsleeveModel, HoodieModel, etc.)
  const capOffset = activeApparel === "cap" ? -0.11 : 0;
  const groupPosX = modelPosX;
  const groupPosY = modelPosY - 0.05 + capOffset;
  const groupScale = modelScale;

  const gizmoPos: [number, number, number] = [
    groupPosX + localPos[0] * groupScale,
    groupPosY + localPos[1] * groupScale,
    localPos[2] * groupScale,
  ];

  // Surface normal dot-product test: sembunyikan gizmo jika dilihat dari belakang atau sudut grazing tajam (< 10° dari tepi).
  // Mencegah gizmo Html transform gepeng seperti jarum saat kamera berputar ke samping/depan.
  if (!activeGizmoTool) {
    const surfaceEuler = new THREE.Euler(placement.rotation[0], placement.rotation[1], placement.rotation[2], "XYZ");
    const surfaceNormal = new THREE.Vector3(0, 0, 1).applyEuler(surfaceEuler);
    const toCam = new THREE.Vector3(
      camera.position.x - gizmoPos[0],
      camera.position.y - gizmoPos[1],
      camera.position.z - gizmoPos[2]
    ).normalize();
    const facingAngle = surfaceNormal.dot(toCam);
    if (facingAngle < 0.05) {
      return null;
    }
  }

  const DISTANCE_FACTOR = 1.0;
  const PIXELS_PER_UNIT = 400; // 400 / 1.0 = 400 pixels per 3D unit

  // Aspect ratio calculation
  const printPw = Number((activeDecal as any)?.printPx?.w);
  const printPh = Number((activeDecal as any)?.printPx?.h);
  const realAspect = printPw > 0 && printPh > 0 ? printPw / printPh : 1.0;

  // Normalized 3D dimensions as rendered on decal mesh
  let scaleX = activeDecal.scale;
  let scaleY = activeDecal.scale;
  if (realAspect >= 1) {
    scaleY = activeDecal.scale / realAspect;
  } else {
    scaleX = activeDecal.scale * realAspect;
  }

  // Exact 3D-bound pixel dimensions (conforms to mesh surface 1:1)
  const boxWidthPx = Math.max(28, Math.round(scaleX * PIXELS_PER_UNIT));
  const boxHeightPx = Math.max(28, Math.round(scaleY * PIXELS_PER_UNIT));

  // Dimensi fisik nyata (centimeter) terkalibrasi 1:1 terhadap DTF printer
  const physicalDims = computePhysicalPrintDimensions(
    activeApparel,
    activeDecal.scale,
    activeDecal.y,
    realAspect,
    activeDecal.targetSide
  );

  // ==========================================
  // Interaction Handlers (Window-level capture)
  // ==========================================

  const onScaleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setGizmoDragging(true);
    setActiveGizmoTool("scale");

    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;
    const startDist = Math.max(10, Math.hypot(e.clientX - centerX, e.clientY - centerY));
    const initialScale = activeDecal.scale;
    const maxScale = maxDecalScaleUnits(activeApparel, activeDecal.targetSide);

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const curDist = Math.hypot(ev.clientX - centerX, ev.clientY - centerY);
      const ratio = curDist / startDist;
      const nextScale = Math.max(
        REAL_WORLD_PRINT_LIMITS.minDecalScaleUnits,
        Math.min(maxScale, initialScale * ratio)
      );
      updateDecal(activeDecal.id, { scale: Number(nextScale.toFixed(4)) });
    };

    const onPointerUp = (ev: PointerEvent) => {
      ev.preventDefault();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setGizmoDragging(false);
      setActiveGizmoTool(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onRotateDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setGizmoDragging(true);
    setActiveGizmoTool("rotate");

    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const initialRot = activeDecal.rotation;

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const curAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
      const delta = curAngle - startAngle;
      let nextRot = Math.round((initialRot + delta) % 360);
      if (nextRot > 180) nextRot -= 360;
      if (nextRot < -180) nextRot += 360;
      if (ev.shiftKey) nextRot = Math.round(nextRot / 15) * 15;
      updateDecal(activeDecal.id, { rotation: nextRot });
    };

    const onPointerUp = (ev: PointerEvent) => {
      ev.preventDefault();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setGizmoDragging(false);
      setActiveGizmoTool(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onMoveDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setGizmoDragging(true);
    setActiveGizmoTool("move");

    let currentSide = activeDecal.targetSide;
    let curStartX = e.clientX;
    let curStartY = e.clientY;
    let curInitialX = activeDecal.x;
    let curInitialY = activeDecal.y;

    const hasSleeves = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"].includes(activeApparel);
    const hasSides = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "pants", "shorts"].includes(activeApparel);

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const dx = (ev.clientX - curStartX) / Math.max(1, PIXELS_PER_UNIT * groupScale);
      const dy = (ev.clientY - curStartY) / Math.max(1, PIXELS_PER_UNIT * groupScale);

      // Arah geser horizontal (signX):
      // - front, left_sleeve, side_left: dx > 0 menggeser ke kanan layar (ke arah +X / +Z dada) -> signX = +1
      // - back, hood: dari tampak belakang, penambahan X dunia (+X) berada di kiri layar -> signX = -1
      // - right_sleeve, side_right: kamera di +X melihat ke -X, kanan layar adalah -Z (punggung) -> signX = -1
      const signX =
        currentSide === "back" ||
        currentSide === "hood" ||
        currentSide === "right_sleeve" ||
        currentSide === "side_right"
          ? -1
          : 1;
      let rawX = curInitialX + dx * signX;
      let rawY = curInitialY - dy;

      // 360° Seamless Torso Zone Transition (Depan <-> Rusuk Samping <-> Punggung):
      if (hasSides) {
        if (currentSide === "front") {
          // Rusuk Kanan
          if (rawX > 0.19) {
            const sideMaxScale = maxDecalScaleUnits(activeApparel, "side_right");
            const nextScale = Math.min(activeDecal.scale, sideMaxScale);
            currentSide = "side_right";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = 0.08;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "side_right",
              x: 0.08,
              y: Number(rawY.toFixed(4)),
              scale: Number(nextScale.toFixed(4)),
            });
            setActiveViewSide("side_right");
            return;
          }
          // Rusuk Kiri
          if (rawX < -0.19) {
            const sideMaxScale = maxDecalScaleUnits(activeApparel, "side_left");
            const nextScale = Math.min(activeDecal.scale, sideMaxScale);
            currentSide = "side_left";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = 0.08;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "side_left",
              x: 0.08,
              y: Number(rawY.toFixed(4)),
              scale: Number(nextScale.toFixed(4)),
            });
            setActiveViewSide("side_left");
            return;
          }
        } else if (currentSide === "side_right") {
          if (rawX > 0.09) {
            // Kembali ke Dada Depan
            currentSide = "front";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = 0.17;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "front",
              x: 0.17,
              y: Number(rawY.toFixed(4)),
            });
            setActiveViewSide("front");
            return;
          } else if (rawX < -0.09) {
            // Berlanjut ke Punggung Belakang
            currentSide = "back";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = 0.17;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "back",
              x: 0.17,
              y: Number(rawY.toFixed(4)),
            });
            setActiveViewSide("back");
            return;
          }
        } else if (currentSide === "side_left") {
          if (rawX > 0.09) {
            // Kembali ke Dada Depan
            currentSide = "front";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = -0.17;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "front",
              x: -0.17,
              y: Number(rawY.toFixed(4)),
            });
            setActiveViewSide("front");
            return;
          } else if (rawX < -0.09) {
            // Berlanjut ke Punggung Belakang
            currentSide = "back";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = -0.17;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "back",
              x: -0.17,
              y: Number(rawY.toFixed(4)),
            });
            setActiveViewSide("back");
            return;
          }
        } else if (currentSide === "back") {
          if (rawX > 0.19) {
            // Kembali ke Rusuk Kanan dari Belakang
            currentSide = "side_right";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = -0.08;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "side_right",
              x: -0.08,
              y: Number(rawY.toFixed(4)),
            });
            setActiveViewSide("side_right");
            return;
          } else if (rawX < -0.19) {
            // Kembali ke Rusuk Kiri dari Belakang
            currentSide = "side_left";
            curStartX = ev.clientX;
            curStartY = ev.clientY;
            curInitialX = -0.08;
            curInitialY = rawY;
            updateDecal(activeDecal.id, {
              targetSide: "side_left",
              x: -0.08,
              y: Number(rawY.toFixed(4)),
            });
            setActiveViewSide("side_left");
            return;
          }
        }
      }

      // Transisi ke Lengan (Bahu Atas):
      if (hasSleeves && currentSide === "front" && rawY > 0.04) {
        const sleeveMaxScale = maxDecalScaleUnits(activeApparel, "left_sleeve");
        const nextScale = Math.min(activeDecal.scale, sleeveMaxScale);
        if (rawX < -0.19) {
          currentSide = "left_sleeve";
          curStartX = ev.clientX;
          curStartY = ev.clientY;
          curInitialX = 0;
          curInitialY = Math.max(-0.25, Math.min(0.25, rawY));
          updateDecal(activeDecal.id, {
            targetSide: "left_sleeve",
            x: 0,
            y: Number(curInitialY.toFixed(4)),
            scale: Number(nextScale.toFixed(4)),
          });
          setActiveViewSide("left_sleeve");
          return;
        }
        if (rawX > 0.19) {
          currentSide = "right_sleeve";
          curStartX = ev.clientX;
          curStartY = ev.clientY;
          curInitialX = 0;
          curInitialY = Math.max(-0.25, Math.min(0.25, rawY));
          updateDecal(activeDecal.id, {
            targetSide: "right_sleeve",
            x: 0,
            y: Number(curInitialY.toFixed(4)),
            scale: Number(nextScale.toFixed(4)),
          });
          setActiveViewSide("right_sleeve");
          return;
        }
      }
      if (currentSide === "left_sleeve" && rawX > 0.08) {
        currentSide = "front";
        curStartX = ev.clientX;
        curStartY = ev.clientY;
        curInitialX = -0.16;
        curInitialY = rawY;
        updateDecal(activeDecal.id, {
          targetSide: "front",
          x: -0.16,
          y: Number(rawY.toFixed(4)),
        });
        setActiveViewSide("front");
        return;
      }
      if (currentSide === "right_sleeve" && rawX > 0.08) {
        currentSide = "front";
        curStartX = ev.clientX;
        curStartY = ev.clientY;
        curInitialX = 0.16;
        curInitialY = rawY;
        updateDecal(activeDecal.id, {
          targetSide: "front",
          x: 0.16,
          y: Number(rawY.toFixed(4)),
        });
        setActiveViewSide("front");
        return;
      }

      const jepit = clampDecalXY(currentSide, rawX, rawY);
      const snappedX = Math.abs(jepit.x) <= SNAP_TOL;
      const snappedY = Math.abs(jepit.y) <= SNAP_TOL;
      setSnapAxis({ x: snappedX, y: snappedY });
      updateDecal(activeDecal.id, {
        x: snappedX ? 0 : Number(jepit.x.toFixed(4)),
        y: snappedY ? 0 : Number(jepit.y.toFixed(4)),
      });
    };

    const onPointerUp = (ev: PointerEvent) => {
      ev.preventDefault();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setGizmoDragging(false);
      setActiveGizmoTool(null);
      setSnapAxis({ x: false, y: false });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <group position={gizmoPos} rotation={placement.rotation}>
      <Html
        transform
        distanceFactor={DISTANCE_FACTOR}
        pointerEvents="auto"
        zIndexRange={[100, 0]}
        wrapperClass="decal-gizmo-html-wrapper"
      >
        <div
          ref={containerRef}
          className="relative pointer-events-auto select-none"
          style={{
            width: `${boxWidthPx}px`,
            height: `${boxHeightPx}px`,
            transform: `rotate(${isBack ? -activeDecal.rotation : activeDecal.rotation}deg)`,
          }}
        >
          {/* Thin, crisp dashed bounding box */}
          <div
            className={`absolute inset-0 border border-dashed rounded-sm transition-colors ${
              activeGizmoTool
                ? "border-brand-accent shadow-[0_0_8px_rgba(230,81,0,0.35)]"
                : "border-brand-accent/70 hover:border-brand-accent"
            }`}
          />

          {/* Magnetic snap guideline */}
          {snapAxis.x && (
            <div
              aria-hidden
              className="absolute -top-12 -bottom-12 left-1/2 w-px -translate-x-1/2 bg-cyan-400/90 pointer-events-none shadow-[0_0_4px_rgba(34,211,238,0.8)]"
            />
          )}
          {snapAxis.y && (
            <div
              aria-hidden
              className="absolute -left-12 -right-12 top-1/2 h-px -translate-y-1/2 bg-cyan-400/90 pointer-events-none shadow-[0_0_4px_rgba(34,211,238,0.8)]"
            />
          )}

          {/* Full-surface drag area (Clean & 100% transparent, 0 obstruction) */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Geser sablon"
            onPointerDown={onMoveDown}
            className={`absolute inset-0 ${
              activeGizmoTool === "move" ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Klik & geser untuk memindahkan posisi sablon (Otomatis beralih ke samping/lengan saat digeser ke tepi)"
          />

          {/* Rotation Handle (Canva / Figma Stem Style above top-center) */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
            {activeGizmoTool === "rotate" && (
              <div className="mb-1 px-1.5 py-0.5 rounded-full bg-neutral-950/90 border border-brand-accent text-[8.5px] font-mono font-bold text-amber-300 shadow-md whitespace-nowrap pointer-events-none">
                {activeDecal.rotation}°
              </div>
            )}
            <div
              role="button"
              tabIndex={0}
              aria-label="Putar sablon"
              onPointerDown={onRotateDown}
              className={`w-5 h-5 rounded-full bg-neutral-900/85 hover:bg-brand-accent text-white border border-white/30 shadow-md flex items-center justify-center transition-all before:absolute before:-inset-2 before:content-[''] ${
                activeGizmoTool === "rotate"
                  ? "cursor-grabbing scale-110 bg-brand-accent"
                  : "cursor-grab hover:scale-110"
              }`}
              title="Tarik melingkar untuk memutar sudut sablon (Tahan Shift untuk snap 15°)"
            >
              <RotateCw size={10} className="stroke-[2.5]" />
            </div>
            {/* Connection stem line */}
            <div className="w-px h-2 bg-brand-accent/70" />
          </div>

          {/* Corner Resize Handle 1: Top-Right */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Ubah ukuran sablon"
            onPointerDown={onScaleDown}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-brand-accent shadow-sm cursor-nwse-resize hover:scale-130 active:scale-110 transition-transform before:absolute before:-inset-2 before:content-['']"
            title="Tarik untuk memperbesar/memperkecil sablon"
          />

          {/* Corner Resize Handle 2: Bottom-Right */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Ubah ukuran sablon"
            onPointerDown={onScaleDown}
            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-brand-accent shadow-sm cursor-nesw-resize hover:scale-130 active:scale-110 transition-transform before:absolute before:-inset-2 before:content-['']"
            title="Tarik untuk memperbesar/memperkecil sablon"
          />

          {/* Corner Resize Handle 3: Bottom-Left */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Ubah ukuran sablon"
            onPointerDown={onScaleDown}
            className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-brand-accent shadow-sm cursor-nwse-resize hover:scale-130 active:scale-110 transition-transform before:absolute before:-inset-2 before:content-['']"
            title="Tarik untuk memperbesar/memperkecil sablon"
          />

          {/* Corner Handle 4: Top-Left (Quick Hide/Close) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleGizmoVisible();
            }}
            aria-label="Sembunyikan gizmo"
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-neutral-900/80 hover:bg-rose-600 text-white/90 hover:text-white border border-white/30 shadow-sm flex items-center justify-center transition-all before:absolute before:-inset-2 before:content-[''] cursor-pointer"
            title="Sembunyikan kotak kontrol gizmo (Mode Preview)"
          >
            <X size={8} className="stroke-[3]" />
          </button>

          {/* Real-world physical dimensions pill (Ukuran sablon nyata cm terkalibrasi per sisi) */}
          {physicalDims && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-950/90 backdrop-blur-md border border-brand-accent/50 text-[9px] font-mono font-bold text-white shadow-lg pointer-events-none whitespace-nowrap select-none">
              <span className="text-amber-300">
                {physicalDims.widthCm.toFixed(1)} × {physicalDims.heightCm.toFixed(1)} cm
              </span>
              <span className="text-white/40">·</span>
              <span
                className={
                  physicalDims.isWithinProductionLimits
                    ? "text-emerald-400 font-semibold"
                    : "text-rose-400 font-extrabold uppercase animate-pulse"
                }
              >
                Maks {physicalDims.maxWidthCm}cm
              </span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
