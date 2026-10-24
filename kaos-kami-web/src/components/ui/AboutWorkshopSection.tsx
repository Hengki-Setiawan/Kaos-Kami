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
import { useCmsContent } from "@/hooks/useCmsContent";
import {
  MapPin,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";

export const AboutWorkshopSection: React.FC = () => {
  const cms = useCmsContent();
  const rawTitle =
    cms.aboutTitle?.trim() ||
    "Standar Distro Independen,\nDicetak Mandiri di Workshop Makassar";
  const titleLines = rawTitle.split("\n").filter(Boolean);
  const story =
    cms.aboutStory?.trim() ||
    "Kaos Kami adalah brand apparel independen Kota Makassar yang berfokus pada kaos komunitas, pop culture, dan sablon digital DTF presisi tinggi sejak 2024. Setiap potong pakaian dikerjakan dengan ketelitian penuh, mulai dari pemilihan bahan katun combed 24s murni yang sejuk, cetak transfer film beresolusi tajam, hingga proses heat press mandiri di workshop kami. Kami melayani pesanan satuan tanpa minimum order maupun pesanan komunitas di seluruh Indonesia.";

  const tiktokUrl = cms.tiktokUrl || SHOP_TIKTOK_URL;
  const instagramUrl = cms.instagramUrl || SHOP_INSTAGRAM_URL;
  const fbUrl = cms.facebookUrl || SHOP_FB_COMMUNITY_URL;
  const waUrl = cms.whatsappNumber
    ? `https://wa.me/${cms.whatsappNumber.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent("Halo CS Kaos Kami Makassar, saya ingin konsultasi sablon dan bahan.")}`
    : shopWaLink("Halo CS Kaos Kami Makassar, saya ingin konsultasi sablon dan bahan.");
  const workshopAddress = cms.workshopAddress || SHOP_WORKSHOP_ADDRESS;
  const workshopHours = cms.workshopHours || SHOP_HOURS;
  const mapsUrl = cms.workshopMapsUrl || SHOP_MAPS_URL;
  const phoneDisplay = cms.whatsappNumber || SHOP_PHONE_DISPLAY;

  return (
    <section
      id="tentang-kami"
      className="relative z-20 bg-canvas px-6 md:px-12 py-20 md:py-28 scroll-mt-24 font-sans text-text-primary"
    >
      <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
        {/* ─── 1. EDITORIAL BRAND MANIFESTO ─── */}
        <div className="max-w-3xl space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-black tracking-tight text-text-primary leading-[1.08] uppercase">
            {titleLines.length > 1 ? (
              titleLines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {idx === 0 ? (
                    <span>{line} </span>
                  ) : (
                    <span className="text-brand-accent block sm:inline">{line}</span>
                  )}
                  {idx < titleLines.length - 1 && <br className="hidden sm:block" />}
                </React.Fragment>
              ))
            ) : (
              <span>{rawTitle}</span>
            )}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-text-muted leading-relaxed font-sans max-w-2xl">
            {story}
          </p>
        </div>

        {/* ─── 2. ARCHITECTURAL CRAFT METRICS FRAME (MONOLITHIC STREETWEAR GRID) ─── */}
        <div className="rounded-2xl sm:rounded-3xl bg-surface/70 dark:bg-black/40 border border-border-subtle/80 dark:border-white/10 backdrop-blur-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle/80">
            {/* Metric 1: DTF Print Craft */}
            <div className="p-5 sm:p-6 space-y-1.5 hover:bg-surface/50 transition-colors">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-mono font-black text-brand-accent">DTF</span>
                <span className="text-xs font-mono text-brand-accent font-bold">HD</span>
              </div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Sablon Digital DTF</h4>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Cetak transfer film beresolusi tajam, warna pekat, dan daya rekat tahan cuci.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="p-5 sm:p-6 space-y-1.5 hover:bg-surface/50 transition-colors">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-500">24s</span>
                <span className="text-xs font-mono text-emerald-500 font-bold">190 GSM</span>
              </div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Katun Combed Asli</h4>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Bahan katun murni sejuk, ketebalan pas, dan nyaman dipakai iklim tropis.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="p-5 sm:p-6 space-y-1.5 hover:bg-surface/50 transition-colors">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-mono font-black text-amber-500">0</span>
                <span className="text-xs font-mono text-amber-500 font-bold">Min Pcs</span>
              </div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Bebas Pesan Satuan</h4>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Pesan 1 pcs untuk kado atau ribuan pcs seragam event tetap kami layani.
              </p>
            </div>

            {/* Metric 4 */}
            <div className="p-5 sm:p-6 space-y-1.5 hover:bg-surface/50 transition-colors">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-mono font-black text-sky-500">MKS</span>
                <span className="text-xs font-mono text-sky-500 font-bold">Local</span>
              </div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">Workshop Mandiri</h4>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Produksi mandiri di Tallo dengan opsi self-pickup dan antar tim lokal.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 3. WORKSHOP HUB & SOCIAL MATRIX ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Kolom Kiri: Workshop Hub & Titik Pickup (5 cols) */}
          <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-surface/70 dark:bg-black/40 border border-border-subtle/80 dark:border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                    Workshop Aktif
                  </span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  Tallo · Makassar
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-0.5 shadow-xs">
                    <MapPin size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-text-primary">Alamat Workshop</h5>
                    <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                      {workshopAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5 shadow-xs">
                    <Clock size={17} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-text-primary">Jam Operasional</h5>
                    <p className="text-xs text-text-muted mt-0.5">
                      {workshopHours}
                    </p>
                  </div>
                </div>
              </div>

              {/* Layanan Lokasi Khusus Self-Pickup */}
              <div className="pt-3 space-y-1.5 border-t border-border-subtle/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block mb-1">
                  Aturan Pengambilan Pesanan:
                </span>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Ambil mandiri (Self-Pickup) tanpa biaya ongkir</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <span>Tunjukkan invoice atau nomor pesanan saat serah terima</span>
                </div>
              </div>
            </div>

            {/* Google Maps Button */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-brand-accent text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <MapPin size={14} className="text-brand-accent" />
              <span>Petunjuk Arah Google Maps</span>
              <ArrowUpRight size={13} className="opacity-60" />
            </a>
          </div>

          {/* Kolom Kanan: Saluran Resmi & Konsultasi Desain (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-surface/70 dark:bg-black/40 border border-border-subtle/80 dark:border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-5 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold font-mono tracking-widest text-text-muted uppercase block">
                  Saluran Resmi &amp; Konsultasi Desain
                </span>
                <span className="text-[10px] font-mono text-brand-accent font-semibold">
                  Fast Response
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Ikuti proses di balik layar, rilis artikel terbaru, atau diskusikan kebutuhan sablon komunitasmu langsung dengan customer care kami.
              </p>
            </div>

            {/* Curated 4-Channel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. TikTok */}
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-3.5 rounded-2xl bg-black border border-neutral-800 hover:border-neutral-600 transition-all flex items-center justify-between text-white overflow-hidden shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.84-4.48V8.71a8.21 8.21 0 0 0 4.93 1.63V6.89a4.83 4.83 0 0 1-1-.2z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                      TikTok
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">Video</span>
                    </h4>
                    <span className="text-[11px] text-neutral-400 font-mono">@kaoskami</span>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
              </a>

              {/* 2. Instagram */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-3.5 rounded-2xl bg-surface border border-border-subtle hover:border-[#E4405F]/50 transition-all flex items-center justify-between overflow-hidden shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-[#E4405F] transition-colors flex items-center gap-1.5">
                      Instagram
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-elevated text-text-muted font-mono">Katalog</span>
                    </h4>
                    <span className="text-[11px] text-text-muted font-mono">@kaoskami.makassar</span>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-text-muted group-hover:text-[#E4405F] transition-colors" />
              </a>

              {/* 3. WhatsApp CS */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-3.5 rounded-2xl bg-surface border border-border-subtle hover:border-[#25D366]/50 transition-all flex items-center justify-between overflow-hidden shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-[#25D366] transition-colors flex items-center gap-1.5">
                      WhatsApp CS
                      <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                    </h4>
                    <span className="text-[11px] text-text-muted font-mono">{phoneDisplay}</span>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-text-muted group-hover:text-[#25D366] transition-colors" />
              </a>

              {/* 4. Facebook Community */}
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-3.5 rounded-2xl bg-surface border border-border-subtle hover:border-[#1877F2]/50 transition-all flex items-center justify-between overflow-hidden shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-[#1877F2] transition-colors flex items-center gap-1.5">
                      Komunitas FB
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-elevated text-text-muted font-mono">Forum</span>
                    </h4>
                    <span className="text-[11px] text-text-muted font-mono">Kaos Kami Kreatif</span>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-text-muted group-hover:text-[#1877F2] transition-colors" />
              </a>
            </div>

            {/* Direct Contact Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-text-muted border-t border-border-subtle/80">
              <span>Customer Care: <strong className="text-text-primary font-semibold">{phoneDisplay}</strong></span>
              <span>Email: <a href={`mailto:${SHOP_EMAIL}`} className="text-text-primary hover:text-brand-accent transition-colors font-medium">{SHOP_EMAIL}</a></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
