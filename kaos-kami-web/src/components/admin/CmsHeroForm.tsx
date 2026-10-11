"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Layers,
  RotateCw,
  Building2,
  ShoppingBag,
  Share2,
  MapPin,
  Clock,
  Phone,
  Instagram,
  Facebook,
  ExternalLink,
} from "lucide-react";
import { DEFAULT_HERO } from "@/lib/cms";

export function CmsHeroForm() {
  // Tab CMS aktif
  const [activeTab, setActiveTab] = useState<"story3d" | "showcase" | "about" | "social" | "workshop">("story3d");

  // Fase 1: Hero
  const [heroTitle, setHeroTitle] = useState(DEFAULT_HERO.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(DEFAULT_HERO.heroSubtitle);

  // Fase 2: Specs Bahan
  const [specsTitle, setSpecsTitle] = useState(DEFAULT_HERO.specsTitle || "");
  const [specsSubtitle, setSpecsSubtitle] = useState(DEFAULT_HERO.specsSubtitle || "");

  // Fase 3: Back Graphic
  const [backGraphicTitle, setBackGraphicTitle] = useState(DEFAULT_HERO.backGraphicTitle || "");
  const [backGraphicSubtitle, setBackGraphicSubtitle] = useState(DEFAULT_HERO.backGraphicSubtitle || "");

  // Etalase Showcase
  const [showcaseBadge, setShowcaseBadge] = useState(DEFAULT_HERO.showcaseBadge || "");
  const [showcaseTitle, setShowcaseTitle] = useState(DEFAULT_HERO.showcaseTitle || "");
  const [showcaseSubtitle, setShowcaseSubtitle] = useState(DEFAULT_HERO.showcaseSubtitle || "");

  // Profil Workshop (About Us)
  const [aboutBadge, setAboutBadge] = useState(DEFAULT_HERO.aboutBadge || "");
  const [aboutTitle, setAboutTitle] = useState(DEFAULT_HERO.aboutTitle || "");
  const [aboutStory, setAboutStory] = useState(DEFAULT_HERO.aboutStory || "");

  // Media Sosial
  const [instagramUrl, setInstagramUrl] = useState(DEFAULT_HERO.instagramUrl || "");
  const [tiktokUrl, setTiktokUrl] = useState(DEFAULT_HERO.tiktokUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(DEFAULT_HERO.facebookUrl || "");
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_HERO.whatsappNumber || "");

  // Kontak & Lokasi Workshop
  const [workshopAddress, setWorkshopAddress] = useState(DEFAULT_HERO.workshopAddress || "");
  const [workshopHours, setWorkshopHours] = useState(DEFAULT_HERO.workshopHours || "");
  const [workshopMapsUrl, setWorkshopMapsUrl] = useState(DEFAULT_HERO.workshopMapsUrl || "");

  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/cms");
        const d = await res.json().catch(() => null);
        if (alive && res.ok && d) {
          if (typeof d.heroTitle === "string") setHeroTitle(d.heroTitle);
          if (typeof d.heroSubtitle === "string") setHeroSubtitle(d.heroSubtitle);
          if (typeof d.specsTitle === "string") setSpecsTitle(d.specsTitle);
          if (typeof d.specsSubtitle === "string") setSpecsSubtitle(d.specsSubtitle);
          if (typeof d.backGraphicTitle === "string") setBackGraphicTitle(d.backGraphicTitle);
          if (typeof d.backGraphicSubtitle === "string") setBackGraphicSubtitle(d.backGraphicSubtitle);
          if (typeof d.showcaseBadge === "string") setShowcaseBadge(d.showcaseBadge);
          if (typeof d.showcaseTitle === "string") setShowcaseTitle(d.showcaseTitle);
          if (typeof d.showcaseSubtitle === "string") setShowcaseSubtitle(d.showcaseSubtitle);
          if (typeof d.aboutBadge === "string") setAboutBadge(d.aboutBadge);
          if (typeof d.aboutTitle === "string") setAboutTitle(d.aboutTitle);
          if (typeof d.aboutStory === "string") setAboutStory(d.aboutStory);
          if (typeof d.instagramUrl === "string") setInstagramUrl(d.instagramUrl);
          if (typeof d.tiktokUrl === "string") setTiktokUrl(d.tiktokUrl);
          if (typeof d.facebookUrl === "string") setFacebookUrl(d.facebookUrl);
          if (typeof d.whatsappNumber === "string") setWhatsappNumber(d.whatsappNumber);
          if (typeof d.workshopAddress === "string") setWorkshopAddress(d.workshopAddress);
          if (typeof d.workshopHours === "string") setWorkshopHours(d.workshopHours);
          if (typeof d.workshopMapsUrl === "string") setWorkshopMapsUrl(d.workshopMapsUrl);
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    if (heroTitle.trim().length < 2) {
      setMsg({ type: "error", text: "Judul Hero minimal 2 karakter." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroTitle: heroTitle.trim(),
          heroSubtitle: heroSubtitle.trim(),
          specsTitle: specsTitle.trim(),
          specsSubtitle: specsSubtitle.trim(),
          backGraphicTitle: backGraphicTitle.trim(),
          backGraphicSubtitle: backGraphicSubtitle.trim(),
          showcaseBadge: showcaseBadge.trim(),
          showcaseTitle: showcaseTitle.trim(),
          showcaseSubtitle: showcaseSubtitle.trim(),
          aboutBadge: aboutBadge.trim(),
          aboutTitle: aboutTitle.trim(),
          aboutStory: aboutStory.trim(),
          instagramUrl: instagramUrl.trim(),
          tiktokUrl: tiktokUrl.trim(),
          facebookUrl: facebookUrl.trim(),
          whatsappNumber: whatsappNumber.trim(),
          workshopAddress: workshopAddress.trim(),
          workshopHours: workshopHours.trim(),
          workshopMapsUrl: workshopMapsUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menyimpan konten");
      setMsg({ type: "success", text: "Seluruh konten beranda berhasil disimpan ke Cloudflare R2!" });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Gagal menyimpan konten CMS" });
    } finally {
      setBusy(false);
    }
  };

  const heroLines = (heroTitle || "").split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-6 shadow-xs font-sans">
      {/* HEADER SECTION WITH SIMULATOR SWITCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text-primary">Konten Beranda &amp; Identitas Kaos Kami</h3>
            <p className="text-[11px] text-text-muted">
              Kelola teks 3D Story, etalase, media sosial, dan lokasi workshop Tallo secara langsung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] text-text-muted font-medium">Simulator:</span>
          <div className="flex items-center p-0.5 rounded-lg bg-surface-elevated border border-border-subtle">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`p-1.5 rounded-md text-xs transition ${
                previewMode === "desktop"
                  ? "bg-surface text-brand-accent shadow-xs font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Pratinjau Layar Laptop / Desktop"
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`p-1.5 rounded-md text-xs transition ${
                previewMode === "mobile"
                  ? "bg-surface text-brand-accent shadow-xs font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Pratinjau Layar Smartphone"
            >
              <Smartphone size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border-subtle scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("story3d")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "story3d"
              ? "bg-brand-accent text-canvas shadow-xs"
              : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
          }`}
        >
          <Sparkles size={13} />
          <span>3D Story (Fase 1-3)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("showcase")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "showcase"
              ? "bg-brand-accent text-canvas shadow-xs"
              : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
          }`}
        >
          <ShoppingBag size={13} />
          <span>Etalase Produk</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("about")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "about"
              ? "bg-brand-accent text-canvas shadow-xs"
              : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
          }`}
        >
          <Building2 size={13} />
          <span>Kisah Workshop</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("social")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "social"
              ? "bg-brand-accent text-canvas shadow-xs"
              : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
          }`}
        >
          <Share2 size={13} />
          <span>Media Sosial</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("workshop")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "workshop"
              ? "bg-brand-accent text-canvas shadow-xs"
              : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
          }`}
        >
          <MapPin size={13} />
          <span>Kontak &amp; Lokasi Fisik</span>
        </button>
      </div>

      {/* FORM CONTENTS PER TAB */}
      <div className="space-y-4">
        {/* TAB 1: 3D STORY (FASE 1, 2, 3) */}
        {activeTab === "story3d" && (
          <div className="space-y-4">
            {/* SEKSI 1: HERO */}
            <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <Sparkles size={14} className="text-brand-accent" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                  1. Fase 1: Hero Banner Utama (Kaos Tampak Depan 3D)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Judul Utama Hero (Enter untuk baris baru)
                  </label>
                  <textarea
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    rows={2}
                    maxLength={100}
                    placeholder={"BIKIN KAOS IMPIANMU\nDENGAN MOCKUP 3D"}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase focus:outline-none focus:border-brand-accent transition leading-snug"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Deskripsi Subtitle &amp; Meta SEO
                  </label>
                  <textarea
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Platform sablon DTF kustom satuan & kaos polos katun combed berkualitas di Makassar..."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 2: SPECS */}
            <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <Layers size={14} className="text-brand-accent" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                  2. Fase 2: Spesifikasi Bahan (Kamera 3D Zoom Bahan)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Headline Spesifikasi
                  </label>
                  <input
                    value={specsTitle}
                    onChange={(e) => setSpecsTitle(e.target.value)}
                    maxLength={100}
                    placeholder="KATUN COMBED NYAMAN & STANDAR DISTRO"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs focus:outline-none focus:border-brand-accent transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Keterangan Singkat Bahan &amp; Sablon
                  </label>
                  <input
                    value={specsSubtitle}
                    onChange={(e) => setSpecsSubtitle(e.target.value)}
                    maxLength={300}
                    placeholder="100% serat alami sejuk, lembut & menyerap keringat. Sablon DTF 300 DPI tahan cuci 50x."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 3: BACK GRAPHIC */}
            <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <RotateCw size={14} className="text-brand-accent" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                  3. Fase 3: Grafis Belakang (Kaos Memutar 180°)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Headline Inspeksi Punggung
                  </label>
                  <textarea
                    value={backGraphicTitle}
                    onChange={(e) => setBackGraphicTitle(e.target.value)}
                    rows={2}
                    maxLength={100}
                    placeholder={"LIHAT HASILNYA\nSEBELUM DICETAK"}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase focus:outline-none focus:border-brand-accent transition leading-snug"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Keterangan Kalibrasi Skala Sablon
                  </label>
                  <textarea
                    value={backGraphicSubtitle}
                    onChange={(e) => setBackGraphicSubtitle(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Inspeksi depan & punggung 360°. Skala sentimeter nyata terkalibrasi 1:1 tanpa salah cetak."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHOWCASE ETALASE */}
        {activeTab === "showcase" && (
          <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
              <ShoppingBag size={14} className="text-brand-accent" />
              <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                Header Etalase Produk Baju Jadi (Katalog)
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                  Tagline / Badge Atas
                </label>
                <input
                  value={showcaseBadge}
                  onChange={(e) => setShowcaseBadge(e.target.value)}
                  maxLength={80}
                  placeholder="READY STOCK // MAKASSAR HYPERLOCAL"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-mono text-xs focus:outline-none focus:border-brand-accent transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                  Judul Etalase
                </label>
                <input
                  value={showcaseTitle}
                  onChange={(e) => setShowcaseTitle(e.target.value)}
                  maxLength={100}
                  placeholder="ETALASE PRODUK"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs uppercase focus:outline-none focus:border-brand-accent transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                  Deskripsi Singkat Koleksi
                </label>
                <input
                  value={showcaseSubtitle}
                  onChange={(e) => setShowcaseSubtitle(e.target.value)}
                  maxLength={300}
                  placeholder="Streetwear kurasi Kaos Kami dengan bahan katun combed adem & sablon DTF presisi."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT US */}
        {activeTab === "about" && (
          <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
              <Building2 size={14} className="text-brand-accent" />
              <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                Kisah Brand &amp; Workshop (Tentang Kami)
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Badge Header Kisah
                  </label>
                  <input
                    value={aboutBadge}
                    onChange={(e) => setAboutBadge(e.target.value)}
                    maxLength={80}
                    placeholder="BRAND APPAREL & SABLON DTF MAKASSAR · EST. 2024"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-mono text-xs focus:outline-none focus:border-brand-accent transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                    Judul Seksi Profil (Enter untuk baris baru)
                  </label>
                  <textarea
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    rows={2}
                    maxLength={120}
                    placeholder={"Kaos Komunitas Berkualitas,\nDibuat Mandiri dengan Standar Distro"}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-bold text-xs focus:outline-none focus:border-brand-accent transition leading-snug"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">
                  Narasi Cerita Lengkap Workshop
                </label>
                <textarea
                  value={aboutStory}
                  onChange={(e) => setAboutStory(e.target.value)}
                  rows={5}
                  maxLength={800}
                  placeholder="Kaos Kami adalah brand apparel independen Kota Makassar yang berfokus pada kaos komunitas, pop culture, dan sablon digital DTF presisi tinggi sejak 2024..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MEDIA SOSIAL */}
        {activeTab === "social" && (
          <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
              <Share2 size={14} className="text-brand-accent" />
              <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                Tautan Media Sosial Resmi (Tombol Footer &amp; Seksi Workshop)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                  <Instagram size={12} className="text-[#E4405F]" />
                  <span>Instagram URL / Profil</span>
                </label>
                <input
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  maxLength={200}
                  placeholder="https://www.instagram.com/kaoskami.makassar"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-mono focus:outline-none focus:border-brand-accent transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                  <span className="font-bold">♪</span>
                  <span>TikTok URL / Akun</span>
                </label>
                <input
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  maxLength={200}
                  placeholder="https://www.tiktok.com/@kaoskami"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-mono focus:outline-none focus:border-brand-accent transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-500" />
                  <span>WhatsApp CS / Konsultasi</span>
                </label>
                <input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  maxLength={50}
                  placeholder="0895803463032"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-mono focus:outline-none focus:border-brand-accent transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                  <Facebook size={12} className="text-[#1877F2]" />
                  <span>Komunitas Facebook (Grup / Halaman)</span>
                </label>
                <input
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  maxLength={200}
                  placeholder="https://www.facebook.com/groups/kaoskami"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-mono focus:outline-none focus:border-brand-accent transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: KONTAK & WORKSHOP */}
        {activeTab === "workshop" && (
          <div className="p-4 rounded-xl bg-surface-elevated/30 border border-border-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
              <MapPin size={14} className="text-brand-accent" />
              <h4 className="font-bold text-xs uppercase tracking-wide text-text-primary">
                Identitas Lokasi Workshop Tallo Makassar
              </h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-brand-accent" />
                  <span>Alamat Lengkap Workshop (Tampil di Nota &amp; Footer)</span>
                </label>
                <input
                  value={workshopAddress}
                  onChange={(e) => setWorkshopAddress(e.target.value)}
                  maxLength={300}
                  placeholder="Jl. Galangan Kapal, Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90211"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-500" />
                    <span>Jam Operasional Workshop</span>
                  </label>
                  <input
                    value={workshopHours}
                    onChange={(e) => setWorkshopHours(e.target.value)}
                    maxLength={100}
                    placeholder="Senin – Sabtu · 09:00 – 21:00 WITA"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5">
                    <ExternalLink size={12} className="text-sky-500" />
                    <span>Tautan Google Maps Workshop</span>
                  </label>
                  <input
                    value={workshopMapsUrl}
                    onChange={(e) => setWorkshopMapsUrl(e.target.value)}
                    maxLength={300}
                    placeholder="https://maps.google.com/?q=-5.106018,119.432396"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary text-xs font-mono focus:outline-none focus:border-brand-accent transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LIVE INTERACTIVE SIMULATOR */}
      <div className="pt-2 border-t border-border-subtle">
        <span className="text-[10px] uppercase font-bold text-text-muted block mb-2">
          Simulasi Pratinjau ({previewMode === "desktop" ? "Layar Laptop / Lebar" : "Layar Smartphone"}):
        </span>
        <div
          className={`mx-auto rounded-xl border border-border-subtle bg-canvas p-4 space-y-3 transition-all ${
            previewMode === "mobile" ? "max-w-[320px]" : "w-full"
          }`}
        >
          <div className="rounded-lg bg-surface border border-border-subtle p-4 space-y-2 text-center">
            <span className="text-[10px] font-semibold text-brand-accent block">
              Kaos Kami // 3D DTF Studio Makassar
            </span>
            <h4 className="font-sans font-black uppercase tracking-tight leading-tight text-text-primary text-base whitespace-pre-line">
              {heroLines.length > 0 ? heroLines.join("\n") : "— Judul Hero —"}
            </h4>
            <p className="font-sans text-[11px] text-text-muted leading-relaxed">
              {heroSubtitle.trim() || "— Deskripsi subtitle —"}
            </p>
          </div>
        </div>
      </div>

      {/* SAVE CONTROLS & FEEDBACK */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle">
        {msg ? (
          <span
            className={`text-xs flex items-center gap-1.5 ${
              msg.type === "success"
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-rose-500 font-medium"
            }`}
          >
            {msg.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>{msg.text}</span>
          </span>
        ) : (
          <span className="text-[11px] text-text-muted">Tersimpan aman ke Cloudflare R2</span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-95 transition disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {busy ? "Menyimpan ke R2..." : "Simpan Seluruh Konten Beranda"}
        </button>
      </div>
    </div>
  );
}
