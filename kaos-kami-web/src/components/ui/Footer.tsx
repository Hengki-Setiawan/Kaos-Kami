import React from "react";
import Link from "next/link";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_EMAIL,
  SHOP_PHONE_DISPLAY,
  SHOP_HOURS,
  SHOP_TIKTOK_URL,
  SHOP_FB_COMMUNITY_URL,
  SHOP_INSTAGRAM_URL,
  SHOP_MAPS_URL,
  shopWaLink,
} from "@/lib/shop";
import { Mail, Phone, MapPin, Clock, CreditCard, Video, Users, Instagram } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12 font-mono text-xs">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
          {/* Brand Info & Mission */}
          <div className="space-y-4 lg:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo mungil lokal; images.unoptimized=true */}
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
            <p suppressHydrationWarning className="text-xs text-text-muted leading-relaxed font-sans">
              Platform Sablon DTF 3D Interaktif & Kaos Polos Komunitas Makassar. Melayani pesanan custom satuan dan partai besar dengan jaminan bahan katun combed adem dan presisi cetak digital.
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={SHOP_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent flex items-center justify-center text-text-muted transition-colors"
                title="TikTok @kaoskami"
              >
                <Video size={14} />
              </a>
              <a
                href={SHOP_FB_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-surface border border-border-subtle hover:border-[#1877F2] hover:text-[#1877F2] flex items-center justify-center text-text-muted transition-colors"
                title="Grup Komunitas Facebook"
              >
                <Users size={14} />
              </a>
              <a
                href={SHOP_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-surface border border-border-subtle hover:border-[#E4405F] hover:text-[#E4405F] flex items-center justify-center text-text-muted transition-colors"
                title="Instagram @kaoskami.makassar"
              >
                <Instagram size={14} />
              </a>
              <a
                href={shopWaLink("Halo Kaos Kami CS, saya ingin bertanya seputar produk.")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-surface border border-border-subtle hover:border-[#25D366] hover:text-[#25D366] flex items-center justify-center text-text-muted transition-colors"
                title="WhatsApp Resmi"
              >
                <Phone size={14} />
              </a>
            </div>
          </div>

          {/* Workshop & Contact Summary (Clean, Integrated with Theme) */}
          <div className="space-y-3 lg:col-span-1">
            <span className="block text-[10px] text-brand-accent font-bold uppercase tracking-widest">
              WORKSHOP & KANTOR RESMI
            </span>
            <div className="space-y-2.5 text-text-muted text-[11px] leading-relaxed">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-brand-accent shrink-0 mt-0.5" />
                <a
                  href={SHOP_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-accent transition-colors"
                >
                  {SHOP_WORKSHOP_ADDRESS}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-brand-accent shrink-0" />
                <span>{SHOP_HOURS}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-brand-accent shrink-0" />
                <a
                  href={shopWaLink("Halo CS Kaos Kami, saya ingin memesan.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-accent transition-colors"
                >
                  {SHOP_PHONE_DISPLAY}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-brand-accent shrink-0" />
                <a href={`mailto:${SHOP_EMAIL}`} className="hover:text-brand-accent transition-colors">
                  {SHOP_EMAIL}
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 uppercase tracking-wider text-xs" aria-label="Navigasi belanja">
            <span className="block text-[10px] text-brand-accent font-bold">BELANJA & PRODUK</span>
            <Link href="/catalog" className="block text-text-muted hover:text-text-primary transition-colors">Katalog Produk</Link>
            <Link href="/studio" className="block text-text-muted hover:text-text-primary transition-colors">Studio 3D Mockup</Link>
            <Link href="/track" className="block text-text-muted hover:text-text-primary transition-colors">Lacak Pesanan</Link>
            <Link href="/#etalase" className="block text-text-muted hover:text-text-primary transition-colors">Etalase Ready Stock</Link>
          </nav>

          <nav className="space-y-2 uppercase tracking-wider text-xs" aria-label="Navigasi bantuan & info">
            <span className="block text-[10px] text-brand-accent font-bold">TENTANG & BANTUAN</span>
            <Link href="/#tentang-kami" className="block text-text-muted hover:text-text-primary transition-colors">Tentang Kami & Workshop</Link>
            <Link href="/kalkulator-sablon" className="block text-text-muted hover:text-text-primary transition-colors">Kalkulator Sablon</Link>
            <Link href="/privacy" className="block text-text-muted hover:text-text-primary transition-colors">Kebijakan Privasi</Link>
            <Link href="/kredit" className="block text-text-muted hover:text-text-primary transition-colors">Kredit Aset 3D</Link>
            <a href={shopWaLink("Halo Kaos Kami, saya butuh bantuan pesanan.")} target="_blank" rel="noopener noreferrer" className="block text-text-muted hover:text-text-primary transition-colors">
              Hubungi Workshop
            </a>
          </nav>
        </div>

        {/* Payment Gateway Compliance & Security Badge */}
        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-muted">
          <div className="flex items-center gap-2 flex-wrap">
            <CreditCard size={14} className="text-brand-accent" />
            <span>Pembayaran Aman Didukung <strong>Duitku Payment Gateway</strong> (QRIS, VA Bank Mandiri, BCA, BNI, BRI, Permata & E-Wallet)</span>
          </div>
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} KAOS KAMI MAKASSAR — Hak Cipta Dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};

