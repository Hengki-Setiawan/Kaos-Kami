"use client";

import React, { useState, useEffect } from "react";
import { X, Ruler, Check, Info, Layers, Maximize2, Sparkles } from "lucide-react";
import {
  getApparelSizing,
  getSizeDimensions,
  type ApparelSizingSpec,
  type GarmentDimensions,
} from "@/lib/apparelSizing";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeApparel: string;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  drawerPosition?: "left" | "right";
}

const APPAREL_TABS: { slug: string; label: string }[] = [
  { slug: "tshirt", label: "Kaos Polos" },
  { slug: "hoodie", label: "Hoodie" },
  { slug: "longsleeve", label: "Lengan Panjang" },
  { slug: "crewneck", label: "Crewneck" },
  { slug: "shirt", label: "Coach Jacket" },
  { slug: "pants", label: "Celana Panjang" },
  { slug: "shorts", label: "Celana Pendek" },
  { slug: "cap", label: "Topi" },
];

const DTF_PRINT_TIERS = [
  {
    tier: "LOGO / SAKU",
    sizeCm: "8.5 × 8.5 cm",
    usage: "Logo dada kiri, punggung atas dekat kerah, atau panel depan topi.",
    recommended: "Cocok untuk emblem distro, inisial tim, atau badge simpel.",
  },
  {
    tier: "A5 (SEDANG)",
    sizeCm: "14.8 × 21.0 cm",
    usage: "Desain dada sedang, panel lengan, atau grafis paha celana.",
    recommended: "Ideal untuk ilustrasi vertikal atau tipografi horizontal 1-2 baris.",
  },
  {
    tier: "A4 (STANDAR DISTRO)",
    sizeCm: "21.0 × 29.7 cm",
    usage: "Desain grafis dada tengah atau punggung standar streetwear.",
    recommended: "Paling populer untuk kaos distro komersial & merchandise band.",
  },
  {
    tier: "A3 (MAKSIMAL DTF)",
    sizeCm: "29.7 × 42.0 cm",
    usage: "Grafis poster penuh punggung atau dada depan oversized.",
    recommended: "Dibatasi batas DTF maksimal 30.0 cm untuk menjaga serat pakaian.",
  },
];

// --- 8 SPECIALIZED APPAREL VECTOR BLUEPRINTS (TECHNICAL FLATS) ---

interface DiagramProps {
  dims: GarmentDimensions;
  formatVal: (v?: number) => string;
  formatRange?: (min?: number, max?: number) => string;
  activeMetric?: string | null;
  onSelectMetric?: (metric: string | null) => void;
}

function TshirtDiagram({ dims, formatVal, activeMetric }: DiagramProps) {
  const isChest = activeMetric === "chest";
  const isLength = activeMetric === "length";
  const isShoulder = activeMetric === "shoulder";
  const isSleeve = activeMetric === "sleeve";

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      {/* Garment Base Outline (Technical Flat Style) */}
      <path
        d="M 98 40 Q 120 54 142 40 L 188 56 L 206 92 L 182 102 L 168 84 L 168 208 L 72 208 L 72 84 L 58 102 L 34 92 L 52 56 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Rib Kerah Leher */}
      <path
        d="M 98 40 Q 120 30 142 40 Q 120 54 98 40 Z"
        className="fill-neutral-800/20 dark:fill-neutral-100/10 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="1.5"
      />
      {/* Jahitan Hem Bawah & Manset */}
      <line x1="72" y1="202" x2="168" y2="202" strokeWidth="1.2" strokeDasharray="2 2" className="stroke-neutral-400/60 dark:stroke-neutral-500/60" />
      <line x1="36" y1="90" x2="56" y2="100" strokeWidth="1.2" strokeDasharray="2 2" className="stroke-neutral-400/60 dark:stroke-neutral-500/60" />
      <line x1="204" y1="90" x2="184" y2="100" strokeWidth="1.2" strokeDasharray="2 2" className="stroke-neutral-400/60 dark:stroke-neutral-500/60" />

      {/* Line A: Lebar Dada */}
      <line
        x1="72"
        y1="112"
        x2="168"
        y2="112"
        strokeWidth={isChest ? 2.5 : 1.8}
        strokeDasharray="3 3"
        className={isChest ? "stroke-blue-400" : "stroke-blue-500/80"}
      />
      <circle cx="72" cy="112" r={isChest ? 3.5 : 2.5} className="fill-blue-500" />
      <circle cx="168" cy="112" r={isChest ? 3.5 : 2.5} className="fill-blue-500" />
      <g transform="translate(120, 112)">
        <rect x="-48" y="-11" width="96" height="22" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9.5px] font-bold">
          A: Lebar {formatVal(dims.chestWidthCm)}
        </text>
      </g>

      {/* Line B: Panjang Badan */}
      <line
        x1="184"
        y1="40"
        x2="184"
        y2="208"
        strokeWidth={isLength ? 2.5 : 1.8}
        strokeDasharray="3 3"
        className={isLength ? "stroke-emerald-400" : "stroke-emerald-500/80"}
      />
      <circle cx="184" cy="40" r={isLength ? 3.5 : 2.5} className="fill-emerald-500" />
      <circle cx="184" cy="208" r={isLength ? 3.5 : 2.5} className="fill-emerald-500" />
      <g transform="translate(184, 154)">
        <rect x="-42" y="-10" width="84" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          B: Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line C: Lebar Bahu */}
      {dims.shoulderWidthCm && (
        <>
          <line
            x1="52"
            y1="28"
            x2="188"
            y2="28"
            strokeWidth={isShoulder ? 2.2 : 1.5}
            strokeDasharray="2 2"
            className={isShoulder ? "stroke-amber-400" : "stroke-amber-500/80"}
          />
          <circle cx="52" cy="28" r="2" className="fill-amber-500" />
          <circle cx="188" cy="28" r="2" className="fill-amber-500" />
          <g transform="translate(120, 28)">
            <rect x="-44" y="-10" width="88" height="20" rx="5" className="fill-neutral-900 stroke-amber-500" strokeWidth="1.5" />
            <text x="0" y="4" textAnchor="middle" className="fill-amber-400 font-mono text-[9px] font-bold">
              C: Bahu {formatVal(dims.shoulderWidthCm)}
            </text>
          </g>
        </>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <g transform="translate(202, 68)">
          <rect x="-30" y="-9" width="60" height="18" rx="4" className="fill-neutral-900 stroke-sky-400" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-sky-400 font-mono text-[8.5px] font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function HoodieDiagram({ dims, formatVal, activeMetric }: DiagramProps) {
  const isChest = activeMetric === "chest";
  const isLength = activeMetric === "length";
  const isShoulder = activeMetric === "shoulder";
  const isSleeve = activeMetric === "sleeve";

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      {/* Tudung / Hood 3D */}
      <path
        d="M 94 48 C 80 18, 98 8, 120 8 C 142 8, 160 18, 146 48"
        className="fill-neutral-800/15 dark:fill-neutral-100/10 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Tali Hoodie */}
      <path d="M 112 50 L 112 78" strokeWidth="1.5" strokeLinecap="round" className="stroke-blue-400" />
      <path d="M 128 50 L 128 78" strokeWidth="1.5" strokeLinecap="round" className="stroke-blue-400" />
      <circle cx="112" cy="79" r="1.8" className="fill-blue-400" />
      <circle cx="128" cy="79" r="1.8" className="fill-blue-400" />

      {/* Badan & Lengan Drop Shoulder */}
      <path
        d="M 94 48 L 48 60 L 26 150 L 46 154 L 68 92 L 68 208 L 172 208 L 172 92 L 194 154 L 214 150 L 192 60 L 146 48 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Rib Pinggang Bawah & Manset */}
      <line x1="68" y1="194" x2="172" y2="194" strokeWidth="1.5" className="stroke-neutral-400/50 dark:stroke-neutral-500/50" />
      <line x1="26" y1="142" x2="46" y2="146" strokeWidth="1.5" className="stroke-neutral-400/50 dark:stroke-neutral-500/50" />
      <line x1="214" y1="142" x2="194" y2="146" strokeWidth="1.5" className="stroke-neutral-400/50 dark:stroke-neutral-500/50" />

      {/* Saku Kanguru */}
      <path
        d="M 82 152 L 158 152 L 166 194 L 74 194 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/10 stroke-blue-500/60"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Line A: Lebar Dada */}
      <line
        x1="68"
        y1="116"
        x2="172"
        y2="116"
        strokeWidth={isChest ? 2.5 : 1.8}
        strokeDasharray="3 3"
        className={isChest ? "stroke-blue-400" : "stroke-blue-500/80"}
      />
      <circle cx="68" cy="116" r={isChest ? 3.5 : 2.5} className="fill-blue-500" />
      <circle cx="172" cy="116" r={isChest ? 3.5 : 2.5} className="fill-blue-500" />
      <g transform="translate(120, 116)">
        <rect x="-48" y="-11" width="96" height="22" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9.5px] font-bold">
          A: Lebar {formatVal(dims.chestWidthCm)}
        </text>
      </g>

      {/* Line B: Panjang Badan */}
      <line
        x1="184"
        y1="48"
        x2="184"
        y2="208"
        strokeWidth={isLength ? 2.5 : 1.8}
        strokeDasharray="3 3"
        className={isLength ? "stroke-emerald-400" : "stroke-emerald-500/80"}
      />
      <circle cx="184" cy="48" r={isLength ? 3.5 : 2.5} className="fill-emerald-500" />
      <circle cx="184" cy="208" r={isLength ? 3.5 : 2.5} className="fill-emerald-500" />
      <g transform="translate(184, 154)">
        <rect x="-42" y="-10" width="84" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          B: Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line C: Bahu Drop */}
      {dims.shoulderWidthCm && (
        <g transform="translate(120, 26)">
          <rect x="-44" y="-10" width="88" height="20" rx="5" className="fill-neutral-900 stroke-amber-500" strokeWidth="1.5" />
          <text x="0" y="4" textAnchor="middle" className="fill-amber-400 font-mono text-[9px] font-bold">
            C: Bahu {formatVal(dims.shoulderWidthCm)}
          </text>
        </g>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <g transform="translate(208, 98)">
          <rect x="-30" y="-9" width="60" height="18" rx="4" className="fill-neutral-900 stroke-sky-400" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-sky-400 font-mono text-[8.5px] font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function LongsleeveDiagram({ dims, formatVal, activeMetric }: DiagramProps) {
  const isChest = activeMetric === "chest";
  const isLength = activeMetric === "length";
  const isShoulder = activeMetric === "shoulder";

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      <path
        d="M 98 40 Q 120 54 142 40 L 180 50 L 202 166 L 182 170 L 168 84 L 168 208 L 72 208 L 72 84 L 58 170 L 38 166 L 60 50 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M 98 40 Q 120 30 142 40 Q 120 54 98 40 Z" strokeWidth="1.5" className="stroke-neutral-400 dark:stroke-neutral-500" />
      <line x1="38" y1="156" x2="58" y2="160" strokeWidth="1.5" className="stroke-neutral-400/50" />
      <line x1="202" y1="156" x2="182" y2="160" strokeWidth="1.5" className="stroke-neutral-400/50" />

      {/* Line A: Lebar Dada */}
      <line x1="72" y1="110" x2="168" y2="110" strokeWidth={isChest ? 2.5 : 1.8} strokeDasharray="3 3" className="stroke-blue-500" />
      <circle cx="72" cy="110" r="2.5" className="fill-blue-500" />
      <circle cx="168" cy="110" r="2.5" className="fill-blue-500" />
      <g transform="translate(120, 110)">
        <rect x="-48" y="-11" width="96" height="22" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9.5px] font-bold">
          A: Lebar {formatVal(dims.chestWidthCm)}
        </text>
      </g>

      {/* Line B: Panjang Badan */}
      <line x1="178" y1="42" x2="178" y2="208" strokeWidth={isLength ? 2.5 : 1.8} strokeDasharray="3 3" className="stroke-emerald-500" />
      <circle cx="178" cy="42" r="2.5" className="fill-emerald-500" />
      <circle cx="178" cy="208" r="2.5" className="fill-emerald-500" />
      <g transform="translate(178, 154)">
        <rect x="-42" y="-10" width="84" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          B: Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line C: Bahu */}
      {dims.shoulderWidthCm && (
        <g transform="translate(120, 24)">
          <rect x="-44" y="-10" width="88" height="20" rx="5" className="fill-neutral-900 stroke-amber-500" strokeWidth="1.5" />
          <text x="0" y="4" textAnchor="middle" className="fill-amber-400 font-mono text-[9px] font-bold">
            C: Bahu {formatVal(dims.shoulderWidthCm)}
          </text>
        </g>
      )}

      {/* Line D: Lengan Panjang */}
      {dims.sleeveLengthCm && (
        <g transform="translate(204, 110)">
          <rect x="-30" y="-9" width="60" height="18" rx="4" className="fill-neutral-900 stroke-sky-400" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-sky-400 font-mono text-[8.5px] font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function CrewneckDiagram({ dims, formatVal, activeMetric }: DiagramProps) {
  const isChest = activeMetric === "chest";
  const isLength = activeMetric === "length";

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      <path
        d="M 96 42 Q 120 56 144 42 L 186 58 L 208 166 L 188 170 L 170 90 L 170 208 L 70 208 L 70 90 L 52 170 L 32 166 L 54 58 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M 96 42 Q 120 28 144 42 Q 120 56 96 42 Z" strokeWidth="2" className="stroke-blue-500/60" />
      <line x1="70" y1="194" x2="170" y2="194" strokeWidth="2" className="stroke-blue-500/60" />
      <line x1="32" y1="154" x2="52" y2="158" strokeWidth="2" className="stroke-blue-500/60" />
      <line x1="208" y1="154" x2="188" y2="158" strokeWidth="2" className="stroke-blue-500/60" />

      {/* Line A: Lebar Dada */}
      <line x1="70" y1="116" x2="170" y2="116" strokeWidth={isChest ? 2.5 : 1.8} strokeDasharray="3 3" className="stroke-blue-500" />
      <circle cx="70" cy="116" r="2.5" className="fill-blue-500" />
      <circle cx="170" cy="116" r="2.5" className="fill-blue-500" />
      <g transform="translate(120, 116)">
        <rect x="-48" y="-11" width="96" height="22" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9.5px] font-bold">
          A: Lebar {formatVal(dims.chestWidthCm)}
        </text>
      </g>

      {/* Line B: Panjang Badan */}
      <line x1="182" y1="44" x2="182" y2="208" strokeWidth={isLength ? 2.5 : 1.8} strokeDasharray="3 3" className="stroke-emerald-500" />
      <circle cx="182" cy="44" r="2.5" className="fill-emerald-500" />
      <circle cx="182" cy="208" r="2.5" className="fill-emerald-500" />
      <g transform="translate(182, 154)">
        <rect x="-42" y="-10" width="84" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          B: Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line D: Lengan */}
      {dims.sleeveLengthCm && (
        <g transform="translate(208, 112)">
          <rect x="-30" y="-9" width="60" height="18" rx="4" className="fill-neutral-900 stroke-sky-400" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-sky-400 font-mono text-[8.5px] font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function CoachJacketDiagram({ dims, formatVal, activeMetric }: DiagramProps) {
  const isChest = activeMetric === "chest";
  const isLength = activeMetric === "length";

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      {/* Kerah Lipat */}
      <path d="M 98 42 L 86 60 L 120 52 Z" strokeWidth="2" className="stroke-blue-500/80 fill-neutral-800/10" />
      <path d="M 142 42 L 154 60 L 120 52 Z" strokeWidth="2" className="stroke-blue-500/80 fill-neutral-800/10" />
      <path d="M 98 42 Q 120 36 142 42" strokeWidth="2" className="stroke-neutral-400" />

      {/* Badan Jaket & Lengan */}
      <path
        d="M 98 42 L 54 56 L 34 168 L 54 172 L 72 86 L 72 208 L 168 208 L 168 86 L 186 172 L 206 168 L 186 56 L 142 42 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Garis Kancing Placket */}
      <line x1="120" y1="52" x2="120" y2="208" strokeWidth="1.8" className="stroke-neutral-400/60" />
      {[76, 108, 140, 172, 198].map((y) => (
        <circle key={y} cx="120" cy={y} r="2.2" className="fill-blue-500" />
      ))}
      {/* Saku Welt Slanted */}
      <line x1="82" y1="152" x2="94" y2="174" strokeWidth="2" className="stroke-neutral-400/60" />
      <line x1="158" y1="152" x2="146" y2="174" strokeWidth="2" className="stroke-neutral-400/60" />

      {/* Line A: Lebar Dada */}
      <line x1="72" y1="112" x2="168" y2="112" strokeWidth={isChest ? 2.5 : 1.8} strokeDasharray="3 3" className="stroke-blue-500" />
      <circle cx="72" cy="112" r="2.5" className="fill-blue-500" />
      <circle cx="168" cy="112" r="2.5" className="fill-blue-500" />
      <g transform="translate(120, 112)">
        <rect x="-48" y="-11" width="96" height="22" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9.5px] font-bold">
          A: Lebar {formatVal(dims.chestWidthCm)}
        </text>
      </g>

      {/* Line B: Panjang Badan */}
      <line x1="184" y1="44" x2="184" y2="208" strokeWidth={isLength ? 2.5 : 1.8} strokeDasharray="3 3" className="stroke-emerald-500" />
      <circle cx="184" cy="44" r="2.5" className="fill-emerald-500" />
      <circle cx="184" cy="208" r="2.5" className="fill-emerald-500" />
      <g transform="translate(184, 154)">
        <rect x="-42" y="-10" width="84" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          B: Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line D: Lengan */}
      {dims.sleeveLengthCm && (
        <g transform="translate(206, 116)">
          <rect x="-30" y="-9" width="60" height="18" rx="4" className="fill-neutral-900 stroke-sky-400" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-sky-400 font-mono text-[8.5px] font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function PantsDiagram({ dims, formatVal, formatRange = (min, max) => `${min}-${max}` }: DiagramProps) {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      {/* Ban Pinggang Elastis */}
      <rect x="70" y="28" width="100" height="14" rx="3" strokeWidth="2" className="stroke-neutral-400 dark:stroke-neutral-500 fill-neutral-800/10" />
      <path d="M 116 42 Q 112 56 106 60" strokeWidth="1.5" strokeLinecap="round" className="stroke-blue-400" />
      <path d="M 124 42 Q 128 56 134 60" strokeWidth="1.5" strokeLinecap="round" className="stroke-blue-400" />
      <line x1="72" y1="52" x2="88" y2="76" strokeWidth="1.5" className="stroke-neutral-400/50" />
      <line x1="168" y1="52" x2="152" y2="76" strokeWidth="1.5" className="stroke-neutral-400/50" />

      {/* Kaki Celana Jogger Sweatpants */}
      <path
        d="M 70 42 L 72 100 L 80 206 L 102 206 L 116 114 Q 120 110 124 114 L 138 206 L 160 206 L 168 100 L 170 42"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Rib Bukaan Kaki Bawah */}
      <line x1="80" y1="196" x2="102" y2="196" strokeWidth="1.5" className="stroke-neutral-400/50" />
      <line x1="138" y1="196" x2="160" y2="196" strokeWidth="1.5" className="stroke-neutral-400/50" />

      {/* Line Pinggang */}
      <line x1="70" y1="20" x2="170" y2="20" strokeWidth="1.8" strokeDasharray="3 3" className="stroke-blue-500" />
      <circle cx="70" cy="20" r="2.5" className="fill-blue-500" />
      <circle cx="170" cy="20" r="2.5" className="fill-blue-500" />
      <g transform="translate(120, 20)">
        <rect x="-56" y="-10" width="112" height="20" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9px] font-bold">
          Pinggang: {formatRange(dims.waistMinCm, dims.waistMaxCm)}
        </text>
      </g>

      {/* Line Panjang Celana */}
      <line x1="184" y1="28" x2="184" y2="206" strokeWidth="1.8" strokeDasharray="3 3" className="stroke-emerald-500" />
      <circle cx="184" cy="28" r="2.5" className="fill-emerald-500" />
      <circle cx="184" cy="206" r="2.5" className="fill-emerald-500" />
      <g transform="translate(184, 120)">
        <rect x="-42" y="-10" width="84" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line Lingkar Paha */}
      {dims.thighCircumferenceCm && (
        <g transform="translate(94, 98)">
          <rect x="-34" y="-9" width="68" height="18" rx="4" className="fill-neutral-900 stroke-amber-500" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-amber-400 font-mono text-[8.5px] font-bold">
            Paha: {formatVal(dims.thighCircumferenceCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function ShortsDiagram({ dims, formatVal, formatRange = (min, max) => `${min}-${max}` }: DiagramProps) {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto drop-shadow-sm select-none">
      <rect x="68" y="34" width="104" height="16" rx="3" strokeWidth="2" className="stroke-neutral-400 dark:stroke-neutral-500 fill-neutral-800/10" />
      <path d="M 116 50 Q 112 64 106 68" strokeWidth="1.5" strokeLinecap="round" className="stroke-blue-400" />
      <path d="M 124 50 Q 128 64 134 68" strokeWidth="1.5" strokeLinecap="round" className="stroke-blue-400" />

      <path
        d="M 68 50 L 64 154 L 110 154 L 118 100 Q 120 96 122 100 L 130 154 L 176 154 L 172 50"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="64" y1="146" x2="110" y2="146" strokeWidth="1.5" className="stroke-neutral-400/50" />
      <line x1="130" y1="146" x2="176" y2="146" strokeWidth="1.5" className="stroke-neutral-400/50" />

      {/* Line Pinggang */}
      <line x1="68" y1="24" x2="172" y2="24" strokeWidth="1.8" strokeDasharray="3 3" className="stroke-blue-500" />
      <circle cx="68" cy="24" r="2.5" className="fill-blue-500" />
      <circle cx="172" cy="24" r="2.5" className="fill-blue-500" />
      <g transform="translate(120, 24)">
        <rect x="-56" y="-10" width="112" height="20" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9px] font-bold">
          Pinggang: {formatRange(dims.waistMinCm, dims.waistMaxCm)}
        </text>
      </g>

      {/* Line Panjang Celana */}
      <line x1="188" y1="34" x2="188" y2="154" strokeWidth="1.8" strokeDasharray="3 3" className="stroke-emerald-500" />
      <circle cx="188" cy="34" r="2.5" className="fill-emerald-500" />
      <circle cx="188" cy="154" r="2.5" className="fill-emerald-500" />
      <g transform="translate(188, 96)">
        <rect x="-40" y="-10" width="80" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          Pjg {formatVal(dims.bodyLengthCm)}
        </text>
      </g>

      {/* Line Paha */}
      {dims.thighCircumferenceCm && (
        <g transform="translate(87, 126)">
          <rect x="-34" y="-9" width="68" height="18" rx="4" className="fill-neutral-900 stroke-amber-500" strokeWidth="1.2" />
          <text x="0" y="3.5" textAnchor="middle" className="fill-amber-400 font-mono text-[8.5px] font-bold">
            Paha: {formatVal(dims.thighCircumferenceCm)}
          </text>
        </g>
      )}
    </svg>
  );
}

function CapDiagram({ dims, formatVal, formatRange = (min, max) => `${min}-${max}` }: DiagramProps) {
  return (
    <svg viewBox="0 0 260 210" className="w-full h-auto drop-shadow-sm select-none">
      {/* Mahkota Topi 6-Panel Dome */}
      <path
        d="M 64 108 C 70 42, 118 30, 134 30 C 150 30, 198 42, 204 108 Z"
        className="fill-neutral-800/10 dark:fill-neutral-100/5 stroke-neutral-400 dark:stroke-neutral-500"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Kancing Atas (Squatchee) */}
      <circle cx="134" cy="30" r="4" className="fill-blue-500 stroke-neutral-900 stroke-[1]" />

      {/* Garis Panel Topi */}
      <path d="M 134 30 Q 128 70 100 108" strokeWidth="1.4" className="stroke-neutral-400/60" />
      <line x1="134" y1="30" x2="134" y2="108" strokeWidth="1.4" className="stroke-neutral-400/60" />
      <path d="M 134 30 Q 140 70 168 108" strokeWidth="1.4" className="stroke-neutral-400/60" />

      {/* Lubang Ventilasi (Eyelets) */}
      <circle cx="114" cy="68" r="1.8" className="fill-neutral-400/70" />
      <circle cx="134" cy="64" r="1.8" className="fill-neutral-400/70" />
      <circle cx="154" cy="68" r="1.8" className="fill-neutral-400/70" />

      {/* Lidah Topi (Visor Pre-curved) ke Depan-Kiri */}
      <path
        d="M 64 108 C 24 112, 14 128, 40 138 C 76 142, 116 124, 116 112"
        className="fill-neutral-800/15 dark:fill-neutral-100/10 stroke-blue-500"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Jahitan Visor Depan */}
      <path d="M 62 111 C 28 115, 20 126, 42 134 C 74 138, 112 122, 112 112" strokeWidth="1.2" strokeDasharray="2 2" className="stroke-blue-400/70" />
      <path d="M 64 108 Q 134 120 204 108" strokeWidth="1.8" className="stroke-neutral-400/60" />

      {/* 1. Line Lingkar Kepala (Tengah Mahkota, Tidak Menabrak Lidah) */}
      <line x1="64" y1="110" x2="204" y2="110" strokeWidth="1.8" strokeDasharray="3 3" className="stroke-blue-500" />
      <circle cx="64" cy="110" r="2.5" className="fill-blue-500" />
      <circle cx="204" cy="110" r="2.5" className="fill-blue-500" />
      <g transform="translate(134, 96)">
        <rect x="-56" y="-10" width="112" height="20" rx="5" className="fill-neutral-900 stroke-blue-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-white font-mono text-[9px] font-bold">
          Lingkar: {formatRange(dims.headCircumferenceMinCm, dims.headCircumferenceMaxCm)}
        </text>
      </g>

      {/* 2. Line Tinggi Mahkota (Sisi Kanan Bebas) */}
      <line x1="218" y1="30" x2="218" y2="108" strokeWidth="1.8" strokeDasharray="3 3" className="stroke-emerald-500" />
      <circle cx="218" cy="30" r="2.5" className="fill-emerald-500" />
      <circle cx="218" cy="108" r="2.5" className="fill-emerald-500" />
      <g transform="translate(218, 69)">
        <rect x="-40" y="-10" width="80" height="20" rx="5" className="fill-neutral-900 stroke-emerald-500" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" className="fill-emerald-400 font-mono text-[9px] font-bold">
          Tinggi {formatVal(dims.crownHeightCm)}
        </text>
      </g>

      {/* 3. Line Panjang Visor (Terletak Jelas di Bawah Lidah, Tanpa Tabrakan) */}
      <line x1="16" y1="162" x2="94" y2="162" strokeWidth="1.5" strokeDasharray="2 2" className="stroke-amber-500" />
      <circle cx="16" cy="162" r="2" className="fill-amber-500" />
      <circle cx="94" cy="162" r="2" className="fill-amber-500" />
      <g transform="translate(55, 178)">
        <rect x="-38" y="-9" width="76" height="18" rx="4" className="fill-neutral-900 stroke-amber-500" strokeWidth="1.2" />
        <text x="0" y="3.5" textAnchor="middle" className="fill-amber-400 font-mono text-[8.5px] font-bold">
          Visor: {formatVal(dims.visorLengthCm)}
        </text>
      </g>
    </svg>
  );
}

function ApparelVectorBlueprint({
  apparelSlug,
  dims,
  formatVal,
  formatRange,
  activeMetric,
  onSelectMetric,
}: {
  apparelSlug: string;
  dims: GarmentDimensions;
  formatVal: (val: number | undefined) => string;
  formatRange: (min?: number, max?: number) => string;
  activeMetric?: string | null;
  onSelectMetric?: (metric: string | null) => void;
}) {
  let slug = (apparelSlug || "tshirt").toLowerCase().trim();
  if (slug === "tee") slug = "tshirt";
  if (slug === "sweater") slug = "crewneck";

  switch (slug) {
    case "hoodie":
      return <HoodieDiagram dims={dims} formatVal={formatVal} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "longsleeve":
      return <LongsleeveDiagram dims={dims} formatVal={formatVal} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "crewneck":
      return <CrewneckDiagram dims={dims} formatVal={formatVal} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "shirt":
      return <CoachJacketDiagram dims={dims} formatVal={formatVal} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "pants":
      return <PantsDiagram dims={dims} formatVal={formatVal} formatRange={formatRange} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "shorts":
      return <ShortsDiagram dims={dims} formatVal={formatVal} formatRange={formatRange} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "cap":
      return <CapDiagram dims={dims} formatVal={formatVal} formatRange={formatRange} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
    case "tshirt":
    default:
      return <TshirtDiagram dims={dims} formatVal={formatVal} activeMetric={activeMetric} onSelectMetric={onSelectMetric} />;
  }
}

function DiagramLegend({
  category,
  dims,
  activeMetric,
  onHoverMetric,
}: {
  category: "tops" | "bottoms" | "headwear";
  dims: GarmentDimensions;
  activeMetric?: string | null;
  onHoverMetric?: (m: string | null) => void;
}) {
  if (category === "headwear") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 text-[11px] font-mono">
        <span
          onMouseEnter={() => onHoverMetric?.("head")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "head"
              ? "bg-blue-500/20 border-blue-500 text-blue-400 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-blue-400"
          }`}
        >
          Lingkar: Kepala (56-60 cm)
        </span>
        <span
          onMouseEnter={() => onHoverMetric?.("crown")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "crown"
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-emerald-400"
          }`}
        >
          Tinggi: Mahkota
        </span>
        <span
          onMouseEnter={() => onHoverMetric?.("visor")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "visor"
              ? "bg-amber-500/20 border-amber-500 text-amber-400 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-amber-400"
          }`}
        >
          Visor: Lidah Depan
        </span>
      </div>
    );
  }
  if (category === "bottoms") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 text-[11px] font-mono">
        <span
          onMouseEnter={() => onHoverMetric?.("waist")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "waist"
              ? "bg-blue-500/20 border-blue-500 text-blue-400 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-blue-400"
          }`}
        >
          Pinggang: Ban Karet
        </span>
        <span
          onMouseEnter={() => onHoverMetric?.("length")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "length"
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-emerald-400"
          }`}
        >
          Panjang: Celana
        </span>
        {dims.thighCircumferenceCm && (
          <span
            onMouseEnter={() => onHoverMetric?.("thigh")}
            onMouseLeave={() => onHoverMetric?.(null)}
            className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              activeMetric === "thigh"
                ? "bg-amber-500/20 border-amber-500 text-amber-400 font-bold"
                : "bg-neutral-900/40 border-neutral-800 text-amber-400"
            }`}
          >
            Paha: Lingkar Atas
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 text-[11px] font-mono">
      <span
        onMouseEnter={() => onHoverMetric?.("chest")}
        onMouseLeave={() => onHoverMetric?.(null)}
        className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
          activeMetric === "chest"
            ? "bg-blue-500/20 border-blue-500 text-blue-400 font-bold"
            : "bg-neutral-900/40 border-neutral-800 text-blue-400"
        }`}
      >
        A: Lebar Dada
      </span>
      <span
        onMouseEnter={() => onHoverMetric?.("length")}
        onMouseLeave={() => onHoverMetric?.(null)}
        className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
          activeMetric === "length"
            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold"
            : "bg-neutral-900/40 border-neutral-800 text-emerald-400"
        }`}
      >
        B: Panjang Badan
      </span>
      {dims.shoulderWidthCm && (
        <span
          onMouseEnter={() => onHoverMetric?.("shoulder")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "shoulder"
              ? "bg-amber-500/20 border-amber-500 text-amber-400 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-amber-400"
          }`}
        >
          C: Lebar Bahu
        </span>
      )}
      {dims.sleeveLengthCm && (
        <span
          onMouseEnter={() => onHoverMetric?.("sleeve")}
          onMouseLeave={() => onHoverMetric?.(null)}
          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            activeMetric === "sleeve"
              ? "bg-sky-500/20 border-sky-400 text-sky-300 font-bold"
              : "bg-neutral-900/40 border-neutral-800 text-sky-400"
          }`}
        >
          D: Lengan
        </span>
      )}
    </div>
  );
}

export function SizeGuideModal({
  isOpen,
  onClose,
  activeApparel,
  selectedSize,
  onSelectSize,
  drawerPosition = "left",
}: SizeGuideModalProps) {
  const [currentApparelSlug, setCurrentApparelSlug] = useState<string>(activeApparel || "tshirt");
  const [activeGuideTab, setActiveGuideTab] = useState<"garment" | "dtf">("garment");
  const [unitMode, setUnitMode] = useState<"cm" | "inch">("cm");
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  const spec: ApparelSizingSpec = getApparelSizing(currentApparelSlug);
  const [previewSize, setPreviewSize] = useState<string>(selectedSize || "L");

  // Sinkronkan saat prop luar berubah
  useEffect(() => {
    if (activeApparel) setCurrentApparelSlug(activeApparel);
  }, [activeApparel]);

  useEffect(() => {
    if (selectedSize) setPreviewSize(selectedSize);
  }, [selectedSize]);

  if (!isOpen) return null;

  const currentDims = getSizeDimensions(currentApparelSlug, previewSize);

  // Helper konversi cm ke inch bila dipilih
  const formatVal = (cmVal: number | undefined): string => {
    if (cmVal === undefined || cmVal === null) return "—";
    if (unitMode === "inch") {
      return `${(cmVal / 2.54).toFixed(1)}"`;
    }
    return `${cmVal} cm`;
  };

  const formatRange = (minCm?: number, maxCm?: number): string => {
    if (minCm === undefined || maxCm === undefined) return "—";
    if (unitMode === "inch") {
      return `${(minCm / 2.54).toFixed(1)}" - ${(maxCm / 2.54).toFixed(1)}"`;
    }
    return `${minCm} - ${maxCm} cm`;
  };

  const guideBody = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-sm">
              <Ruler size={18} />
            </div>
            <div>
              <h2 id="size-guide-title" className="text-sm sm:text-base font-bold text-white tracking-tight uppercase">
                Panduan Ukuran Fisik &amp; Skala DTF
              </h2>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {spec.displayName} • Standar Konveksi Makassar ({spec.toleranceCm})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Unit Toggle: CM vs INCH */}
            <div className="flex items-center rounded-xl bg-neutral-950 border border-neutral-800 p-0.5 text-[11px] font-mono font-bold">
              <button
                type="button"
                onClick={() => setUnitMode("cm")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  unitMode === "cm"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                CM
              </button>
              <button
                type="button"
                onClick={() => setUnitMode("inch")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  unitMode === "inch"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                INCH
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panduan ukuran"
              className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Apparel Switcher Tabs (8 Apparels) */}
        <div className="px-6 py-2.5 border-b border-neutral-800 bg-neutral-950/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {APPAREL_TABS.map((tab) => {
            const isSelected = (currentApparelSlug || "").toLowerCase() === tab.slug;
            return (
              <button
                key={tab.slug}
                type="button"
                onClick={() => setCurrentApparelSlug(tab.slug)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sub-Tabs: Garment Sizing vs DTF Print Scale */}
        <div className="px-6 pt-3 pb-1 flex items-center gap-4 border-b border-neutral-800 shrink-0 bg-neutral-900/60">
          <button
            type="button"
            onClick={() => setActiveGuideTab("garment")}
            className={`pb-2.5 font-mono text-xs font-bold transition-all relative cursor-pointer ${
              activeGuideTab === "garment"
                ? "text-blue-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>DIMENSI PAKAIAN (SIZE CHART)</span>
            {activeGuideTab === "garment" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveGuideTab("dtf")}
            className={`pb-2.5 font-mono text-xs font-bold transition-all relative cursor-pointer ${
              activeGuideTab === "dtf"
                ? "text-blue-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>STANDAR UKURAN SABLON (DTF SCALE)</span>
            {activeGuideTab === "dtf" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeGuideTab === "garment" ? (
            <>
              {/* Quick Size Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    PILIH UKURAN:
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                    {previewSize}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {spec.sizeList.map((sz) => {
                    const isActive = previewSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setPreviewSize(sz);
                          onSelectSize(sz);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Blueprint & Live Highlight Specs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {/* Left: Vector Silhouette Blueprint (Technical Flat) */}
                <div className="md:col-span-5 p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex flex-col items-center justify-between relative overflow-hidden">
                  <div className="w-full flex items-center justify-between text-[11px] font-sans font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/60 pb-2">
                    <span>DIAGRAM FISIK ({previewSize})</span>
                    <span className="text-blue-400 font-mono text-[10px]">Scale 1:1 Presisi</span>
                  </div>

                  {/* Technical Flat Vector Graphics */}
                  <div className="w-full max-w-[220px] py-3 flex items-center justify-center">
                    <ApparelVectorBlueprint
                      apparelSlug={currentApparelSlug}
                      dims={currentDims}
                      formatVal={formatVal}
                      formatRange={formatRange}
                      activeMetric={activeMetric}
                      onSelectMetric={setActiveMetric}
                    />
                  </div>

                  {/* Diagram Legend Key */}
                  <DiagramLegend
                    category={spec.category}
                    dims={currentDims}
                    activeMetric={activeMetric}
                    onHoverMetric={setActiveMetric}
                  />

                  <div className="w-full mt-3 pt-2.5 border-t border-neutral-800/80 text-center font-mono text-[11px] text-neutral-400">
                    Standar Fitting: Regular Indonesian Streetwear Fit
                  </div>
                </div>

                {/* Right: Dimension Table & Measurement Guide */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/50">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-900 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Size</th>
                          {spec.category === "tops" && (
                            <>
                              <th
                                onMouseEnter={() => setActiveMetric("chest")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "chest" ? "text-blue-400 bg-blue-500/10" : ""
                                }`}
                              >
                                Lebar Dada
                              </th>
                              <th className="py-2.5 px-3">Lingkar</th>
                              <th
                                onMouseEnter={() => setActiveMetric("length")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "length" ? "text-emerald-400 bg-emerald-500/10" : ""
                                }`}
                              >
                                Panjang
                              </th>
                              <th
                                onMouseEnter={() => setActiveMetric("shoulder")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "shoulder" ? "text-amber-400 bg-amber-500/10" : ""
                                }`}
                              >
                                Bahu
                              </th>
                              <th
                                onMouseEnter={() => setActiveMetric("sleeve")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "sleeve" ? "text-sky-400 bg-sky-500/10" : ""
                                }`}
                              >
                                Lengan
                              </th>
                            </>
                          )}
                          {spec.category === "bottoms" && (
                            <>
                              <th
                                onMouseEnter={() => setActiveMetric("waist")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "waist" ? "text-blue-400 bg-blue-500/10" : ""
                                }`}
                              >
                                Pinggang
                              </th>
                              <th
                                onMouseEnter={() => setActiveMetric("length")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "length" ? "text-emerald-400 bg-emerald-500/10" : ""
                                }`}
                              >
                                Panjang
                              </th>
                              <th
                                onMouseEnter={() => setActiveMetric("thigh")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "thigh" ? "text-amber-400 bg-amber-500/10" : ""
                                }`}
                              >
                                Paha
                              </th>
                            </>
                          )}
                          {spec.category === "headwear" && (
                            <>
                              <th
                                onMouseEnter={() => setActiveMetric("head")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "head" ? "text-blue-400 bg-blue-500/10" : ""
                                }`}
                              >
                                Lingkar Kepala
                              </th>
                              <th
                                onMouseEnter={() => setActiveMetric("crown")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "crown" ? "text-emerald-400 bg-emerald-500/10" : ""
                                }`}
                              >
                                Tinggi
                              </th>
                              <th
                                onMouseEnter={() => setActiveMetric("visor")}
                                onMouseLeave={() => setActiveMetric(null)}
                                className={`py-2.5 px-3 cursor-pointer transition-colors ${
                                  activeMetric === "visor" ? "text-amber-400 bg-amber-500/10" : ""
                                }`}
                              >
                                Visor
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800 text-[11px]">
                        {spec.sizeList.map((sz) => {
                          const d = spec.dimensions[sz];
                          if (!d) return null;
                          const isCurrent = previewSize === sz;
                          return (
                            <tr
                              key={sz}
                              onClick={() => {
                                setPreviewSize(sz);
                                onSelectSize(sz);
                              }}
                              className={`transition-colors cursor-pointer ${
                                isCurrent
                                  ? "bg-blue-600/15 text-blue-300 font-bold"
                                  : "hover:bg-neutral-800/50 text-neutral-300"
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold flex items-center gap-1.5">
                                {isCurrent && <Check size={12} className="text-blue-400 stroke-[3]" />}
                                <span>{sz}</span>
                              </td>
                              {spec.category === "tops" && (
                                <>
                                  <td className={`py-2.5 px-3 ${activeMetric === "chest" ? "bg-blue-500/10 text-blue-400 font-bold" : ""}`}>
                                    {formatVal(d.chestWidthCm)}
                                  </td>
                                  <td className="py-2.5 px-3 text-neutral-500">{formatVal(d.chestCircumferenceCm)}</td>
                                  <td className={`py-2.5 px-3 ${activeMetric === "length" ? "bg-emerald-500/10 text-emerald-400 font-bold" : ""}`}>
                                    {formatVal(d.bodyLengthCm)}
                                  </td>
                                  <td className="py-2.5 px-3 text-neutral-500">{formatVal(d.shoulderWidthCm)}</td>
                                  <td className="py-2.5 px-3 text-sky-400 font-semibold">{formatVal(d.sleeveLengthCm)}</td>
                                </>
                              )}
                              {spec.category === "bottoms" && (
                                <>
                                  <td className={`py-2.5 px-3 ${activeMetric === "waist" ? "bg-blue-500/10 text-blue-400 font-bold" : ""}`}>
                                    {formatRange(d.waistMinCm, d.waistMaxCm)}
                                  </td>
                                  <td className={`py-2.5 px-3 ${activeMetric === "length" ? "bg-emerald-500/10 text-emerald-400 font-bold" : ""}`}>
                                    {formatVal(d.bodyLengthCm)}
                                  </td>
                                  <td className="py-2.5 px-3 text-neutral-500">{formatVal(d.thighCircumferenceCm)}</td>
                                </>
                              )}
                              {spec.category === "headwear" && (
                                <>
                                  <td className={`py-2.5 px-3 ${activeMetric === "head" ? "bg-blue-500/10 text-blue-400 font-bold" : ""}`}>
                                    {formatRange(d.headCircumferenceMinCm, d.headCircumferenceMaxCm)}
                                  </td>
                                  <td className={`py-2.5 px-3 ${activeMetric === "crown" ? "bg-emerald-500/10 text-emerald-400 font-bold" : ""}`}>
                                    {formatVal(d.crownHeightCm)}
                                  </td>
                                  <td className="py-2.5 px-3 text-neutral-500">{formatVal(d.visorLengthCm)}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cara Mengukur Pakaian Sendiri */}
                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                      <Info size={14} className="text-blue-400" />
                      <span>CARA MENGUKUR PAKAIAN SENDIRI:</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-neutral-400 font-sans leading-relaxed">
                      {spec.measuringGuide.map((g, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-mono font-bold text-blue-400 shrink-0">{idx + 1}.</span>
                          <span>
                            <strong className="text-neutral-200">{g.point}:</strong> {g.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tab DTF Print Scale Guide */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Maximize2 size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-sans font-bold text-white uppercase tracking-tight">
                    Standar Kalibrasi DTF Kaos Kami (Presisi 1:1 Skala Centimeter)
                  </h4>
                  <p className="text-neutral-300 leading-relaxed font-sans">
                    Seluruh desain yang Anda tempel di 3D Studio ditampilkan dalam ukuran fisik asli centimeter dunia nyata. 
                    Lebar maksimum cetak dibatasi secara aman pada <strong>30.0 cm</strong> (batas DTF kami) 
                    agar sablon tidak terpotong jahitan samping dan tahan dicuci berulang kali.
                  </p>
                </div>
              </div>

              {/* Grid 4 Print Tiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {DTF_PRINT_TIERS.map((tier) => (
                  <div
                    key={tier.tier}
                    className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-2 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400 uppercase">
                        {tier.tier}
                      </span>
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700">
                        {tier.sizeCm}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-sans leading-snug">
                      <strong className="text-white">Penempatan:</strong> {tier.usage}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-sans leading-snug">
                      <strong className="text-neutral-300">Saran Desain:</strong> {tier.recommended}
                    </p>
                  </div>
                ))}
              </div>

              {/* Jarak Kerah Standar */}
              <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2.5 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Layers size={14} className="text-blue-400" />
                  <span>STANDAR POSISI DARI KERAH (COLLAR BASELINE):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] font-sans">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="font-mono font-bold text-white block">Saku Dada Kiri</span>
                    <span className="text-neutral-400">7.0 - 9.0 cm dari kerah</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="font-mono font-bold text-white block">Dada Tengah (A4/A3)</span>
                    <span className="text-neutral-400">5.0 - 7.5 cm dari kerah</span>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="font-mono font-bold text-white block">Punggung Belakang</span>
                    <span className="text-neutral-400">10.0 - 12.0 cm dari kerah</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-neutral-800 bg-neutral-950/90 flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-neutral-400">
            Ukuran aktif: <strong className="text-blue-400">{previewSize}</strong> ({spec.displayName.split(" ")[0]})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            TERAPKAN &amp; KEMBALI
          </button>
        </div>
      </>
    );

  return (
    <>
      {/* DESKTOP (md+): DOCKED SIDE PANEL NEXT TO APPAREL DRAWER — 3D CANVAS IS 100% VISIBLE & ACTIVE */}
      <aside
        aria-label="Panduan Ukuran Fisik"
        className={`fixed top-[68px] bottom-4 z-[95] w-full max-w-[460px] hidden md:flex flex-col transition-all duration-300 ease-out pointer-events-auto ${
          drawerPosition === "right"
            ? "right-[calc(385px+1.5rem)]"
            : "left-[calc(385px+1.5rem)]"
        }`}
      >
        <div className="w-full h-full flex flex-col rounded-3xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden font-sans text-neutral-100 animate-in slide-in-from-left-4 duration-200">
          {guideBody}
        </div>
      </aside>

      {/* MOBILE (<md): SMOOTH BOTTOM SHEET OVERLAY */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="md:hidden fixed inset-0 z-[120] flex items-end justify-center bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="relative w-full max-h-[88vh] flex flex-col rounded-t-3xl bg-neutral-900 border-t border-neutral-800 shadow-2xl overflow-hidden font-sans text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          {guideBody}
        </div>
      </div>
    </>
  );
}
