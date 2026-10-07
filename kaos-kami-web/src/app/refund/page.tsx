import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_EMAIL,
  SHOP_PHONE_DISPLAY,
  shopWaLink,
} from "@/lib/shop";
import { ShieldCheck, AlertCircle, RefreshCw, FileText } from "lucide-react";

export const metadata = {
  title: "Kebijakan Pengembalian Dana (Refund Policy) · Kaos Kami Makassar",
  description:
    "Kebijakan pengembalian dana (refund) dan garansi ganti baru produk sablon DTF Kaos Kami Kota Makassar.",
};

const UPDATED = new Date().toLocaleDateString("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function RefundPage() {
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
            Kebijakan Pengembalian Dana & Barang
          </h1>
          <p className="font-mono text-xs text-text-muted mt-2">
            Refund & Replacement Policy · Terakhir diperbarui: {UPDATED} (Kaos Kami Makassar).
          </p>
        </div>

        {/* Highlight Banner */}
        <div className="p-5 rounded-2xl bg-brand-accent/5 border border-brand-accent/30 flex items-start gap-3 text-xs leading-relaxed text-text-muted">
          <ShieldCheck size={22} className="text-brand-accent shrink-0 mt-0.5" />
          <div>
            <strong className="text-text-primary block font-bold text-sm mb-1">
              Garansi Kepuasan Pelanggan 100%
            </strong>
            Kami berkomitmen memberikan kualitas sablon DTF terbaik dengan bahan katun combed premium. Jika pesanan Anda mengalami cacat produksi fatal, salah ukuran dari pihak kami, atau sablon rusak saat diterima, kami siap memberikan <strong>Cetak Ulang Gratis (Ganti Baru)</strong> atau <strong>Pengembalian Dana Penuh (Refund)</strong>.
          </div>
        </div>

        <div className="space-y-6 text-xs text-text-muted leading-relaxed">
          {/* Section 1: Hakikat Produk Kustom */}
          <section className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                01
              </span>
              Prinsip Dasar Produk Kustom (Made-to-Order)
            </h2>
            <p>
              Produk sablon custom dibuat secara spesifik sesuai desain, ukuran, dan spesifikasi yang ditentukan oleh Pelanggan melalui 3D Customizer kami. Oleh karena itu:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                Pesanan yang telah memasuki antrean produksi cetak tidak dapat dibatalkan atau diubah desainnya secara sepihak.
              </li>
              <li>
                Pengembalian tidak berlaku untuk kesalahan pemilihan ukuran (size chart) atau kesalahan penulisan/desain yang dibuat sendiri oleh Pelanggan. Kami menyediakan panduan ukuran lengkap di setiap halaman produk.
              </li>
            </ul>
          </section>

          {/* Section 2: Kriteria Berhak Refund / Ganti Baru */}
          <section className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-xs">
                02
              </span>
              Kriteria Klaim yang Diterima
            </h2>
            <p>
              Anda berhak mendapatkan penggantian produk (cetak baru) atau pengembalian dana bila memenuhi salah satu kondisi berikut:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1">
                <span className="font-bold text-text-primary block">1. Cacat Sablon Fatal</span>
                <span>Sablon DTF mengelupas, tinta luntur, bergaris akibat printhead macet, atau posisi sablon terbalik.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1">
                <span className="font-bold text-text-primary block">2. Kesalahan Item dari Workshop</span>
                <span>Bahan, jenis pakaian, warna, atau ukuran fisik baju yang dikirim berbeda dengan invoice pesanan.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1">
                <span className="font-bold text-text-primary block">3. Kerusakan Fisik Garmen</span>
                <span>Baju sobek, jahitan lepas, atau terdapat noda permanen sebelum pakaian dicuci atau digunakan.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-1">
                <span className="font-bold text-text-primary block">4. Paket Hilang dalam Ekspedisi</span>
                <span>Barang hilang saat pengiriman yang dibuktikan dengan surat investigasi resmi dari pihak ekspedisi.</span>
              </div>
            </div>
          </section>

          {/* Section 3: Syarat & Alur Pengajuan Klaim */}
          <section className="space-y-3 p-5 rounded-2xl bg-surface/50 border border-border-subtle">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                03
              </span>
              Syarat & Alur Pengajuan Klaim (SLA)
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-accent text-canvas font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </div>
                <div>
                  <strong className="text-text-primary block">Batas Waktu Pelaporan (Maksimal 2x24 Jam)</strong>
                  Klaim harus diajukan selambat-lambatnya 2 hari sejak paket dinyatakan terkirim oleh kurir atau diambil di workshop.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-accent text-canvas font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </div>
                <div>
                  <strong className="text-text-primary block">Wajib Menyertakan Video Unboxing</strong>
                  Rekaman video paket dari kondisi tersegel rapi hingga diperiksa tanpa jeda (cut/edit), sebagai bukti objektif kondisi barang saat tiba.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-accent text-canvas font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </div>
                <div>
                  <strong className="text-text-primary block">Kondisi Pakaian Belum Digunakan & Belum Dicuci</strong>
                  Tag label masih utuh, tidak berbau parfum, dan belum dicuci memakai detergen.
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Mekanisme Pengembalian Dana */}
          <section className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                04
              </span>
              Mekanisme & Waktu Proses Refund
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                <strong>Opsi Utama (Cetak Baru):</strong> Kami memprioritaskan mencetak ulang pesanan Anda dengan antrean prioritas ekspres tanpa biaya tambahan sepeser pun.
              </li>
              <li>
                <strong>Opsi Pengembalian Dana (Refund):</strong> Jika Pelanggan menghendaki dana dikembalikan, refund akan ditransfer ke rekening bank atau e-wallet Pelanggan dalam waktu <strong>1 - 3 hari kerja</strong> setelah permohonan disetujui tim QC.
              </li>
              <li>
                Nominal refund adalah 100% dari harga barang yang mengalami cacat atau nilai total pesanan sesuai kesepakatan penanganan keluhan.
              </li>
            </ul>
          </section>

          {/* Section 5: Kontak CS */}
          <section className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                05
              </span>
              Cara Mengajukan Klaim Refund / Retur
            </h2>
            <p>
              Silakan hubungi tim Customer Service kami melalui WhatsApp dengan menyertakan Nomor Pesanan / Invoice:
            </p>
            <div className="mt-2 space-y-1 font-mono text-[11px] text-text-primary">
              <div>WhatsApp Layanan Pelanggan:{" "}
                <a
                  href={shopWaLink("Halo CS Kaos Kami, saya ingin mengajukan klaim garansi/refund pesanan saya.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-accent hover:underline font-bold"
                >
                  {SHOP_PHONE_DISPLAY}
                </a>
              </div>
              <div>Workshop: {SHOP_WORKSHOP_ADDRESS}</div>
              <div>Email: {SHOP_EMAIL}</div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
