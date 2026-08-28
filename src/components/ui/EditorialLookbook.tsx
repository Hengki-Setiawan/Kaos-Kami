"use client";

import React from "react";
import { LookbookImage } from "./LookbookImage";

const LOOKS = [
  { src: "/lookbook/look-01.jpg", caption: "Look 01 — Obsidian Carbon" },
  { src: "/lookbook/look-02.jpg", caption: "Look 02 — Chalk Raw Ecru" },
  { src: "/lookbook/look-03.jpg", caption: "Look 03 — Signal Acid Tangerine" },
  { src: "/lookbook/look-04.jpg", caption: "Look 04 — Tactical Olive Drab" },
];

export const EditorialLookbook: React.FC = () => {
  return (
    <section className="relative z-20 bg-canvas px-6 md:px-12 py-28 border-t border-border-subtle">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="block text-[11px] font-mono text-brand-accent uppercase tracking-widest mb-2">
            {"// VISUAL ARCHIVE / EDITION 2026"}
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-black uppercase text-text-primary">
            FIELD NOTES
          </h2>
        </div>
        <p className="max-w-md text-xs font-mono text-text-muted leading-relaxed">
          High-contrast editorial photography captured on 35mm film across industrial and brutalist architectural locations in Jakarta.
        </p>
      </div>

      {/* Lookbook 4-Column Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LOOKS.map((look, i) => (
          <div
            key={look.caption}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border-subtle bg-surface hover:border-brand-accent/50 transition-all duration-500 shadow-lg"
          >
            <LookbookImage
              src={look.src}
              caption={look.caption}
              seed={i}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-canvas/90 via-canvas/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="text-[10px] font-mono text-brand-accent tracking-widest block mb-1">
                {`// 0${i + 1}`}
              </span>
              <p className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                {look.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
