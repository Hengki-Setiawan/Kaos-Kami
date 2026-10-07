"use client";

import React, { useState } from "react";
import { X, Ruler, Check, Info, Layers, Maximize2 } from "lucide-react";
import {
  getApparelSizing,
  getSizeDimensions,
  APPAREL_SIZING_DATA,
  type ApparelSizingSpec,
  type GarmentDimensions,
} from "@/lib/apparelSizing";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeApparel: string;
  selectedSize: string;
  onSelectSize: (size: string) => void;
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

// --- 8 SPECIALIZED APPAREL VECTOR BLUEPRINT SILHOUETTES ---

function TshirtDiagram({ dims, formatVal }: { dims: GarmentDimensions; formatVal: (v?: number) => string }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <path
        d="M 68 32 Q 100 45 132 32 L 168 54 L 186 86 L 154 98 L 140 78 L 140 198 L 60 198 L 60 78 L 46 98 L 14 86 L 32 54 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <path d="M 68 32 Q 100 24 132 32 Q 100 45 68 32 Z" strokeWidth="1.5" className="text-text-primary/50" />
      <line x1="46" y1="74" x2="32" y2="54" strokeWidth="1.5" strokeDasharray="2 2" className="text-text-primary/40" />
      <line x1="154" y1="74" x2="168" y2="54" strokeWidth="1.5" strokeDasharray="2 2" className="text-text-primary/40" />

      {/* Line A: Lebar Dada */}
      <line x1="60" y1="102" x2="140" y2="102" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="60" cy="102" r="2.5" className="fill-brand-accent" />
      <circle cx="140" cy="102" r="2.5" className="fill-brand-accent" />
      <text x="100" y="97" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        A: {formatVal(dims.chestWidthCm)}
      </text>

      {/* Line B: Panjang Badan */}
      <line x1="148" y1="34" x2="148" y2="198" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="148" cy="34" r="2.5" className="fill-emerald-500" />
      <circle cx="148" cy="198" r="2.5" className="fill-emerald-500" />
      <text x="174" y="120" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 174 120)">
        B: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line C: Lebar Bahu */}
      {dims.shoulderWidthCm && (
        <>
          <line x1="68" y1="23" x2="132" y2="23" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <text x="100" y="18" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            C: {formatVal(dims.shoulderWidthCm)}
          </text>
        </>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <>
          <line x1="168" y1="52" x2="188" y2="86" strokeWidth="1.5" strokeDasharray="2 2" className="text-sky-400" />
          <circle cx="168" cy="52" r="2" className="fill-sky-400" />
          <circle cx="188" cy="86" r="2" className="fill-sky-400" />
          <text x="194" y="70" textAnchor="start" fontSize="9" className="fill-sky-400 font-mono font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function HoodieDiagram({ dims, formatVal }: { dims: GarmentDimensions; formatVal: (v?: number) => string }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto text-brand-accent stroke-current fill-none">
      {/* Tudung / Hood */}
      <path
        d="M 68 50 C 58 20 74 8 100 8 C 126 8 142 20 132 50"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-text-primary/80"
      />
      {/* Tali Hoodie */}
      <path d="M 93 52 L 93 78" strokeWidth="1.5" strokeLinecap="round" className="text-brand-accent/70" />
      <path d="M 107 52 L 107 78" strokeWidth="1.5" strokeLinecap="round" className="text-brand-accent/70" />
      <circle cx="93" cy="79" r="1.5" className="fill-brand-accent" />
      <circle cx="107" cy="79" r="1.5" className="fill-brand-accent" />

      {/* Badan & Lengan Drop Shoulder */}
      <path
        d="M 68 50 L 30 60 L 14 154 L 34 158 L 56 94 L 56 198 L 144 198 L 144 94 L 166 158 L 186 154 L 170 60 L 132 50 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      {/* Rib Pinggang Bawah */}
      <line x1="56" y1="186" x2="144" y2="186" strokeWidth="1.5" className="text-text-primary/40" />
      {/* Rib Manset Lengan */}
      <line x1="14" y1="145" x2="34" y2="149" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="186" y1="145" x2="166" y2="149" strokeWidth="1.5" className="text-text-primary/40" />

      {/* Saku Kanguru */}
      <path
        d="M 72 150 L 128 150 L 136 182 L 64 182 Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="text-brand-accent/50"
      />

      {/* Line A: Lebar Dada */}
      <line x1="56" y1="112" x2="144" y2="112" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="56" cy="112" r="2.5" className="fill-brand-accent" />
      <circle cx="144" cy="112" r="2.5" className="fill-brand-accent" />
      <text x="100" y="106" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        A: {formatVal(dims.chestWidthCm)}
      </text>

      {/* Line B: Panjang Badan */}
      <line x1="150" y1="50" x2="150" y2="198" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="150" cy="50" r="2.5" className="fill-emerald-500" />
      <circle cx="150" cy="198" r="2.5" className="fill-emerald-500" />
      <text x="174" y="125" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 174 125)">
        B: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line C: Bahu Drop */}
      {dims.shoulderWidthCm && (
        <>
          <line x1="30" y1="42" x2="170" y2="42" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <text x="100" y="37" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            C: {formatVal(dims.shoulderWidthCm)}
          </text>
        </>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <>
          <line x1="172" y1="62" x2="188" y2="154" strokeWidth="1.5" strokeDasharray="2 2" className="text-sky-400" />
          <circle cx="172" cy="62" r="2" className="fill-sky-400" />
          <circle cx="188" cy="154" r="2" className="fill-sky-400" />
          <text x="194" y="110" textAnchor="start" fontSize="9" className="fill-sky-400 font-mono font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function LongsleeveDiagram({ dims, formatVal }: { dims: GarmentDimensions; formatVal: (v?: number) => string }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <path
        d="M 68 32 Q 100 45 132 32 L 162 48 L 182 160 L 164 163 L 140 78 L 140 198 L 60 198 L 60 78 L 36 163 L 18 160 L 38 48 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <path d="M 68 32 Q 100 24 132 32 Q 100 45 68 32 Z" strokeWidth="1.5" className="text-text-primary/50" />
      <line x1="18" y1="150" x2="36" y2="153" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="182" y1="150" x2="164" y2="153" strokeWidth="1.5" className="text-text-primary/40" />

      {/* Line A: Lebar Dada */}
      <line x1="60" y1="100" x2="140" y2="100" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="60" cy="100" r="2.5" className="fill-brand-accent" />
      <circle cx="140" cy="100" r="2.5" className="fill-brand-accent" />
      <text x="100" y="94" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        A: {formatVal(dims.chestWidthCm)}
      </text>

      {/* Line B: Panjang Badan */}
      <line x1="148" y1="34" x2="148" y2="198" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="148" cy="34" r="2.5" className="fill-emerald-500" />
      <circle cx="148" cy="198" r="2.5" className="fill-emerald-500" />
      <text x="174" y="120" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 174 120)">
        B: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line C: Lebar Bahu */}
      {dims.shoulderWidthCm && (
        <>
          <line x1="68" y1="22" x2="132" y2="22" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <text x="100" y="17" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            C: {formatVal(dims.shoulderWidthCm)}
          </text>
        </>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <>
          <line x1="166" y1="50" x2="184" y2="158" strokeWidth="1.5" strokeDasharray="2 2" className="text-sky-400" />
          <circle cx="166" cy="50" r="2" className="fill-sky-400" />
          <circle cx="184" cy="158" r="2" className="fill-sky-400" />
          <text x="190" y="105" textAnchor="start" fontSize="9" className="fill-sky-400 font-mono font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function CrewneckDiagram({ dims, formatVal }: { dims: GarmentDimensions; formatVal: (v?: number) => string }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <path
        d="M 68 34 Q 100 48 132 34 L 168 52 L 186 158 L 166 162 L 142 86 L 142 198 L 58 198 L 58 86 L 34 162 L 14 158 L 32 52 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <path d="M 68 34 Q 100 22 132 34 Q 100 48 68 34 Z" strokeWidth="2" className="text-brand-accent/50" />
      <line x1="58" y1="184" x2="142" y2="184" strokeWidth="2" className="text-brand-accent/50" />
      <line x1="14" y1="146" x2="34" y2="150" strokeWidth="2" className="text-brand-accent/50" />
      <line x1="186" y1="146" x2="166" y2="150" strokeWidth="2" className="text-brand-accent/50" />

      {/* Line A: Lebar Dada */}
      <line x1="58" y1="108" x2="142" y2="108" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="58" cy="108" r="2.5" className="fill-brand-accent" />
      <circle cx="142" cy="108" r="2.5" className="fill-brand-accent" />
      <text x="100" y="102" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        A: {formatVal(dims.chestWidthCm)}
      </text>

      {/* Line B: Panjang Badan */}
      <line x1="150" y1="36" x2="150" y2="198" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="150" cy="36" r="2.5" className="fill-emerald-500" />
      <circle cx="150" cy="198" r="2.5" className="fill-emerald-500" />
      <text x="174" y="122" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 174 122)">
        B: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line C: Lebar Bahu */}
      {dims.shoulderWidthCm && (
        <>
          <line x1="32" y1="26" x2="168" y2="26" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <text x="100" y="21" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            C: {formatVal(dims.shoulderWidthCm)}
          </text>
        </>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <>
          <line x1="172" y1="54" x2="188" y2="156" strokeWidth="1.5" strokeDasharray="2 2" className="text-sky-400" />
          <circle cx="172" cy="54" r="2" className="fill-sky-400" />
          <circle cx="188" cy="156" r="2" className="fill-sky-400" />
          <text x="192" y="108" textAnchor="start" fontSize="9" className="fill-sky-400 font-mono font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function CoachJacketDiagram({ dims, formatVal }: { dims: GarmentDimensions; formatVal: (v?: number) => string }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <path d="M 72 38 L 64 56 L 98 48 Z" strokeWidth="2" className="text-brand-accent/80 fill-surface/50" />
      <path d="M 128 38 L 136 56 L 102 48 Z" strokeWidth="2" className="text-brand-accent/80 fill-surface/50" />
      <path d="M 72 38 Q 100 32 128 38" strokeWidth="2" className="text-text-primary/70" />

      <path
        d="M 72 38 L 34 52 L 16 160 L 34 164 L 60 80 L 60 198 L 140 198 L 140 80 L 166 164 L 184 160 L 166 52 L 128 38 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <line x1="100" y1="48" x2="100" y2="198" strokeWidth="1.8" className="text-text-primary/50" />
      {[72, 102, 132, 162, 188].map((yVal) => (
        <circle key={yVal} cx="100" cy={yVal} r="2.5" className="fill-brand-accent stroke-surface stroke-[1]" />
      ))}
      <line x1="68" y1="146" x2="80" y2="168" strokeWidth="2" className="text-text-primary/50" />
      <line x1="132" y1="146" x2="120" y2="168" strokeWidth="2" className="text-text-primary/50" />

      {/* Line A: Lebar Dada */}
      <line x1="60" y1="102" x2="140" y2="102" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="60" cy="102" r="2.5" className="fill-brand-accent" />
      <circle cx="140" cy="102" r="2.5" className="fill-brand-accent" />
      <text x="100" y="96" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        A: {formatVal(dims.chestWidthCm)}
      </text>

      {/* Line B: Panjang Badan */}
      <line x1="148" y1="36" x2="148" y2="198" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="148" cy="36" r="2.5" className="fill-emerald-500" />
      <circle cx="148" cy="198" r="2.5" className="fill-emerald-500" />
      <text x="174" y="122" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 174 122)">
        B: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line C: Lebar Bahu */}
      {dims.shoulderWidthCm && (
        <>
          <line x1="34" y1="26" x2="166" y2="26" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <text x="100" y="21" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            C: {formatVal(dims.shoulderWidthCm)}
          </text>
        </>
      )}

      {/* Line D: Panjang Lengan */}
      {dims.sleeveLengthCm && (
        <>
          <line x1="168" y1="54" x2="186" y2="160" strokeWidth="1.5" strokeDasharray="2 2" className="text-sky-400" />
          <circle cx="168" cy="54" r="2" className="fill-sky-400" />
          <circle cx="186" cy="160" r="2" className="fill-sky-400" />
          <text x="190" y="108" textAnchor="start" fontSize="9" className="fill-sky-400 font-mono font-bold">
            D: {formatVal(dims.sleeveLengthCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function PantsDiagram({
  dims,
  formatVal,
  formatRange,
}: {
  dims: GarmentDimensions;
  formatVal: (v?: number) => string;
  formatRange: (min?: number, max?: number) => string;
}) {
  return (
    <svg viewBox="0 0 200 220" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <rect x="56" y="26" width="88" height="12" rx="2" strokeWidth="2" className="text-text-primary/70" />
      <path d="M 97 38 Q 94 54 88 58" strokeWidth="1.5" strokeLinecap="round" className="text-brand-accent/80" />
      <path d="M 103 38 Q 106 54 112 58" strokeWidth="1.5" strokeLinecap="round" className="text-brand-accent/80" />
      <line x1="58" y1="48" x2="74" y2="72" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="142" y1="48" x2="126" y2="72" strokeWidth="1.5" className="text-text-primary/40" />

      <path
        d="M 56 38 L 58 95 L 66 196 L 86 196 L 97 108 Q 100 104 103 108 L 114 196 L 134 196 L 142 95 L 144 38"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <line x1="66" y1="186" x2="86" y2="186" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="114" y1="186" x2="134" y2="186" strokeWidth="1.5" className="text-text-primary/40" />

      {/* Line Pinggang */}
      <line x1="56" y1="20" x2="144" y2="20" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="56" cy="20" r="2.5" className="fill-brand-accent" />
      <circle cx="144" cy="20" r="2.5" className="fill-brand-accent" />
      <text x="100" y="15" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        Pinggang: {formatRange(dims.waistMinCm, dims.waistMaxCm)}
      </text>

      {/* Line Panjang Celana */}
      <line x1="156" y1="26" x2="156" y2="196" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="156" cy="26" r="2.5" className="fill-emerald-500" />
      <circle cx="156" cy="196" r="2.5" className="fill-emerald-500" />
      <text x="180" y="115" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 180 115)">
        Panjang: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line Lingkar Paha */}
      {dims.thighCircumferenceCm && (
        <>
          <line x1="58" y1="95" x2="98" y2="95" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <circle cx="58" cy="95" r="2" className="fill-amber-500" />
          <circle cx="98" cy="95" r="2" className="fill-amber-500" />
          <text x="78" y="90" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            Paha: {formatVal(dims.thighCircumferenceCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function ShortsDiagram({
  dims,
  formatVal,
  formatRange,
}: {
  dims: GarmentDimensions;
  formatVal: (v?: number) => string;
  formatRange: (min?: number, max?: number) => string;
}) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <rect x="54" y="30" width="92" height="14" rx="2" strokeWidth="2" className="text-text-primary/70" />
      <path d="M 97 44 Q 94 60 88 64" strokeWidth="1.5" strokeLinecap="round" className="text-brand-accent/80" />
      <path d="M 103 44 Q 106 60 112 64" strokeWidth="1.5" strokeLinecap="round" className="text-brand-accent/80" />
      <line x1="56" y1="52" x2="72" y2="76" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="144" y1="52" x2="128" y2="76" strokeWidth="1.5" className="text-text-primary/40" />

      <path
        d="M 54 44 L 50 142 L 94 142 L 100 92 L 106 142 L 150 142 L 146 44"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <line x1="50" y1="134" x2="94" y2="134" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="106" y1="134" x2="150" y2="134" strokeWidth="1.5" className="text-text-primary/40" />

      {/* Line Pinggang */}
      <line x1="54" y1="22" x2="146" y2="22" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="54" cy="22" r="2.5" className="fill-brand-accent" />
      <circle cx="146" cy="22" r="2.5" className="fill-brand-accent" />
      <text x="100" y="17" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        Pinggang: {formatRange(dims.waistMinCm, dims.waistMaxCm)}
      </text>

      {/* Line Panjang Celana */}
      <line x1="160" y1="30" x2="160" y2="142" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="160" cy="30" r="2.5" className="fill-emerald-500" />
      <circle cx="160" cy="142" r="2.5" className="fill-emerald-500" />
      <text x="180" y="88" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 180 88)">
        Panjang: {formatVal(dims.bodyLengthCm)}
      </text>

      {/* Line Lingkar Paha */}
      {dims.thighCircumferenceCm && (
        <>
          <line x1="50" y1="118" x2="94" y2="118" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
          <circle cx="50" cy="118" r="2" className="fill-amber-500" />
          <circle cx="94" cy="118" r="2" className="fill-amber-500" />
          <text x="72" y="112" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
            Paha: {formatVal(dims.thighCircumferenceCm)}
          </text>
        </>
      )}
    </svg>
  );
}

function CapDiagram({
  dims,
  formatVal,
  formatRange,
}: {
  dims: GarmentDimensions;
  formatVal: (v?: number) => string;
  formatRange: (min?: number, max?: number) => string;
}) {
  return (
    <svg viewBox="0 0 200 170" className="w-full h-auto text-brand-accent stroke-current fill-none">
      <path
        d="M 38 112 C 42 42, 90 32, 100 32 C 110 32, 158 42, 162 112 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="text-text-primary/70"
      />
      <circle cx="100" cy="32" r="3.5" className="fill-brand-accent stroke-surface stroke-[1]" />

      <path d="M 100 32 Q 96 74 72 112" strokeWidth="1.5" className="text-text-primary/40" />
      <path d="M 100 32 Q 104 74 128 112" strokeWidth="1.5" className="text-text-primary/40" />
      <line x1="100" y1="32" x2="100" y2="112" strokeWidth="1.5" className="text-text-primary/40" />

      <circle cx="82" cy="72" r="1.5" className="fill-text-primary/60" />
      <circle cx="100" cy="68" r="1.5" className="fill-text-primary/60" />
      <circle cx="118" cy="72" r="1.5" className="fill-text-primary/60" />

      <path
        d="M 36 112 C 8 116, 4 130, 26 138 C 62 140, 94 124, 94 112"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-brand-accent"
      />
      <path d="M 38 112 Q 100 122 162 112" strokeWidth="2" className="text-text-primary/50" />

      {/* Line Lingkar Kepala */}
      <line x1="38" y1="126" x2="162" y2="126" strokeWidth="2" strokeDasharray="3 3" className="text-brand-accent" />
      <circle cx="38" cy="126" r="2.5" className="fill-brand-accent" />
      <circle cx="162" cy="126" r="2.5" className="fill-brand-accent" />
      <text x="100" y="142" textAnchor="middle" fontSize="10" className="fill-brand-accent font-mono font-bold">
        Lingkar: {formatRange(dims.headCircumferenceMinCm, dims.headCircumferenceMaxCm)}
      </text>

      {/* Line Tinggi Mahkota */}
      <line x1="172" y1="32" x2="172" y2="112" strokeWidth="2" strokeDasharray="3 3" className="text-emerald-500" />
      <circle cx="172" cy="32" r="2.5" className="fill-emerald-500" />
      <circle cx="172" cy="112" r="2.5" className="fill-emerald-500" />
      <text x="188" y="75" textAnchor="middle" fontSize="10" className="fill-emerald-500 font-mono font-bold" transform="rotate(90 188 75)">
        Tinggi: {formatVal(dims.crownHeightCm)}
      </text>

      {/* Line Panjang Visor */}
      <line x1="10" y1="150" x2="80" y2="150" strokeWidth="1.5" strokeDasharray="2 2" className="text-amber-500" />
      <circle cx="10" cy="150" r="2" className="fill-amber-500" />
      <circle cx="80" cy="150" r="2" className="fill-amber-500" />
      <text x="45" y="162" textAnchor="middle" fontSize="9" className="fill-amber-500 font-mono font-bold">
        Visor: {formatVal(dims.visorLengthCm)}
      </text>
    </svg>
  );
}

function ApparelVectorBlueprint({
  apparelSlug,
  dims,
  formatVal,
  formatRange,
}: {
  apparelSlug: string;
  dims: GarmentDimensions;
  formatVal: (val: number | undefined) => string;
  formatRange: (min?: number, max?: number) => string;
}) {
  let slug = (apparelSlug || "tshirt").toLowerCase().trim();
  if (slug === "tee") slug = "tshirt";
  if (slug === "sweater") slug = "crewneck";

  switch (slug) {
    case "hoodie":
      return <HoodieDiagram dims={dims} formatVal={formatVal} />;
    case "longsleeve":
      return <LongsleeveDiagram dims={dims} formatVal={formatVal} />;
    case "crewneck":
      return <CrewneckDiagram dims={dims} formatVal={formatVal} />;
    case "shirt":
      return <CoachJacketDiagram dims={dims} formatVal={formatVal} />;
    case "pants":
      return <PantsDiagram dims={dims} formatVal={formatVal} formatRange={formatRange} />;
    case "shorts":
      return <ShortsDiagram dims={dims} formatVal={formatVal} formatRange={formatRange} />;
    case "cap":
      return <CapDiagram dims={dims} formatVal={formatVal} formatRange={formatRange} />;
    case "tshirt":
    default:
      return <TshirtDiagram dims={dims} formatVal={formatVal} />;
  }
}

function DiagramLegend({ category, dims }: { category: "tops" | "bottoms" | "headwear"; dims: GarmentDimensions }) {
  if (category === "headwear") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[10px] font-mono">
        <span className="text-brand-accent font-semibold">Lingkar: Kepala</span>
        <span className="text-emerald-500 font-semibold">Tinggi: Mahkota</span>
        <span className="text-amber-500 font-semibold">Visor: Lidah Depan</span>
      </div>
    );
  }
  if (category === "bottoms") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[10px] font-mono">
        <span className="text-brand-accent font-semibold">Pinggang: Ban Karet</span>
        <span className="text-emerald-500 font-semibold">Panjang: Celana</span>
        {dims.thighCircumferenceCm && <span className="text-amber-500 font-semibold">Paha: Lebar Atas</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[10px] font-mono">
      <span className="text-brand-accent font-semibold">A: Lebar Dada</span>
      <span className="text-emerald-500 font-semibold">B: Panjang Badan</span>
      {dims.shoulderWidthCm && <span className="text-amber-500 font-semibold">C: Bahu</span>}
      {dims.sleeveLengthCm && <span className="text-sky-400 font-semibold">D: Lengan</span>}
    </div>
  );
}

export function SizeGuideModal({
  isOpen,
  onClose,
  activeApparel,
  selectedSize,
  onSelectSize,
}: SizeGuideModalProps) {
  const [currentApparelSlug, setCurrentApparelSlug] = useState<string>(activeApparel || "tshirt");
  const [activeGuideTab, setActiveGuideTab] = useState<"garment" | "dtf">("garment");
  const [unitMode, setUnitMode] = useState<"cm" | "inch">("cm");

  const spec: ApparelSizingSpec = getApparelSizing(currentApparelSlug);
  const [previewSize, setPreviewSize] = useState<string>(selectedSize || "L");

  // Sinkronkan saat prop luar berubah
  React.useEffect(() => {
    if (activeApparel) setCurrentApparelSlug(activeApparel);
  }, [activeApparel]);

  React.useEffect(() => {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-surface border border-border-subtle shadow-2xl overflow-hidden font-sans text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-border-subtle bg-surface/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent flex items-center justify-center">
              <Ruler size={16} />
            </div>
            <div>
              <h2 id="size-guide-title" className="text-sm sm:text-base font-bold font-sans tracking-tight uppercase">
                Panduan Ukuran Fisik & Skala DTF
              </h2>
              <p className="text-[11px] text-text-muted font-mono">
                {spec.displayName} • Standar Konveksi Makassar ({spec.toleranceCm})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unit Toggle: CM vs INCH */}
            <div className="flex items-center rounded-xl bg-canvas border border-border-subtle p-0.5 text-[10px] font-mono font-bold">
              <button
                type="button"
                onClick={() => setUnitMode("cm")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  unitMode === "cm"
                    ? "bg-text-primary text-canvas"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                CM
              </button>
              <button
                type="button"
                onClick={() => setUnitMode("inch")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  unitMode === "inch"
                    ? "bg-text-primary text-canvas"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                INCH
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panduan ukuran"
              className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface/80 border border-transparent hover:border-border-subtle transition-all cursor-pointer active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Apparel Switcher Tabs */}
        <div className="px-5 sm:px-7 py-2.5 border-b border-border-subtle/80 bg-canvas/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {APPAREL_TABS.map((tab) => {
            const isSelected = (currentApparelSlug || "").toLowerCase() === tab.slug;
            return (
              <button
                key={tab.slug}
                type="button"
                onClick={() => setCurrentApparelSlug(tab.slug)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-brand-accent text-canvas shadow-sm"
                    : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sub-Tabs: Garment Sizing vs DTF Print Scale */}
        <div className="px-5 sm:px-7 pt-3 pb-1 flex items-center gap-3 border-b border-border-subtle/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveGuideTab("garment")}
            className={`pb-2.5 font-mono text-xs font-bold transition-all relative cursor-pointer ${
              activeGuideTab === "garment"
                ? "text-brand-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <span>DIMENSI PAKAIAN (SIZE CHART)</span>
            {activeGuideTab === "garment" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveGuideTab("dtf")}
            className={`pb-2.5 font-mono text-xs font-bold transition-all relative cursor-pointer ${
              activeGuideTab === "dtf"
                ? "text-brand-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <span>STANDAR UKURAN SABLON (DTF SCALE)</span>
            {activeGuideTab === "dtf" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {activeGuideTab === "garment" ? (
            <>
              {/* Quick Size Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-canvas/60 border border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans font-bold text-text-muted uppercase">PILIH UKURAN:</span>
                  <span className="text-xs font-mono font-black text-brand-accent px-2 py-0.5 rounded-md bg-brand-accent/15 border border-brand-accent/30">
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
                            ? "bg-text-primary text-canvas shadow-sm"
                            : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/40"
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
                {/* Left: Vector Silhouette Blueprint */}
                <div className="md:col-span-5 p-5 rounded-2xl bg-canvas/80 border border-border-subtle flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-3 left-3 text-[10px] font-sans text-text-muted font-bold uppercase tracking-wider">
                    DIAGRAM FISIK ({previewSize})
                  </div>

                  {/* Vector Blueprint Graphics */}
                  <div className="w-full max-w-[210px] py-2 flex items-center justify-center">
                    <ApparelVectorBlueprint
                      apparelSlug={currentApparelSlug}
                      dims={currentDims}
                      formatVal={formatVal}
                      formatRange={formatRange}
                    />
                  </div>

                  {/* Diagram Legend Key */}
                  <DiagramLegend category={spec.category} dims={currentDims} />

                  <div className="w-full mt-2 pt-3 border-t border-border-subtle/60 text-center font-mono text-[11px] text-text-muted">
                    Standar Fitting: Regular Indonesian Streetwear
                  </div>
                </div>

                {/* Right: Dimension Table */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-canvas/40">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface/90 border-b border-border-subtle text-[10px] text-text-muted uppercase">
                          <th className="py-2.5 px-3">Size</th>
                          {spec.category === "tops" && (
                            <>
                              <th className="py-2.5 px-3">Lebar Dada</th>
                              <th className="py-2.5 px-3">Lingkar</th>
                              <th className="py-2.5 px-3">Panjang</th>
                              <th className="py-2.5 px-3">Bahu</th>
                              <th className="py-2.5 px-3">Lengan</th>
                            </>
                          )}
                          {spec.category === "bottoms" && (
                            <>
                              <th className="py-2.5 px-3">Pinggang</th>
                              <th className="py-2.5 px-3">Panjang</th>
                              <th className="py-2.5 px-3">Paha</th>
                            </>
                          )}
                          {spec.category === "headwear" && (
                            <>
                              <th className="py-2.5 px-3">Lingkar Kepala</th>
                              <th className="py-2.5 px-3">Tinggi</th>
                              <th className="py-2.5 px-3">Visor</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/50 text-[11px]">
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
                                  ? "bg-brand-accent/15 text-brand-accent font-bold"
                                  : "hover:bg-surface/60 text-text-primary"
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold flex items-center gap-1.5">
                                {isCurrent && <Check size={12} className="stroke-[3]" />}
                                <span>{sz}</span>
                              </td>
                              {spec.category === "tops" && (
                                <>
                                  <td className="py-2.5 px-3">{formatVal(d.chestWidthCm)}</td>
                                  <td className="py-2.5 px-3 text-text-muted">{formatVal(d.chestCircumferenceCm)}</td>
                                  <td className="py-2.5 px-3">{formatVal(d.bodyLengthCm)}</td>
                                  <td className="py-2.5 px-3 text-text-muted">{formatVal(d.shoulderWidthCm)}</td>
                                  <td className="py-2.5 px-3 text-brand-accent font-semibold">{formatVal(d.sleeveLengthCm)}</td>
                                </>
                              )}
                              {spec.category === "bottoms" && (
                                <>
                                  <td className="py-2.5 px-3">{formatRange(d.waistMinCm, d.waistMaxCm)}</td>
                                  <td className="py-2.5 px-3">{formatVal(d.bodyLengthCm)}</td>
                                  <td className="py-2.5 px-3 text-text-muted">{formatVal(d.thighCircumferenceCm)}</td>
                                </>
                              )}
                              {spec.category === "headwear" && (
                                <>
                                  <td className="py-2.5 px-3">{formatRange(d.headCircumferenceMinCm, d.headCircumferenceMaxCm)}</td>
                                  <td className="py-2.5 px-3">{formatVal(d.crownHeightCm)}</td>
                                  <td className="py-2.5 px-3 text-text-muted">{formatVal(d.visorLengthCm)}</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Measuring Guidelines */}
                  <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-text-primary">
                      <Info size={13} className="text-brand-accent" />
                      <span>CARA MENGUKUR PAKAIAN SENDIRI:</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-text-muted font-sans leading-relaxed">
                      {spec.measuringGuide.map((g, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-mono font-bold text-text-primary shrink-0">{idx + 1}.</span>
                          <span>
                            <strong className="text-text-primary">{g.point}:</strong> {g.description}
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
              <div className="p-4 rounded-2xl bg-brand-accent/10 border border-brand-accent/30 flex items-start gap-3">
                <Maximize2 size={18} className="text-brand-accent shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-sans font-bold text-text-primary uppercase tracking-tight">
                    Standar Kalibrasi DTF Kaos Kami (Presisi 1:1 Skala Centimeter)
                  </h4>
                  <p className="text-text-muted leading-relaxed font-sans">
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
                    className="p-4 rounded-2xl bg-canvas/70 border border-border-subtle space-y-2 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-accent uppercase">
                        {tier.tier}
                      </span>
                      <span className="text-xs font-black text-text-primary px-2 py-0.5 rounded-md bg-surface border border-border-subtle">
                        {tier.sizeCm}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-primary font-sans leading-snug">
                      <strong>Penempatan:</strong> {tier.usage}
                    </p>
                    <p className="text-[10px] text-text-muted font-sans leading-snug">
                      <strong>Saran Desain:</strong> {tier.recommended}
                    </p>
                  </div>
                ))}
              </div>

              {/* Jarak Kerah Standar */}
              <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2 font-mono text-xs">
                <div className="flex items-center gap-1.5 font-bold text-text-primary">
                  <Layers size={14} className="text-brand-accent" />
                  <span>STANDAR POSISI DARI KERAH (COLLAR BASELINE):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] font-sans">
                  <div className="p-2.5 rounded-xl bg-canvas/60 border border-border-subtle">
                    <span className="font-mono font-bold text-text-primary block">Saku Dada Kiri</span>
                    <span className="text-text-muted">7.0 - 9.0 cm dari kerah</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-canvas/60 border border-border-subtle">
                    <span className="font-mono font-bold text-text-primary block">Dada Tengah (A4/A3)</span>
                    <span className="text-text-muted">5.0 - 7.5 cm dari kerah</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-canvas/60 border border-border-subtle">
                    <span className="font-mono font-bold text-text-primary block">Punggung Belakang</span>
                    <span className="text-text-muted">10.0 - 12.0 cm dari kerah</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-border-subtle bg-surface/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-text-muted">
            Ukuran aktif: <strong className="text-brand-accent">{previewSize}</strong> ({spec.displayName})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-text-primary text-canvas font-sans text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            TERAPKAN & KEMBALI KE STUDIO
          </button>
        </div>
      </div>
    </div>
  );
}
