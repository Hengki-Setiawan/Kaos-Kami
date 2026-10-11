"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CmsHeroForm } from "@/components/admin/CmsHeroForm";
import { CmsAnnouncementForm } from "@/components/admin/CmsAnnouncementForm";
import {
  Sparkles,
  Megaphone,
  ShoppingBag,
  Package,
  ChevronRight,
} from "lucide-react";

export function CmsPageTabs() {
  const [activeTab, setActiveTab] = useState<"home" | "announcement">("home");

  return (
    <div className="space-y-6">
      {/* CMS TAB STRIP */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "home"
              ? "bg-surface text-brand-accent border border-border-subtle shadow-xs"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Sparkles size={14} />
          <span>Konten Halaman Beranda (4 Seksi)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("announcement")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "announcement"
              ? "bg-surface text-brand-accent border border-border-subtle shadow-xs"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Megaphone size={14} />
          <span>Pengumuman Promo Ticker</span>
        </button>
      </div>

      {/* ACTIVE TAB CONTENT */}
      {activeTab === "home" && <CmsHeroForm />}
      {activeTab === "announcement" && <CmsAnnouncementForm />}

      {/* FOOTER SHORTCUT PORTAL TO PRODUCTS & INVENTORY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-subtle">
        <Link
          href="/admin/distro-catalog"
          className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-bold">
              <ShoppingBag size={15} />
            </div>
            <div>
              <span className="font-bold text-xs text-text-primary block">
                Katalog Produk Toko E-Commerce
              </span>
              <span className="text-[11px] text-text-muted">
                Kelola foto etalase, harga baju distro jadi, dan mockup
              </span>
            </div>
          </div>
          <ChevronRight size={14} className="text-text-muted group-hover:text-brand-accent transition" />
        </Link>

        <Link
          href="/admin/inventory"
          className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Package size={15} />
            </div>
            <div>
              <span className="font-bold text-xs text-text-primary block">
                Stok Bahan Kaos Polos Studio 3D
              </span>
              <span className="text-[11px] text-text-muted">
                Matriks stok kaos polos, varian warna kain, dan ukuran
              </span>
            </div>
          </div>
          <ChevronRight size={14} className="text-text-muted group-hover:text-brand-accent transition" />
        </Link>
      </div>
    </div>
  );
}
