import React from "react";
import Link from "next/link";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_WHATSAPP,
  SHOP_EMAIL,
  SHOP_SUPPORT_EMAIL,
  SHOP_PHONE_DISPLAY,
  SHOP_HOURS,
  shopWaLink,
} from "@/lib/shop";
import { Mail, Phone, MapPin, Clock, ShieldCheck, CreditCard } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
          {/* Brand Info & Mission */}
          <div className="max-w-sm space-y-3">
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
            <p suppressHydrationWarning className="text-xs font-mono text-text-muted leading-relaxed">
              Platform Sablon DTF 3D Interaktif & Kaos Polos Komunitas Makassar. Melayani pesanan custom satuan dan partai besar dengan jaminan bahan katun combed adem dan presisi cetak digital.
            </p>
            <a
              href={shopWaLink("Halo Kaos Kami, saya mau tanya-tanya seputar pemesanan.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-[#052e16] border border-[#25D366]/40 text-[#86efac] font-mono text-xs font-bold hover:bg-[#25D366] hover:text-white transition-all"
            >
              <Phone size={13} />
              <span>WHATSAPP CS: {SHOP_PHONE_DISPLAY}</span>
            </a>
          </div>

          {/* Duitku Verified Merchant Support Card */}
          <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5 font-mono text-xs max-w-md w-full">
            <div className="flex items-center gap-2 text-brand-accent font-bold text-[11px] uppercase tracking-wider pb-2 border-b border-border-subtle">
              <ShieldCheck size={15} />
              <span>KONTAK SUPPORT & ALAMAT USAHA RESMI</span>
            </div>
            <div className="space-y-2 text-text-muted text-[11px]">
              <div className="flex items-start gap-2.5">
                <Mail size={14} className="text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-text-primary font-bold block">Email Support & Kemitraan:</span>
                  <a href={`mailto:${SHOP_EMAIL}`} className="text-text-muted hover:text-brand-accent transition-colors block">
                    {SHOP_EMAIL}
                  </a>
                  <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="text-text-muted hover:text-brand-accent transition-colors block">
                    {SHOP_SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone size={14} className="text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-text-primary font-bold block">Nomor Telepon / WhatsApp:</span>
                  <span className="text-text-muted">{SHOP_PHONE_DISPLAY} (+{SHOP_WHATSAPP})</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <span className="text-text-primary font-bold block">Alamat Usaha / Workshop:</span>
                  <span className="text-text-muted leading-tight block">{SHOP_WORKSHOP_ADDRESS}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <Clock size={14} className="text-brand-accent shrink-0" />
                <div>
                  <span className="text-text-primary font-bold inline mr-1.5">Jam Layanan:</span>
                  <span className="text-text-muted">{SHOP_HOURS}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
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
              <span className="block text-text-muted">Workshop Pick-up</span>
            </div>
          </nav>
        </div>

        {/* Payment Gateway Compliance & Security Badge */}
        <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-text-muted">
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

