import React from "react";
import Link from "next/link";
import { SHOP_WORKSHOP_ADDRESS, SHOP_WHATSAPP, shopWaLink } from "@/lib/shop";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true sehingga next/image tak menambah nilai */}
          <img
            src="/brand/logo-white-clean.png"
            alt="Kaos Kami"
            className="h-9 w-auto object-contain mb-2 logo-dark-mode"
          />
          <img
            src="/brand/logo-black-clean.png"
            alt="Kaos Kami"
            className="h-9 w-auto object-contain mb-2 logo-light-mode"
          />
          <p className="text-xs font-mono text-text-muted max-w-sm leading-relaxed">
            Platform Sablon DTF 3D & Heavyweight Streetwear Apparel. {SHOP_WORKSHOP_ADDRESS}.
          </p>
          <a
            href={shopWaLink("Halo Kaos Kami, saya mau tanya-tanya dulu.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] font-mono text-xs font-bold hover:bg-[#25D366] hover:text-white transition-all"
          >
            CHAT WHATSAPP: {SHOP_WHATSAPP}
          </a>
        </div>

        <nav className="flex flex-wrap gap-8 text-xs font-mono uppercase tracking-wider" aria-label="Navigasi footer">
          <div className="space-y-2">
            <span className="block text-[10px] text-brand-accent font-bold">BELANJA</span>
            <Link href="/catalog" className="block text-text-muted hover:text-text-primary transition-colors">Katalog Produk</Link>
            <Link href="/studio" className="block text-text-muted hover:text-text-primary transition-colors">Studio 3D</Link>
            <Link href="/track" className="block text-text-muted hover:text-text-primary transition-colors">Lacak Pesanan</Link>
          </div>
          <div className="space-y-2">
            <span className="block text-[10px] text-brand-accent font-bold">BANTUAN</span>
            <Link href="/kalkulator-sablon" className="block text-text-muted hover:text-text-primary transition-colors">Kalkulator Sablon</Link>
            <Link href="/privacy" className="block text-text-muted hover:text-text-primary transition-colors">Kebijakan Privasi</Link>
            <Link href="/kredit" className="block text-text-muted hover:text-text-primary transition-colors">Kredit Aset 3D</Link>
            <a href={shopWaLink("Halo Kaos Kami, saya butuh bantuan pesanan.")} target="_blank" rel="noopener noreferrer" className="block text-text-muted hover:text-text-primary transition-colors">
              Hubungi Workshop
            </a>
          </div>
          <div className="space-y-2">
            <span className="block text-[10px] text-brand-accent font-bold">PENGIRIMAN</span>
            <span className="block text-text-muted">Gratis se-Makassar</span>
            <span className="block text-text-muted">Ekspedisi nasional</span>
          </div>
        </nav>
      </div>
      <p className="mt-8 text-[11px] font-mono text-text-muted">
        © {new Date().getFullYear()} KAOS KAMI MAKASSAR — Sablon DTF & Heavyweight Streetwear.
      </p>
    </footer>
  );
};
