import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_EMAIL,
  SHOP_SUPPORT_EMAIL,
  SHOP_PHONE_DISPLAY,
  SHOP_HOURS,
  SHOP_MAPS_URL,
  SHOP_INSTAGRAM_URL,
  SHOP_TIKTOK_URL,
  shopWaLink,
} from "@/lib/shop";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building2,
} from "lucide-react";

export const metadata = {
  title: "Kontak & Lokasi Workshop · Kaos Kami Makassar",
  description:
    "Hubungi Kaos Kami Makassar. Alamat workshop konveksi sablon DTF, nomor telepon WhatsApp resmi, email layanan pelanggan, dan jam operasional.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 px-4 py-12 max-w-4xl mx-auto space-y-8 w-full">
        <div>
          <Link
            href="/"
            className="font-mono text-xs text-text-muted hover:text-brand-accent transition-colors"
          >
            ← KEMBALI KE BERANDA
          </Link>
          <h1 className="font-sans text-3xl md:text-4xl font-bold uppercase text-text-primary mt-4 tracking-tight">
            Hubungi Kami (Kontak Resmi)
          </h1>
          <p className="font-mono text-xs text-text-muted mt-2">
            Informasi legalitas identitas usaha, kantor operasional, dan saluran komunikasi resmi Kaos Kami Makassar.
          </p>
        </div>

        {/* Verification Compliance Notice */}
        <div className="p-4 rounded-xl bg-surface border border-border-subtle flex items-start gap-3 text-xs leading-relaxed text-text-muted">
          <ShieldCheck size={20} className="text-brand-accent shrink-0 mt-0.5" />
          <div>
            <strong className="text-text-primary block font-bold mb-0.5">
              Identitas Usaha &amp; Komitmen Pelayanan
            </strong>
            Kaos Kami adalah platform UMKM sablon digital DTF &amp; apparel berbadan usaha yang berbasis di Kota Makassar, Sulawesi Selatan. Transaksi pembayaran non-tunai diproses secara resmi dan aman melalui <strong>iPaymu Payment Gateway</strong> (QRIS Nasional &amp; Virtual Account terdaftar Bank Indonesia). Seluruh kontak di bawah ini terhubung langsung ke manajemen dan customer service resmi kami.
          </div>
        </div>

        {/* Main Grid Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Alamat Fisik Usaha */}
          <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                  Alamat Usaha & Workshop
                </h2>
                <span className="text-[11px] text-text-muted font-mono">Kantor Produksi & Self-Pickup</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-text-muted leading-relaxed">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-brand-accent shrink-0 mt-0.5" />
                <span className="text-text-primary font-medium">{SHOP_WORKSHOP_ADDRESS}</span>
              </div>
              <div className="flex items-center gap-2.5 font-mono text-[11px]">
                <Clock size={15} className="text-brand-accent shrink-0" />
                <span>{SHOP_HOURS}</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={SHOP_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent text-xs font-mono text-text-primary transition-colors"
              >
                <span>Buka Google Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Card 2: Saluran Komunikasi (Telepon & Email) */}
          <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                  Telepon & WhatsApp Resmi
                </h2>
                <span className="text-[11px] text-text-muted font-mono">Customer Service & Bantuan</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-text-muted leading-relaxed">
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="text-text-muted block text-[10px] font-sans font-medium">Nomor telepon / WhatsApp:</span>
                  <a
                    href={shopWaLink("Halo CS Kaos Kami, saya ingin bertanya.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-primary font-bold hover:text-brand-accent font-mono text-sm"
                  >
                    {SHOP_PHONE_DISPLAY}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-brand-accent shrink-0" />
                <div>
                  <span className="text-text-muted block text-[10px] font-sans font-medium">Email korespondensi:</span>
                  <a
                    href={`mailto:${SHOP_EMAIL}`}
                    className="text-text-primary font-mono hover:text-brand-accent"
                  >
                    {SHOP_EMAIL}
                  </a>
                  <span className="text-text-muted block text-[10px]">
                    Email Dukungan: {SHOP_SUPPORT_EMAIL}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <a
                href={shopWaLink("Halo Admin Kaos Kami, saya ingin konsultasi pesanan sablon DTF.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all"
              >
                <MessageSquare size={14} />
                <span>Chat via WhatsApp Langsung</span>
              </a>
            </div>
          </div>
        </div>

        {/* Media Sosial & Saluran Komunitas */}
        <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
            Media Sosial & Komunitas Kami
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Ikuti kami untuk melihat portofolio hasil sablon DTF harian, ulasan pelanggan, dan promo terbaru:
          </p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <a
              href={SHOP_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-[#E4405F] hover:text-[#E4405F] transition-colors"
            >
              Instagram: @kaoskami.makassar
            </a>
            <a
              href={SHOP_TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-canvas border border-border-subtle hover:border-brand-accent hover:text-brand-accent transition-colors"
            >
              TikTok: @kaoskami
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
