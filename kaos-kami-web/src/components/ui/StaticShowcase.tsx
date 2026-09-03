"use client";

import React, { useState } from "react";
import { PRODUCT_COLORS, TECHNICAL_SPECS, SIZES, type ProductSize, type ProductColor } from "@/lib/constants";
import { Check } from "lucide-react";

/**
 * Fallback rendered when WebGL is not supported on the visitor's hardware or browser.
 * Delivers the complete editorial brand presentation without crashing or blanking.
 */
const DEFAULT_COLOR: ProductColor = PRODUCT_COLORS[0] ?? {
  id: "obsidian",
  name: "Obsidian Black",
  hex: "#121214",
  description: "Deep reactive dyed combed cotton with dense carbon undertones.",
};

export const StaticShowcase: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<ProductColor>(DEFAULT_COLOR);
  const [selectedSize, setSelectedSize] = useState<ProductSize>("L");

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-6 md:px-16 py-24 max-w-6xl mx-auto space-y-20">
      {/* Brand Header */}
      <section className="space-y-4">
        <p className="font-mono text-xs text-brand-accent tracking-widest uppercase">
          {"// ARCHITECTURAL FIT / AUTONOMOUS STREETWEAR"}
        </p>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-black tracking-tighter uppercase leading-[0.9]">
          OVERSIZED<br />HEAVY-KNIT
        </h1>
        <p className="max-w-xl text-sm text-text-muted font-mono leading-relaxed pt-2">
          Your browser is currently running in static display mode. Here is the full technical dossier and catalog specifications for the Kaos Kami heavyweight series.
        </p>
      </section>

      {/* Technical Specifications Grid */}
      <section className="grid md:grid-cols-2 gap-4">
        {TECHNICAL_SPECS.map((spec) => (
          <div key={spec.label} className="p-6 rounded-2xl glass-panel border border-border-subtle">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[11px] font-mono text-text-muted tracking-wider uppercase">{spec.label}</span>
              <span className="text-sm font-mono font-bold text-brand-accent">{spec.value}</span>
            </div>
            <p className="text-xs font-mono text-text-muted leading-relaxed">{spec.detail}</p>
          </div>
        ))}
      </section>

      {/* Static Configurator Options */}
      <section className="p-8 rounded-2xl glass-panel-elevated border border-border-subtle space-y-6 max-w-2xl">
        <h2 className="font-display font-black text-xl uppercase">SELECT SPECIFICATIONS</h2>

        <div>
          <div className="flex justify-between text-xs font-mono mb-3">
            <span className="text-text-muted">COLORWAY:</span>
            <span className="text-text-primary font-bold">{selectedColor.name}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {PRODUCT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c)}
                style={{ backgroundColor: c.hex }}
                aria-label={c.name}
                className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                  selectedColor.id === c.id ? "border-brand-accent scale-110 shadow-lg" : "border-border-subtle"
                }`}
              >
                {selectedColor.id === c.id && (
                  <Check size={16} className={c.id === "chalk" ? "text-canvas" : "text-text-primary"} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-mono text-text-muted mb-3">STREET-CUT SIZING:</span>
          <div className="grid grid-cols-5 gap-2">
            {SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size as ProductSize)}
                className={`py-3 rounded-lg font-mono text-xs font-bold border transition-all ${
                  selectedSize === size
                    ? "bg-text-primary text-canvas border-text-primary"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <button className="w-full py-4 rounded-xl bg-brand-accent text-canvas font-display font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(230,81,0,0.3)]">
          ACQUIRE PIECE — IDR 289.000
        </button>
      </section>
    </main>
  );
};
