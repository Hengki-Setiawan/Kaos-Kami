import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
      <div>
        <img
          src="/brand/logo-white-clean.png"
          alt="Kaos Kami"
          className="h-9 w-auto object-contain mb-2"
        />
        <p className="text-xs font-mono text-text-muted max-w-sm leading-relaxed">
          Platform Sablon DTF 3D & Heavyweight Streetwear Apparel. Workshop produksi & cetak resmi Kota Makassar, Sulawesi Selatan.
        </p>
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
