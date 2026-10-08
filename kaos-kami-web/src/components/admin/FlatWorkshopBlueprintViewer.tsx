"use client";

import React, { useState } from "react";
import {
  computeFlatWorkshopPlacement,
  type ComputeFlatPlacementParams,
  type FlatPlacementCalculation,
} from "@/lib/workshopBlueprint";
import { Ruler, Flame, CheckCircle2, AlertCircle } from "lucide-react";

export interface FlatDecalInfo {
  targetSide: string;
  artworkUrl?: string | null;
  printWidthCm?: number | null;
  printHeightCm?: number | null;
  offsetFromCollarCm?: number | null;
}

interface FlatWorkshopBlueprintViewerProps {
  placementParams: ComputeFlatPlacementParams;
  artworkUrl?: string | null;
  garmentColorHex?: string | null;
  className?: string;
  showPrintGuide?: boolean;
  allDecals?: FlatDecalInfo[];
  orderNumber?: string;
  customerName?: string;
  colorHex?: string;
  colorName?: string;
}

const AVAILABLE_SIDES = [
  { id: "front", label: "Dada Depan" },
  { id: "back", label: "Punggung Belakang" },
  { id: "left_sleeve", label: "Lengan Kiri" },
  { id: "right_sleeve", label: "Lengan Kanan" },
  { id: "side_left", label: "Samping Kiri" },
  { id: "side_right", label: "Samping Kanan" },
];

export function FlatWorkshopBlueprintViewer({
  placementParams,
  artworkUrl,
  garmentColorHex,
  className = "",
  showPrintGuide = true,
  allDecals = [],
}: FlatWorkshopBlueprintViewerProps) {
  const initialSide = (placementParams.targetSide || "front").toLowerCase();
  const [activeSide, setActiveSide] = useState<string>(initialSide);
  const [showPlatenGrid, setShowPlatenGrid] = useState(true);

  // Cari apakah ada decal khusus untuk sisi yang sedang aktif
  const activeDecal = allDecals.find(
    (d) => (d.targetSide || "").toLowerCase() === activeSide
  );

  const currentWidthCm = activeDecal?.printWidthCm ?? (activeSide === initialSide ? placementParams.printWidthCm : null);
  const currentHeightCm = activeDecal?.printHeightCm ?? (activeSide === initialSide ? placementParams.printHeightCm : null);
  const currentOffsetCm = activeDecal?.offsetFromCollarCm ?? (activeSide === initialSide ? placementParams.offsetFromCollarCm : null);
  const currentArtworkUrl = activeDecal?.artworkUrl || (activeSide === initialSide ? artworkUrl : null);

  const data: FlatPlacementCalculation = computeFlatWorkshopPlacement({
    ...placementParams,
    targetSide: activeSide,
    printWidthCm: currentWidthCm,
    printHeightCm: currentHeightCm,
    offsetFromCollarCm: currentOffsetCm,
  });

  const isSleeve = activeSide === "left_sleeve" || activeSide === "right_sleeve";
  const isSide = activeSide === "side_left" || activeSide === "side_right";
  const isBack = activeSide === "back";

  // Dimensi SVG ViewBox standar (500 x 560)
  const svgWidth = 500;
  const svgHeight = 560;

  const garmentXStart = 118;
  const garmentWidth = 264;
  const garmentCenter = garmentXStart + garmentWidth / 2; // 250

  const garmentYCollar = isBack ? 78 : 98;
  const garmentYHem = 485;
  const garmentHeight = garmentYHem - garmentYCollar;

  // Rasio skala cm ke unit SVG
  const scaleX = garmentWidth / data.chestWidthCm;
  const scaleY = garmentHeight / (data.bodyLengthCm - data.collarDropCm);

  // Posisi kotak sablon pada SVG
  const printBoxW = Math.max(20, data.printWidthCm * scaleX);
  const printBoxH = Math.max(20, data.printHeightCm * scaleY);

  const printBoxX = garmentXStart + data.leftSeamMarginCm * scaleX;
  const printBoxY = garmentYCollar + data.offsetFromCollarCm * scaleY;
  const printBoxRight = printBoxX + printBoxW;
  const printBoxBottom = printBoxY + printBoxH;

  const apparel = (placementParams.apparelType || "tshirt").toLowerCase();
  const fillColor = garmentColorHex || "#18181b";
  const strokeColor = "#52525b";
  const seamColor = "#71717a";

  return (
    <div className={`flex flex-col rounded-2xl bg-surface/90 border border-border-subtle overflow-hidden font-sans ${className}`}>
      {/* Header Info Banner */}
      <div className="p-3 bg-black/5 dark:bg-white/5 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent">
            <Ruler size={15} />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-text-primary block">
              Lembar Kerja Pola 2D CAD (Identik Aset 3D)
            </span>
            <span className="text-[10px] text-text-muted">
              {data.apparelName} · Size {data.size} · Posisi {data.alignmentLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-text-muted hover:text-text-primary transition-colors">
            <input
              type="checkbox"
              checked={showPlatenGrid}
              onChange={(e) => setShowPlatenGrid(e.target.checked)}
              className="accent-brand-accent rounded"
            />
            <span>Meja Press 40×50 cm</span>
          </label>
        </div>
      </div>

      {/* Side Selector Tabs (6 Sisi Lengkap) */}
      <div className="px-3 py-2 bg-black/10 dark:bg-black/30 border-b border-border-subtle flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {AVAILABLE_SIDES.map((s) => {
          const hasArtwork =
            allDecals.some((d) => (d.targetSide || "").toLowerCase() === s.id && !!d.artworkUrl) ||
            (s.id === initialSide && !!artworkUrl);
          const isSelected = activeSide === s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSide(s.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-brand-accent text-canvas shadow-sm"
                  : "bg-surface/80 text-text-muted hover:text-text-primary hover:bg-surface border border-border-subtle"
              }`}
            >
              <span>{s.label}</span>
              {hasArtwork && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-canvas" : "bg-emerald-500"
                  }`}
                  title="Ada file desain pada sisi ini"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main SVG Blueprint Diagram */}
      <div className="relative w-full aspect-[500/540] max-h-[460px] bg-gradient-to-b from-neutral-900 to-neutral-950 p-2 flex items-center justify-center select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
            </pattern>
            <marker id="arrowStart" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f97316" />
            </marker>
            <marker id="arrowEnd" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f97316" />
            </marker>
            <marker id="arrowCyanStart" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#06b6d4" />
            </marker>
            <marker id="arrowCyanEnd" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#06b6d4" />
            </marker>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="url(#cadGrid)" />

          {/* 1. Siluet Meja Heat Press (Platen Rubber 40x50 cm) */}
          {showPlatenGrid && (
            <g opacity="0.6">
              <rect
                x="80"
                y="50"
                width="340"
                height="450"
                rx="14"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="6,4"
              />
              <text x="92" y="70" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                PLATEN HEAT PRESS 40×50 CM
              </text>
            </g>
          )}

          {/* 2. Visualisasi Pola Berdasarkan Sisi Aktif */}
          {isSleeve ? (
            /* ================= POLA LENGAN DATAR (SLEEVE FLAT-LAY) ================= */
            <g>
              {/* Pola Lengan Streetwear Terbuka */}
              <path
                d="M 160 140 C 200 90, 300 90, 340 140 L 320 400 L 180 400 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Jahitan Manset Ujung Lengan (Twin Needle Hem) */}
              <line x1="180" y1="385" x2="320" y2="385" stroke={seamColor} strokeWidth="1.6" strokeDasharray="3,2" />
              <line x1="180" y1="388" x2="320" y2="388" stroke={seamColor} strokeWidth="1.6" strokeDasharray="3,2" />
              {/* Garis Tengah Lipatan Lengan (Sleeve Centerline) */}
              <line x1="250" y1="100" x2="250" y2="400" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.75" />
              <text x="250" y="420" fill="#f43f5e" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                GARIS TENGAH LIPATAN LENGAN
              </text>
            </g>
          ) : isSide ? (
            /* ================= POLA RUSUK SAMPING DATAR (SIDE FLANK) ================= */
            <g>
              {/* Pola Panel Rusuk Samping Kaos */}
              <path
                d="M 170 140 C 210 110, 290 110, 330 140 L 325 465 L 175 465 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Jahitan Kelim Bawah */}
              <line x1="175" y1="452" x2="325" y2="452" stroke={seamColor} strokeWidth="1.6" strokeDasharray="3,2" />
              {/* Garis Jahitan Samping Utama */}
              <line x1="250" y1="120" x2="250" y2="465" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.75" />
              <text x="250" y="485" fill="#f43f5e" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                GARIS JAHITAN SAMPING BADAN (SEAM)
              </text>
            </g>
          ) : (
            /* ================= POLA BADAN DEPAN / BELAKANG ================= */
            <g>
              {/* Kontur Luar Badan Kaos Streetwear Modern */}
              <path
                d="M 195 68 C 215 62, 285 62, 305 68 C 345 80, 385 102, 395 110 C 435 155, 430 205, 420 220 C 400 232, 382 240, 372 245 C 362 250, 358 245, 355 235 C 362 210, 368 185, 362 175 C 352 170, 345 190, 342 220 C 338 270, 342 380, 345 470 C 345 480, 342 485, 335 485 L 165 485 C 158 485, 155 480, 155 470 C 158 380, 162 270, 158 220 C 155 190, 148 170, 138 175 C 132 185, 138 210, 145 235 C 142 245, 138 250, 128 245 C 118 240, 100 232, 80 220 C 70 205, 65 155, 105 110 C 115 102, 155 80, 195 68 Z"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Kerah Belakang vs Kerah Depan */}
              {isBack ? (
                <g>
                  {/* Kerah Punggung Belakang (Tinggi & Lurus) */}
                  <path
                    d="M 195 68 C 225 78, 275 78, 305 68"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.8"
                  />
                  {/* Pita Jahitan Rantai Leher Belakang (Neck Tape) */}
                  <path
                    d="M 198 72 C 225 81, 275 81, 302 72"
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                </g>
              ) : (
                <g>
                  {/* Kerah Depan Melengkung Dalam */}
                  <path
                    d="M 195 68 C 215 112, 285 112, 305 68"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.2"
                  />
                  <path
                    d="M 192 66 C 214 116, 286 116, 308 66"
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />
                </g>
              )}

              {/* Jahitan Kelim Bawah & Lengan */}
              <line x1="156" y1="472" x2="344" y2="472" stroke={seamColor} strokeWidth="1.6" strokeDasharray="3,2" />
              <line x1="156" y1="475" x2="344" y2="475" stroke={seamColor} strokeWidth="1.6" strokeDasharray="3,2" />

              {/* Garis Tengah Dada/Punggung (Centerline) */}
              <line
                x1={garmentCenter}
                y1={garmentYCollar - 10}
                x2={garmentCenter}
                y2={garmentYHem + 15}
                stroke="#f43f5e"
                strokeWidth="1.2"
                strokeDasharray="5,3"
                opacity="0.75"
              />
              <text
                x={garmentCenter}
                y={garmentYHem + 28}
                fill="#f43f5e"
                fontSize="7.5"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {isBack ? "GARIS TENGAH PUNGGUNG (CENTERLINE)" : "GARIS TENGAH DADA (CENTERLINE)"}
              </text>
            </g>
          )}

          {/* 3. Area Kotak Cetak DTF Presisi */}
          {/* Boundary Area Sablon */}
          <rect
            x={isSleeve ? 200 : isSide ? 180 : printBoxX}
            y={isSleeve ? 180 : isSide ? 180 : printBoxY}
            width={isSleeve ? 100 : isSide ? 140 : printBoxW}
            height={isSleeve ? 100 : isSide ? 220 : printBoxH}
            rx="6"
            fill="rgba(249, 115, 22, 0.08)"
            stroke="#f97316"
            strokeWidth="1.8"
            strokeDasharray="5,3"
          />

          {/* Gambar Artwork Asli Jika Ada */}
          {currentArtworkUrl ? (
            <image
              href={currentArtworkUrl}
              x={(isSleeve ? 200 : isSide ? 180 : printBoxX) + 3}
              y={(isSleeve ? 180 : isSide ? 180 : printBoxY) + 3}
              width={(isSleeve ? 100 : isSide ? 140 : printBoxW) - 6}
              height={(isSleeve ? 100 : isSide ? 220 : printBoxH) - 6}
              preserveAspectRatio="xMidYMid meet"
              opacity="0.95"
            />
          ) : (
            <g transform={`translate(${isSleeve ? 250 : isSide ? 250 : printBoxX + printBoxW / 2}, ${(isSleeve ? 230 : isSide ? 290 : printBoxY + printBoxH / 2)})`}>
              <text x="0" y="0" fill="#9ca3af" fontSize="10" fontFamily="monospace" textAnchor="middle">
                [Area Sablon {data.alignmentLabel}]
              </text>
              <text x="0" y="14" fill="#6b7280" fontSize="8" fontFamily="monospace" textAnchor="middle">
                {data.printWidthCm.toFixed(1)} × {data.printHeightCm.toFixed(1)} cm
              </text>
            </g>
          )}

          {/* Badge Dimensi Cetak di Atas Kotak Sablon */}
          <g
            transform={`translate(${
              (isSleeve ? 200 : isSide ? 180 : printBoxX) +
              (isSleeve ? 100 : isSide ? 140 : printBoxW) / 2
            }, ${(isSleeve ? 180 : isSide ? 180 : printBoxY) + (isSleeve ? 100 : isSide ? 220 : printBoxH) / 2})`}
          >
            <rect
              x="-48"
              y="-10"
              width="96"
              height="20"
              rx="10"
              fill="#09090b"
              stroke="#f97316"
              strokeWidth="1.2"
              opacity="0.9"
            />
            <text x="0" y="3.5" fill="#f97316" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {data.printWidthCm.toFixed(1)} × {data.printHeightCm.toFixed(1)} cm
            </text>
          </g>

          {/* 4. Garis Ukur Panah Dimensi */}
          {!isSleeve && !isSide && (
            <>
              {/* Panah Jarak dari Jahitan Kerah */}
              <g>
                <line
                  x1={garmentCenter}
                  y1={garmentYCollar}
                  x2={garmentCenter}
                  y2={printBoxY}
                  stroke="#f97316"
                  strokeWidth="1.6"
                  markerStart="url(#arrowStart)"
                  markerEnd="url(#arrowEnd)"
                />
                <g transform={`translate(${garmentCenter + 8}, ${(garmentYCollar + printBoxY) / 2})`}>
                  <rect x="0" y="-8" width="62" height="16" rx="8" fill="#ea580c" />
                  <text x="31" y="3.5" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                    ↓ {data.offsetFromCollarCm.toFixed(1)} cm
                  </text>
                </g>
              </g>

              {/* Panah Margin Samping Kiri & Kanan */}
              <g>
                <line
                  x1={garmentXStart}
                  y1={printBoxY + printBoxH / 2}
                  x2={printBoxX}
                  y2={printBoxY + printBoxH / 2}
                  stroke="#06b6d4"
                  strokeWidth="1.4"
                  strokeDasharray="4,2"
                />
                <g transform={`translate(${(garmentXStart + printBoxX) / 2}, ${printBoxY + printBoxH / 2})`}>
                  <rect x="-35" y="-8" width="70" height="16" rx="8" fill="#0891b2" />
                  <text x="0" y="3.5" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    ← {data.leftSeamMarginCm.toFixed(1)} cm
                  </text>
                </g>

                <line
                  x1={printBoxRight}
                  y1={printBoxY + printBoxH / 2}
                  x2={garmentXStart + garmentWidth}
                  y2={printBoxY + printBoxH / 2}
                  stroke="#06b6d4"
                  strokeWidth="1.4"
                  strokeDasharray="4,2"
                />
                <g transform={`translate(${(printBoxRight + garmentXStart + garmentWidth) / 2}, ${printBoxY + printBoxH / 2})`}>
                  <rect x="-35" y="-8" width="70" height="16" rx="8" fill="#0891b2" />
                  <text x="0" y="3.5" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                    {data.rightSeamMarginCm.toFixed(1)} cm →
                  </text>
                </g>
              </g>

              {/* Panah Jarak ke Keliman Bawah */}
              <g>
                <line
                  x1={garmentCenter}
                  y1={printBoxBottom}
                  x2={garmentCenter}
                  y2={garmentYHem}
                  stroke="#10b981"
                  strokeWidth="1.4"
                  markerStart="url(#arrowCyanStart)"
                  markerEnd="url(#arrowCyanEnd)"
                />
                <g transform={`translate(${garmentCenter + 8}, ${(printBoxBottom + garmentYHem) / 2})`}>
                  <rect x="0" y="-8" width="78" height="16" rx="8" fill="#059669" />
                  <text x="39" y="3.5" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                    ↑ {data.bottomHemMarginCm.toFixed(1)} cm
                  </text>
                </g>
              </g>
            </>
          )}
        </svg>
      </div>

      {/* 5. Parameter Grid & Petunjuk Meja Press */}
      {showPrintGuide && (
        <div className="p-4 space-y-3 bg-surface border-t border-border-subtle">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
              <span className="text-[10px] text-text-muted block font-semibold uppercase">
                {isSleeve ? "Jarak dari Bahu" : isSide ? "Jarak dari Ketiak" : "Jarak dari Kerah"}
              </span>
              <span className="text-base font-bold text-brand-accent">
                {data.offsetFromCollarCm.toFixed(1)} cm
              </span>
              <span className="text-[9px] text-text-muted block">
                {isSleeve ? "Titik puncak pundak" : isSide ? "Jahitan armpit" : "±3 jari di bawah rib"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
              <span className="text-[10px] text-text-muted block font-semibold uppercase">Margin Samping Kiri</span>
              <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                {data.leftSeamMarginCm.toFixed(1)} cm
              </span>
              <span className="text-[9px] text-text-muted block">Dari jahitan samping</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
              <span className="text-[10px] text-text-muted block font-semibold uppercase">Margin Samping Kanan</span>
              <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                {data.rightSeamMarginCm.toFixed(1)} cm
              </span>
              <span className="text-[9px] text-text-muted block">Dari jahitan samping</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
              <span className="text-[10px] text-text-muted block font-semibold uppercase">
                {isSleeve ? "Jarak ke Manset" : "Jarak ke Kelim Bawah"}
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {data.bottomHemMarginCm.toFixed(1)} cm
              </span>
              <span className="text-[9px] text-text-muted block">Lipatan bawah</span>
            </div>
          </div>

          {/* SOP Langkah Pengepresan Teknis */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase">
              <Flame size={13} />
              <span>Instruksi Operator Heat Press ({data.alignmentLabel}):</span>
            </div>
            <ul className="space-y-1 text-[11px] text-text-muted list-disc list-inside">
              {data.operatorStepGuide.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
