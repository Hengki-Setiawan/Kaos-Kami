"use client";

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { haptic } from '@/lib/bridge/haptics';

export interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  size = 'md',
}: StepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      haptic.tap();
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      haptic.tap();
      onChange(value + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-xl bg-zinc-900 border border-zinc-700/60 ${
        size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'
      }`}
    >
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Kurangi"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 active:text-white active:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span
        className={`font-semibold text-white text-center min-w-[28px] ${
          size === 'sm' ? 'text-xs px-1' : 'text-sm px-2'
        }`}
      >
        {value}
      </span>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Tambah"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 active:text-white active:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
