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
  ExternalLink,
  Users,
  Video,
  Instagram,
  MessageCircle,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  PackageCheck,
} from "lucide-react";

export const AboutWorkshopSection: React.FC = () => {
  return (
    <section
      id="tentang-kami"
      className="relative z-20 bg-canvas px-6 md:px-12 py-16 md:py-24 border-t border-border-subtle scroll-mt-20 font-mono text-xs"
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Minimalist Editorial Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-border-subtle">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block">
              MAKASSAR HQ // WORKSHOP & KOMUNITAS
            </span>
            <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-text-primary">
              WORKSHOP RESMI & KOMUNITAS
            </h2>
          </div>
          <p className="text-text-muted text-xs font-sans max-w-md leading-relaxed md:text-right">
            Ruang fisik produksi sablon DTF dan wadah kolaborasi kreator apparel di Kota Makassar.
          </p>
        </div>

        {/* 2-Column Minimalist Layout: Left HQ Card + Right Social Tiles */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Workshop Physical Identity (5 Cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-surface/50 border border-border-subtle space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    LOKASI WORKSHOP
                  </span>
                  <p className="text-xs font-sans text-text-primary font-semibold leading-snug">
                    {SHOP_WORKSHOP_ADDRESS}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5">
                  <Clock size={16} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    JAM OPERASIONAL
                  </span>
                  <p className="text-xs font-mono text-text-primary">
                    {SHOP_HOURS}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border-subtle">
              <a
                href={SHOP_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-primary font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <MapPin size={13} />
                <span>Google Maps</span>
                <ArrowUpRight size={12} className="opacity-60" />
              </a>

              <a
                href={shopWaLink("Halo CS Kaos Kami Makassar, saya ingin konsultasi sablon.")}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
                <ArrowUpRight size={12} className="opacity-60" />
              </a>
            </div>

            {/* Subtle Service Pills */}
            <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-text-muted">
              <span className="px-2.5 py-1 rounded-md bg-canvas border border-border-subtle">
                Self Pick-Up (Ambil Sendiri)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-canvas border border-border-subtle">
                Fitting Ukuran & Raba Kain
              </span>
            </div>
          </div>

          {/* Right Column: Icon-First Social & Community Hub (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
              MEDIA SOSIAL & KOMUNITAS RESMI
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* TikTok Tile */}
              <a
                href={SHOP_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-surface/50 border border-border-subtle hover:border-brand-accent hover:bg-surface transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                    <Video size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-brand-accent transition-colors">
                      TikTok @kaoskami
                    </h4>
                    <span className="text-[10px] text-text-muted">Behind The Scenes Sablon DTF</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-brand-accent transition-colors" />
              </a>

              {/* Facebook Community Group Tile */}
              <a
                href={SHOP_FB_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-surface/50 border border-border-subtle hover:border-[#1877F2] hover:bg-surface transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/30 flex items-center justify-center text-[#1877F2] shrink-0 group-hover:scale-105 transition-transform">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-[#1877F2] transition-colors">
                      Grup Komunitas FB
                    </h4>
                    <span className="text-[10px] text-text-muted">Komunitas Kreatif Makassar</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-[#1877F2] transition-colors" />
              </a>

              {/* Instagram Tile */}
              <a
                href={SHOP_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-surface/50 border border-border-subtle hover:border-[#E4405F] hover:bg-surface transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E4405F]/10 border border-[#E4405F]/30 flex items-center justify-center text-[#E4405F] shrink-0 group-hover:scale-105 transition-transform">
                    <Instagram size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-[#E4405F] transition-colors">
                      Instagram Official
                    </h4>
                    <span className="text-[10px] text-text-muted">@kaoskami.makassar Lookbook</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-[#E4405F] transition-colors" />
              </a>

              {/* WhatsApp Broadcast / CS Tile */}
              <a
                href={shopWaLink("Halo CS Kaos Kami, saya ingin terhubung dengan saluran info.")}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-surface/50 border border-border-subtle hover:border-[#25D366] hover:bg-surface transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shrink-0 group-hover:scale-105 transition-transform">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-text-primary group-hover:text-[#25D366] transition-colors">
                      Saluran WhatsApp
                    </h4>
                    <span className="text-[10px] text-text-muted">Update Slot & Antrean Cepat</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-text-muted group-hover:text-[#25D366] transition-colors" />
              </a>
            </div>

            {/* Direct Contact Bar */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-text-muted border-t border-border-subtle">
              <span>Customer Care: <strong className="text-text-primary">{SHOP_PHONE_DISPLAY}</strong></span>
              <span>Email: <a href={`mailto:${SHOP_EMAIL}`} className="text-text-primary hover:text-brand-accent">{SHOP_EMAIL}</a></span>
            </div>
          </div>
        </div>

        {/* Minimalist Trust Strip: 4 Inline Badges */}
        <div className="pt-6 border-t border-border-subtle grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <div className="flex items-center gap-2 text-text-primary">
            <Truck size={15} className="text-brand-accent shrink-0" />
            <span>Gratis Antar Se-Makassar</span>
          </div>
          <div className="flex items-center gap-2 text-text-primary">
            <Sparkles size={15} className="text-brand-accent shrink-0" />
            <span>Bebas Satuan (0 Min Order)</span>
          </div>
          <div className="flex items-center gap-2 text-text-primary">
            <ShieldCheck size={15} className="text-brand-accent shrink-0" />
            <span>Garansi Sablon Presisi 30cm</span>
          </div>
          <div className="flex items-center gap-2 text-text-primary">
            <PackageCheck size={15} className="text-brand-accent shrink-0" />
            <span>Siap Kirim Ekspedisi Nasional</span>
          </div>
        </div>
      </div>
    </section>
  );
};
