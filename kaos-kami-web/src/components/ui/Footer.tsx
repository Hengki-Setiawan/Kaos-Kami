"use client";

import React from "react";
import Link from "next/link";
import {
  SHOP_TIKTOK_URL,
  SHOP_FB_COMMUNITY_URL,
  SHOP_INSTAGRAM_URL,
  SHOP_WORKSHOP_ADDRESS,
  SHOP_HOURS,
  SHOP_PHONE_DISPLAY,
  shopWaLink,
} from "@/lib/shop";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 border-t border-border-subtle bg-canvas px-6 md:px-12 py-12 md:py-16 font-sans text-xs text-text-primary">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom 1: Brand & Manifesto (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-block hover:opacity-85 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-white-clean.png"
                alt="Kaos Kami"
                className="h-8 w-auto object-contain logo-dark-mode"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-black-clean.png"
                alt="Kaos Kami"
                className="h-8 w-auto object-contain logo-light-mode"
              />
            </Link>

            <p className="text-text-muted text-xs leading-relaxed max-w-sm">
              Platform kustomisasi 3D dan konveksi sablon DTF katun combed 24s premium Kota Makassar. Pesan satuan tanpa minimum order dengan pratinjau fisik 360° sebelum cetak.
            </p>

            {/* Social Icons Row: Clean, Compact, Branded */}
            <div className="flex items-center gap-2 pt-1" aria-label="Media sosial Kaos Kami">
              {/* TikTok */}
              <a
                href={SHOP_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface border border-border-subtle hover:border-text-primary hover:bg-black hover:text-white text-text-muted flex items-center justify-center transition-all cursor-pointer"
                title="TikTok @kaoskami"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.84-4.48V8.71a8.21 8.21 0 0 0 4.93 1.63V6.89a4.83 4.83 0 0 1-1-.2z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href={SHOP_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface border border-border-subtle hover:border-[#E4405F] hover:text-[#E4405F] text-text-muted flex items-center justify-center transition-all cursor-pointer"
                title="Instagram @kaoskami.makassar"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href={shopWaLink("Halo CS Kaos Kami, saya ingin konsultasi sablon.")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface border border-border-subtle hover:border-[#25D366] hover:text-[#25D366] text-text-muted flex items-center justify-center transition-all cursor-pointer"
                title="WhatsApp CS Kaos Kami"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </a>

              {/* Facebook */}
              <a
                href={SHOP_FB_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface border border-border-subtle hover:border-[#1877F2] hover:text-[#1877F2] text-text-muted flex items-center justify-center transition-all cursor-pointer"
                title="Komunitas Facebook Kaos Kami"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Kolom 2: Produk & Studio (2 cols) */}
          <nav className="lg:col-span-2 space-y-3" aria-label="Navigasi Produk">
            <span className="block text-[11px] font-mono font-bold text-text-primary uppercase tracking-wider">
              Produk &amp; Fitur
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/catalog" className="text-text-muted hover:text-brand-accent transition-colors">
                  Katalog Pakaian Jadi
                </Link>
              </li>
              <li>
                <Link href="/studio" className="text-text-muted hover:text-brand-accent transition-colors">
                  Studio Kustom 3D
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-text-muted hover:text-brand-accent transition-colors">
                  Lacak Pesanan
                </Link>
              </li>
            </ul>
          </nav>

          {/* Kolom 3: Bantuan & Legal (3 cols) */}
          <nav className="lg:col-span-3 space-y-3" aria-label="Navigasi Bantuan">
            <span className="block text-[11px] font-mono font-bold text-text-primary uppercase tracking-wider">
              Bantuan &amp; Legalitas
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/faq" className="text-text-muted hover:text-brand-accent transition-colors">
                  Pertanyaan Umum (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-muted hover:text-brand-accent transition-colors">
                  Syarat &amp; Ketentuan
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-text-muted hover:text-brand-accent transition-colors">
                  Kebijakan Pengembalian (Refund)
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-text-muted hover:text-brand-accent transition-colors">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-text-muted hover:text-brand-accent transition-colors">
                  Kontak Workshop
                </Link>
              </li>
            </ul>
          </nav>

          {/* Kolom 4: Workshop Info (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <span className="block text-[11px] font-mono font-bold text-text-primary uppercase tracking-wider">
              Workshop Makassar
            </span>
            <p className="text-text-muted text-xs leading-relaxed">
              {SHOP_WORKSHOP_ADDRESS}
            </p>
            <p className="text-text-muted text-xs">
              Buka: <strong className="text-text-primary font-medium">{SHOP_HOURS}</strong>
            </p>
            <p className="text-text-muted text-xs">
              Customer Care: <strong className="text-text-primary font-medium">{SHOP_PHONE_DISPLAY}</strong>
            </p>
          </div>
        </div>

        {/* Payment Partner & Integrasi Resmi iPaymu */}
        <div className="pt-6 pb-2 border-t border-border-subtle flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="text-left">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Mitra Resmi Pembayaran Digital:
              </span>
              <span className="text-xs font-semibold text-text-primary">
                iPaymu Payment Gateway
              </span>
            </div>
            <a
              href="https://ipaymu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 p-2 px-4 rounded-2xl bg-white dark:bg-white/95 border border-border-subtle hover:border-brand-accent/60 shadow-md transition-all group"
              title="Didukung Resmi oleh PT Inti Prima Mandiri Utama (iPaymu Payment Gateway Indonesia)"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/ipaymu-color.png"
                alt="iPaymu Payment Gateway Indonesia"
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-[11px] font-bold text-slate-800 border-l border-slate-200 pl-2.5 hidden sm:inline-block">
                Verified Gateway
              </span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle font-medium shadow-xs">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>QRIS Bebas Biaya Admin</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle font-medium shadow-xs">
              <span>Virtual Account Multi-Bank</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[10px] shadow-xs">
              ✓ Terlisensi Bank Indonesia
            </span>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-4 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Kaos Kami Makassar. Seluruh hak cipta dilindungi.
          </p>
          <p className="text-[11px] text-text-muted">
            Platform 3D Interactive Apparel E-Commerce & DTF Sablon Platform · Kota Makassar
          </p>
        </div>
      </div>
    </footer>
  );
};
