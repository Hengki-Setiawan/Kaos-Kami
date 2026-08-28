import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
      <div>
        <span className="font-display font-black text-2xl uppercase tracking-tighter text-text-primary">
          kaos kami<span className="text-brand-accent">.</span>
        </span>
        <p className="text-xs font-mono text-text-muted mt-2 max-w-sm leading-relaxed">
          Heavyweight Indonesian streetwear apparel. Engineered, structural cotton combed knitwear.
        </p>
      </div>

      <div className="flex flex-wrap gap-8 text-xs font-mono text-text-muted uppercase tracking-wider">
        <div>
          <span className="block text-[10px] text-brand-accent mb-1">{"// STUDIO"}</span>
          <span>JAKARTA, INDONESIA</span>
        </div>
        <div>
          <span className="block text-[10px] text-brand-accent mb-1">{"// EDITION"}</span>
          <span>AUTUMN / WINTER 2026</span>
        </div>
        <div>
          <span className="block text-[10px] text-brand-accent mb-1">{"// COPYRIGHT"}</span>
          <span>© {new Date().getFullYear()} KAOS KAMI</span>
        </div>
      </div>
    </footer>
  );
};
