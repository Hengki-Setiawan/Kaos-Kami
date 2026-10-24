"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import {
  SHOP_HOURS,
  shopWaLink,
} from "@/lib/shop";
import {
  HelpCircle,
  ChevronDown,
  Sparkles,
  CreditCard,
  Truck,
  Shirt,
  Search,
  Droplets,
  Hand,
  Leaf,
  Flame,
  Clock,
} from "lucide-react";

import { FAQS, type FaqItem } from "./faqData";
export { FAQS, type FaqItem };

const CATEGORIES = [
  { id: "all", label: "Semua Pertanyaan", icon: HelpCircle },
  { id: "custom", label: "Kustom & Desain 3D", icon: Shirt },
  { id: "payment", label: "Pembayaran & Komplain", icon: CreditCard },
  { id: "production", label: "Produksi & Ongkir", icon: Truck },
  { id: "care", label: "Bahan & Perawatan", icon: Sparkles },
];

export function FaqClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter((faq) => {
    const matchCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const matchSearch =
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 px-4 pt-24 sm:pt-28 pb-16 max-w-4xl mx-auto space-y-8 w-full">
        <div>
          <Link
            href="/"
            className="font-sans text-xs font-semibold text-text-muted hover:text-brand-accent transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
          <h1 className="font-sans text-3xl md:text-4xl font-bold uppercase text-text-primary mt-4 tracking-tight">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h1>
          <p className="font-sans text-xs text-text-muted mt-2">
            Pusat bantuan & jawaban lengkap seputar sablon DTF, 3D Studio, pembayaran, dan pengiriman di Kaos Kami Makassar.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pertanyaan seputar sablon, ukuran, pengiriman..."
            className="w-full pl-11 pr-4 py-3 rounded-full bg-surface/80 dark:bg-white/5 border border-border-subtle/80 dark:border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-accent placeholder:text-text-muted transition-colors font-sans backdrop-blur-md"
          />
        </div>

        {/* Category Filters — Frameless Pill Capsules */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-full text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer backdrop-blur-md ${
                  isActive
                    ? "bg-brand-accent text-canvas font-bold shadow-[0_2px_12px_rgba(37,99,235,0.4)]"
                    : "bg-surface/80 dark:bg-black/30 border border-border-subtle/80 dark:border-white/10 text-text-muted hover:text-text-primary hover:border-brand-accent/40"
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-surface/70 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/80 dark:border-white/10 space-y-2 text-xs text-text-muted">
              <p>Tidak ada pertanyaan yang sesuai dengan kata kunci pencarian Anda.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-brand-accent font-sans underline hover:brightness-110 cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-surface/75 dark:bg-black/35 backdrop-blur-xl border border-border-subtle/80 dark:border-white/10 overflow-hidden transition-all hover:border-brand-accent/40 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(idx)}
                    className="w-full p-4 md:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs md:text-sm text-text-primary"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle size={15} className="text-brand-accent shrink-0" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-text-muted transition-transform shrink-0 ${
                        isOpen ? "rotate-180 text-brand-accent" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 md:px-5 md:pb-5 text-xs text-text-muted leading-relaxed border-t border-border-subtle/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Panduan Cuci Sablon DTF — care guide 4 kartu */}
        <div className="space-y-4">
          <div>
            <h2 className="font-sans text-xl md:text-2xl font-bold uppercase text-text-primary tracking-tight">
              Panduan Cuci Sablon DTF Agar Awet
            </h2>
            <p className="font-sans text-xs text-text-muted mt-1">
              Empat kebiasaan sederhana supaya warna sablon tetap tajam & tidak retak.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface/60 border border-border-subtle space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Droplets size={17} />
              </div>
              <h3 className="font-sans text-sm font-semibold text-text-primary">
                1. Air Dingin + Baju Dibalik
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Cuci dengan air dingin dan balik pakaian (sablon di dalam) agar gesekan mesin cuci tidak mengikis permukaan sablon.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface/60 border border-border-subtle space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Hand size={17} />
              </div>
              <h3 className="font-sans text-sm font-semibold text-text-primary">
                2. Jangan Sikat Permukaan Sablon
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Jangan menyikat atau mengucek langsung di atas gambar sablon. Cukup kucek lembut area kain di sekitarnya.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface/60 border border-border-subtle space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Leaf size={17} />
              </div>
              <h3 className="font-sans text-sm font-semibold text-text-primary">
                3. Detergen Lembut, Tanpa Pemutih
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Gunakan detergen cair lembut dan hindari pemutih keras agar pigmen warna sablon dan serat combed tidak rusak.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-surface/60 border border-border-subtle space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Flame size={17} />
              </div>
              <h3 className="font-sans text-sm font-semibold text-text-primary">
                4. Setrika dari Bagian Dalam
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Setrika dari balik kain atau lapisi kain tipis. Jangan tempelkan plat setrika panas langsung ke sablon.
              </p>
            </div>
          </div>
        </div>

        {/* Still Have Questions CTA + fallback banner WA CS */}
        <div className="p-6 rounded-2xl bg-surface border border-border-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text-primary">
              Masih punya pertanyaan yang belum terjawab?
            </h3>
            <p className="text-xs text-text-muted">
              Tim Customer Service kami siap membantu Anda konsultasi desain & pesanan sablon.
            </p>
            <p className="text-xs text-text-muted flex items-center gap-1.5 pt-1">
              <Clock size={13} className="text-brand-accent shrink-0" />
              <span>
                Jam layanan WA CS: <strong className="text-text-primary">{SHOP_HOURS}</strong> (di luar jam operasional pesan tetap tercatat dan dibalas berurutan).
              </span>
            </p>
          </div>
          <a
            href={shopWaLink("Halo CS Kaos Kami, saya ingin bertanya hal yang belum ada di FAQ.")}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shrink-0 active:scale-95 shadow-sm"
          >
            Hubungi WhatsApp CS
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
