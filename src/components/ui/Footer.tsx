import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
      <div className="flex items-start gap-4">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-brand-accent/40 bg-black/60 shadow-[0_0_16px_rgba(230,81,0,0.3)] shrink-0 flex items-center justify-center">
          <img
            src="/brand/mascot-cool.png"
            alt="Kaos Kami Mascot"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <span className="font-display font-black text-2xl uppercase tracking-tighter text-text-primary">
            kaos kami<span className="text-brand-accent">.</span>
          </span>
          <p className="text-xs font-mono text-text-muted mt-1 max-w-sm leading-relaxed">
            Platform Sablon DTF 3D & Heavyweight Streetwear Apparel. Workshop produksi & cetak resmi Kota Makassar, Sulawesi Selatan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-8 text-xs font-mono text-text-muted uppercase tracking-wider">
        <div>
          <span className="block text-[10px] text-brand-accent mb-1">WORKSHOP & PICKUP</span>
          <span>TAMALANREA, MAKASSAR</span>
        </div>
        <div>
          <span className="block text-[10px] text-brand-accent mb-1">PENGIRIMAN</span>
          <span>MAXIM COD & J&T SE-SULAWESI</span>
        </div>
        <div>
          <span className="block text-[10px] text-brand-accent mb-1">HAK CIPTA</span>
          <span>© {new Date().getFullYear()} KAOS KAMI MAKASSAR</span>
        </div>
      </div>
    </footer>
  );
};
