import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  SHOP_CONTACT_WHATSAPP,
  SHOP_LAT,
  SHOP_LON,
  SHOP_POSTAL_CODE,
  SHOP_WORKSHOP_ADDRESS,
} from "@/lib/shop";
import {
  Settings,
  Package,
  TicketPercent,
  MapPin,
  FileText,
  Users,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Database,
  MessageSquare,
  Clock,
  Sparkles,
  Info,
  ShoppingBag,
  LayoutGrid,
} from "lucide-react";

export const dynamic = "force-dynamic";

function withDefault(value: string | undefined, fallback: string) {
  if (value && value.trim()) return { text: value, isDefault: false };
  return { text: `${fallback} (default)`, isDefault: true };
}

function SettingRow({
  label,
  value,
  isDefault,
  hideWhenDefault,
}: {
  label: string;
  value: string;
  isDefault?: boolean;
  hideWhenDefault?: boolean;
}) {
  if (hideWhenDefault && isDefault) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border-subtle gap-1">
        <span className="text-text-muted text-xs">{label}</span>
        <span className="text-text-muted italic text-xs">Belum dipasang (default)</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border-subtle gap-1">
      <span className="text-text-muted text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono ${isDefault ? "text-text-muted" : "text-text-primary font-bold"}`}>
          {value}
        </span>
        {isDefault && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
            default
          </span>
        )}
      </div>
    </div>
  );
}

export default async function AdminSettingsPage() {
  let myRole: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
  }

  if (myRole === "PRODUCTION_STAFF") {
    redirect("/admin/production");
  }
  if (myRole === "COURIER") {
    redirect("/admin/deliveries");
  }
  if (!myRole || !["ADMIN", "SUPER_ADMIN"].includes(myRole)) {
    redirect("/?denied=admin");
  }

  const shopAddress = withDefault(process.env.SHOP_WORKSHOP_ADDRESS, SHOP_WORKSHOP_ADDRESS);
  const shopWa = withDefault(process.env.SHOP_CONTACT_WHATSAPP, SHOP_CONTACT_WHATSAPP);
  const shopPostal = withDefault(process.env.SHOP_POSTAL_CODE, SHOP_POSTAL_CODE);
  const siteUrl = withDefault(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000");
  const r2Bucket = withDefault(process.env.R2_BUCKET_NAME, "kaos-kami-assets");
  const r2UrlRaw = (process.env.R2_PUBLIC_URL || "").trim();
  const r2Present = Boolean((process.env.R2_BUCKET_NAME || "").trim() && r2UrlRaw);
  const ipaymuPresent = Boolean(
    (process.env.IPAYMU_VA || "").trim() && (process.env.IPAYMU_API_KEY || "").trim()
  );
  const ipaymuEnv = (process.env.IPAYMU_ENV || "production").trim() || "production";
  const ipaymuVaMasked = process.env.IPAYMU_VA ? `${process.env.IPAYMU_VA.slice(0, 6)}...` : "";

  const MODULE_CARDS = [
    {
      href: "/admin/orders",
      title: "Daftar Semua Pesanan",
      desc: "Lihat seluruh pesanan masuk, filter status bayar/produksi/kirim, dan buka job-ticket tiap order.",
      icon: ShoppingBag,
      badge: "Pesanan",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    },
    {
      href: "/admin/gang-sheet",
      title: "Gang Sheet DTF 100×58",
      desc: "Susun antrean cetak DTF lebar 100 cm, optimasi layout film A3+ sebelum heat press.",
      icon: LayoutGrid,
      badge: "Produksi",
      color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    },
    {
      href: "/admin/catalog",
      title: "Katalog & Stok Bahan",
      desc: "Kelola stok kaos polos combed, hoodie, coach jacket, dan matriks ukuran S–XXL.",
      icon: Package,
      badge: "Inventaris",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      href: "/admin/coupons",
      title: "Kupon & Promo Diskon",
      desc: "Atur kode promo diskon, persentase potongan harga, batas pemakaian, dan periode aktif.",
      icon: TicketPercent,
      badge: "Pemasaran",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      href: "/admin/shipping",
      title: "Tarif & Zona Ongkir",
      desc: "Konfigurasi tarif flat ekspedisi reguler nasional dan kuota API rate AgenWebsite.",
      icon: MapPin,
      badge: "Logistik",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      href: "/admin/cms",
      title: "Konten Website (CMS)",
      desc: "Kelola teks banner beranda, foto lookbook streetwear, dan tautan media sosial resmi.",
      icon: FileText,
      badge: "Tampilan",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      href: "/admin/customers",
      title: "Database Pelanggan",
      desc: "Daftar akun pengguna terdaftar, verifikasi nomor WhatsApp, dan manajemen hak akses staf.",
      icon: Users,
      badge: "Akun & PDP",
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      href: "/admin/laporan",
      title: "Laporan Finansial & Defect QC",
      desc: "Rekapitulasi omzet bulanan, analisis margin sablon DTF, dan metrik defect workshop.",
      icon: TrendingUp,
      badge: "Analitik",
      color: "text-brand-accent bg-brand-accent/10 border-brand-accent/20",
    },
  ];

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto font-sans text-xs">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-[11px] font-semibold uppercase tracking-wider mb-1">
            <Settings size={14} />
            <span>Pusat Kendali Toko & Konfigurasi</span>
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Pengaturan Toko, CMS & Sistem
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Wadah induk pengelolaan inventaris bahan, promosi, tarif pengiriman, CMS etalase, dan konfigurasi API workshop.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="py-2 px-3.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent/50 text-text-primary font-medium text-xs transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <span>Kembali ke Ikhtisar</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* SEKSI 1: HUB MODUL TOKO & CMS */}
      <div className="space-y-4">
        <div>
          <h2 className="font-sans font-bold text-base text-text-primary tracking-tight">
            Hub Pengelolaan Toko & Sub-Modul
          </h2>
          <p className="text-text-muted text-xs mt-0.5">
            Pintasan langsung ke modul fungsional toko tanpa memenuhi bilah navigasi utama.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/[0.03] dark:bg-white/[0.04] border border-border-subtle text-text-muted">
                      {card.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary group-hover:text-brand-accent transition-colors flex items-center gap-1.5">
                      <span>{card.title}</span>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-text-muted text-[11px] leading-relaxed mt-1">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-medium text-brand-accent">
                  <span>Buka Modul</span>
                  <ExternalLink size={12} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* SEKSI 2 & 3: IDENTITAS TOKO & STATUS INTEGRASI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identitas Workshop Kaos Kami */}
        <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
              <MapPin size={15} className="text-brand-accent" />
              <span>Identitas Workshop Makassar</span>
            </h3>
            <span className="px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-bold">
              OPERASIONAL
            </span>
          </div>

          <div className="space-y-0.5">
            <SettingRow label="Alamat Workshop" value={shopAddress.text} isDefault={shopAddress.isDefault} />
            <SettingRow label="Kode Pos Asal (Tarif)" value={shopPostal.text} isDefault={shopPostal.isDefault} />
            <SettingRow label="WhatsApp Resmi CS" value={shopWa.text} isDefault={shopWa.isDefault} />
            <SettingRow label="Site URL Publik" value={siteUrl.text} isDefault={siteUrl.isDefault} />
            <SettingRow label="R2 Assets Bucket" value={r2Bucket.text} isDefault={r2Bucket.isDefault} />
            <SettingRow label="R2 Public Gateway" value={r2UrlRaw || "Default terproteksi"} isDefault={!r2UrlRaw} />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-1">
              <span className="text-text-muted text-xs font-medium">Koordinat GPS (Lat, Lon)</span>
              <span className="text-xs font-mono text-text-primary font-bold">
                {SHOP_LAT}, {SHOP_LON}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-subtle text-[11px] text-text-muted flex items-start gap-2">
            <Info size={14} className="text-brand-accent shrink-0 mt-0.5" />
            <span>
              Nilai operasional dapat dioverride kapan saja melalui environment variables server (SHOP_LAT, SHOP_LON, SHOP_WORKSHOP_ADDRESS) tanpa perlu rebuild kode.
            </span>
          </div>
        </div>

        {/* Status Integrasi Layanan Eksternal */}
        <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-500" />
              <span>Status Integrasi Layanan (Live)</span>
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              AKTIF
            </span>
          </div>

          <div className="space-y-3">
            {/* R2 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-canvas border border-border-subtle">
              <div className="flex items-center gap-2.5">
                <Database size={16} className="text-brand-accent" />
                <div>
                  <span className="font-bold text-xs text-text-primary block">Cloudflare R2 Storage</span>
                  <span className="text-[10px] text-text-muted">Master Decal, Asset 3D & Print Files 300 DPI</span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  r2Present
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}
              >
                {r2Present ? "● TERPASANG" : "○ DEFAULT FALLBACK"}
              </span>
            </div>

            {/* iPaymu */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-canvas border border-border-subtle">
              <div className="flex items-center gap-2.5">
                <CreditCard size={16} className="text-emerald-500" />
                <div>
                  <span className="font-bold text-xs text-text-primary block">iPaymu Payment Gateway (QRIS Nasional & Bank Transfer)</span>
                  <span className="text-[10px] text-text-muted">
                    Mode {ipaymuEnv.toUpperCase()} • Direct QRIS (0.7%) {ipaymuVaMasked ? `• VA: ${ipaymuVaMasked}` : ""}
                  </span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  ipaymuPresent
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}
              >
                {ipaymuPresent ? "● TERPASANG (LIVE)" : "○ BELUM DIPASANG"}
              </span>
            </div>

            {/* Fonnte WhatsApp */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-canvas border border-border-subtle">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={16} className="text-emerald-500" />
                <div>
                  <span className="font-bold text-xs text-text-primary block">WhatsApp Gateway (Fonnte)</span>
                  <span className="text-[10px] text-text-muted">Notifikasi Real-Time & Verifikasi OTP Pelanggan</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                ● TERPASANG
              </span>
            </div>
          </div>

          <p className="text-[10px] text-text-muted leading-relaxed">
            Keamanan API: Sesuai standar audit OWASP, kunci rahasia (secret key, token autentikasi) tidak pernah ditampilkan di antarmuka web dan tersimpan aman di server environment.
          </p>
        </div>
      </div>

      {/* SEKSI 4: TEMPLATE NOTIFIKASI WHATSAPP OTOMATIS */}
      <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={15} className="text-brand-accent" />
              <span>Template Notifikasi WhatsApp Otomatis (Fonnte Engine)</span>
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Pesan transaksi yang dikirim secara otomatis ke nomor pembeli pada setiap tahapan pesanan.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.04] border border-border-subtle text-[10px] font-bold text-text-muted">
            3 SKENARIO
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              key: "order_confirmed",
              label: "Pembayaran Dikonfirmasi",
              tpl: "Halo Kak {{customerName}}, pesanan {{orderNumber}} senilai Rp {{totalIdr}} telah dikonfirmasi dan masuk antrean sablon DTF workshop. Pantau status: {{invoiceUrl}}",
            },
            {
              key: "printing_started",
              label: "Mulai Diproses / Dicetak",
              tpl: "Halo Kak {{customerName}}, pesanan {{orderNumber}} saat ini sedang dalam proses cetak DTF / heat press ({{stageName}}). Cek progres: {{invoiceUrl}}",
            },
            {
              key: "shipped",
              label: "Paket Diantar / Siap Ambil",
              tpl: "Kabar baik Kak {{customerName}}! Pesanan {{orderNumber}} telah selesai diproduksi dan {{stageName}}. No. Resi/Info: {{trackingNumber}} • {{invoiceUrl}}",
            },
          ].map((t) => (
            <div key={t.key} className="p-4 rounded-xl bg-canvas border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-brand-accent">{t.label}</span>
                <span className="text-[9px] font-mono text-text-muted">{t.key}</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed italic">
                &ldquo;{t.tpl}&rdquo;
              </p>
              {/* Preview gelembung chat WA hijau (UI-only, data contoh statis;
                  template di file ini read-only — tak ada textarea/state). */}
              <div
                aria-label={`Pratinjau WhatsApp: ${t.label}`}
                className="rounded-lg bg-[#ECE5DD] dark:bg-[#0B141A] p-2.5 border border-border-subtle"
              >
                <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Pratinjau WA
                </span>
                <div className="ml-auto max-w-[95%] w-fit rounded-lg rounded-tr-none bg-[#DCF8C6] dark:bg-[#005C4B] px-2.5 py-1.5 shadow-sm">
                  <p className="text-[11px] leading-relaxed text-slate-900 dark:text-slate-50">
                    {t.tpl
                      .replace("{{customerName}}", "Hengki")
                      .replace("{{orderNumber}}", "KK-2026-0001")
                      .replace("{{totalIdr}}", "150.000")
                      .replace("{{stageName}}", "Cetak DTF")
                      .replace("{{trackingNumber}}", "JNE-123456")
                      .replace("{{invoiceUrl}}", "kaoskami.biz.id/invoice/KK-2026-0001")}
                  </p>
                  <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-slate-600 dark:text-slate-200/80">
                    <span>09.41</span>
                    <span aria-hidden="true" className="font-bold text-sky-600 dark:text-sky-300">✓✓</span>
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-border-subtle text-[9px] font-mono text-text-muted">
                Variabel: customerName, orderNumber, totalIdr, stageName, invoiceUrl
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
