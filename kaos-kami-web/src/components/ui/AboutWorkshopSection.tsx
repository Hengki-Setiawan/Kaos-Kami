"use client";

import React from "react";
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
import {
  MapPin,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Package,
} from "lucide-react";

export const AboutWorkshopSection: React.FC = () => {
  return (
    <section
      id="tentang-kami"
      className="relative z-20 bg-canvas px-6 md:px-12 py-20 md:py-28 border-t border-border-subtle scroll-mt-24 font-sans text-text-primary"
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Editorial Story Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles size={13} />
            <span>BRAND APPAREL & SABLON DTF MAKASSAR · EST. 2024</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-extrabold tracking-tight text-text-primary leading-[1.1]">
            Kaos Komunitas Berkualitas, <br className="hidden sm:block" />
            <span className="text-brand-accent">Dibuat Mandiri dengan Standar Distro</span>
          </h2>
          <p className="text-sm sm:text-base text-text-muted leading-relaxed font-sans">
            Kaos Kami adalah brand apparel independen Kota Makassar yang berfokus pada kaos komunitas, pop culture, dan sablon digital DTF presisi tinggi sejak 2024. Setiap potong pakaian dikerjakan dengan ketelitian penuh, mulai dari pemilihan bahan katun combed 24s murni yang sejuk, cetak transfer film beresolusi tajam, hingga proses heat press mandiri di workshop kami. Kami melayani pesanan satuan tanpa minimum order maupun pesanan komunitas di seluruh Indonesia.
          </p>
        </div>

        {/* 4 Metrik Kredensial Nyata */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-surface/60 border border-border-subtle backdrop-blur-sm space-y-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-black text-brand-accent">4.9 ★</span>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Rating Kepuasan</h4>
            <p className="text-[11px] text-text-muted leading-snug">Ratusan ulasan positif pembeli komunitas di seluruh Indonesia.</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-surface/60 border border-border-subtle backdrop-blur-sm space-y-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-500">100%</span>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Combed 24s Asli</h4>
            <p className="text-[11px] text-text-muted leading-snug">Bahan katun murni sejuk, tebal pas, dan menyerap keringat.</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-surface/60 border border-border-subtle backdrop-blur-sm space-y-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-black text-amber-500">0 Min</span>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Bebas Pesan Satuan</h4>
            <p className="text-[11px] text-text-muted leading-snug">Pesan 1 pcs untuk kado atau koleksi pribadi tetap dilayani.</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-surface/60 border border-border-subtle backdrop-blur-sm space-y-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-black text-sky-500">Makassar</span>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Workshop Mandiri</h4>
            <p className="text-[11px] text-text-muted leading-snug">Produksi langsung di Makassar dengan gratis pengantaran lokal.</p>
          </div>
        </div>

        {/* 2-Column Core: Left Physical Workshop Hub + Right Authentic Social Media Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Kolom Kiri: Lokasi & Kunjungan Workshop (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-surface/50 border border-border-subtle flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold font-mono tracking-widest text-text-muted uppercase">
                  Workshop &amp; Titik Pickup
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                    <MapPin size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-text-primary">Alamat Workshop</h5>
                    <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                      {SHOP_WORKSHOP_ADDRESS}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5">
                    <Clock size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-text-primary">Jam Operasional</h5>
                    <p className="text-xs text-text-muted mt-0.5">
                      {SHOP_HOURS} (Minggu Libur)
                    </p>
                  </div>
                </div>
              </div>

              {/* Layanan Lokasi Khusus Self-Pickup */}
              <div className="pt-2 space-y-1.5 border-t border-border-subtle">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block mb-1">
                  Titik Pengambilan Pesanan:
                </span>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Ambil mandiri (Self-Pickup) tanpa biaya ongkir</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Khusus pesanan jadi yang telah selesai diproduksi</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Tunjukkan invoice atau nomor pesanan saat serah terima</span>
                </div>
              </div>
            </div>

            {/* Google Maps Button */}
            <a
              href={SHOP_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-surface border border-border-strong hover:border-brand-accent text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-surface-elevated shadow-sm cursor-pointer"
            >
              <MapPin size={14} className="text-brand-accent" />
              <span>Petunjuk Arah Google Maps</span>
              <ArrowUpRight size={13} className="opacity-60" />
            </a>
          </div>

          {/* Kolom Kanan: Media Sosial Otentik Mirip Asli (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-surface/50 border border-border-subtle flex flex-col justify-between space-y-5">
            <div className="space-y-1.5">
              <span className="text-xs font-bold font-mono tracking-widest text-text-muted uppercase block">
                Saluran Resmi & Media Sosial
              </span>
              <p className="text-xs text-text-muted">
                Ikuti proses di balik layar, rilis artikel terbaru, dan konsultasikan ide desainmu langsung dengan tim kami.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. TikTok - Brand Accurate Duotone Vibe */}
              <a
                href={SHOP_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-4 rounded-xl bg-black border border-neutral-800 hover:border-neutral-600 transition-all flex items-center justify-between text-white overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {/* SVG Asli TikTok */}
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.84-4.48V8.71a8.21 8.21 0 0 0 4.93 1.63V6.89a4.83 4.83 0 0 1-1-.2z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      TikTok
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">Video</span>
                    </h4>
                    <span className="text-xs text-neutral-400 font-mono">@kaoskami</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-neutral-500 group-hover:text-white transition-colors" />
              </a>

              {/* 2. Instagram - Brand Accurate Gradient Camera */}
              <a
                href={SHOP_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-4 rounded-xl bg-surface border border-border-subtle hover:border-[#E4405F]/50 transition-all flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                    {/* SVG Asli Instagram */}
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary group-hover:text-[#E4405F] transition-colors flex items-center gap-1.5">
                      Instagram
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated text-text-muted font-mono">Katalog</span>
                    </h4>
                    <span className="text-xs text-text-muted font-mono">@kaoskami.makassar</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-[#E4405F] transition-colors" />
              </a>

              {/* 3. Facebook Community - Official FB Blue */}
              <a
                href={SHOP_FB_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-4 rounded-xl bg-surface border border-border-subtle hover:border-[#1877F2]/50 transition-all flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                    {/* SVG Asli Facebook */}
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary group-hover:text-[#1877F2] transition-colors flex items-center gap-1.5">
                      Komunitas FB
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated text-text-muted font-mono">Forum</span>
                    </h4>
                    <span className="text-xs text-text-muted font-mono">Kaos Kami Kreatif</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-[#1877F2] transition-colors" />
              </a>

              {/* 4. WhatsApp CS - Official WA Green & Status Dot */}
              <a
                href={shopWaLink("Halo CS Kaos Kami Makassar, saya ingin konsultasi sablon dan bahan.")}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-4 rounded-xl bg-surface border border-border-subtle hover:border-[#25D366]/50 transition-all flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm relative">
                    {/* SVG Asli WhatsApp */}
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary group-hover:text-[#25D366] transition-colors flex items-center gap-1.5">
                      WhatsApp CS
                      <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                    </h4>
                    <span className="text-xs text-text-muted font-mono">{SHOP_PHONE_DISPLAY}</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-[#25D366] transition-colors" />
              </a>
            </div>

            {/* Direct Contact Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-text-muted border-t border-border-subtle">
              <span>Customer Care: <strong className="text-text-primary font-semibold">{SHOP_PHONE_DISPLAY}</strong></span>
              <span>Email: <a href={`mailto:${SHOP_EMAIL}`} className="text-text-primary hover:text-brand-accent transition-colors font-medium">{SHOP_EMAIL}</a></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
