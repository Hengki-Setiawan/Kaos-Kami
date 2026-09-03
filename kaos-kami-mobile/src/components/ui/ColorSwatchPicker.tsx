"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { haptic } from '@/lib/bridge/haptics';

export interface SwatchOption {
  name: string;
  hex: string;
}

export const STREETWEAR_SWATCHES: SwatchOption[] = [
  { name: 'Obsidian Black', hex: '#0E0E10' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Signal Tangerine', hex: '#FF6B35' },
  { name: 'Charcoal Grey', hex: '#27272A' },
  { name: 'Sage Forest', hex: '#3E523A' },
  { name: 'Deep Navy', hex: '#1E293B' },
  { name: 'Burgundy Wine', hex: '#5B1425' },
  { name: 'Coffee Brown', hex: '#3E2723' },
];

export interface ColorSwatchPickerProps {
  selectedHex: string;
  onSelect: (hex: string, name: string) => void;
  label?: string;
}

export function ColorSwatchPicker({
  selectedHex,
  onSelect,
  label,
}: ColorSwatchPickerProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white font-['Syne']">{label}</span>
          <span className="text-[11px] text-zinc-400">
            {STREETWEAR_SWATCHES.find((s) => s.hex.toLowerCase() === selectedHex.toLowerCase())?.name || selectedHex}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 no-scrollbar">
        {STREETWEAR_SWATCHES.map((swatch) => {
          const isSelected = swatch.hex.toLowerCase() === selectedHex.toLowerCase();

          return (
            <motion.button
              key={swatch.hex}
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                haptic.selection();
                onSelect(swatch.hex, swatch.name);
              }}
              aria-label={swatch.name}
              className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-[#FF6B35] ring-4 ring-orange-500/25 scale-105'
                  : 'border-zinc-700/60 hover:border-zinc-500'
              }`}
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && (
                <Check
                  className={`w-4 h-4 stroke-[3] ${
                    swatch.hex === '#FFFFFF' ? 'text-black' : 'text-white'
                  }`}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
