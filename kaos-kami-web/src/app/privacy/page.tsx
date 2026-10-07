import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: "Kebijakan Privasi · Kaos Kami Makassar",
  description: "Kebijakan privasi platform sablon DTF Kaos Kami.",
};

// Tanggal dinamis (audit H3) — mengikuti waktu build, bukan hardcode.
const UPDATED = new Date().toLocaleDateString("id-ID", {
  month: "long",
  year: "numeric",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 py-12 max-w-3xl mx-auto space-y-6 w-full">
      <Link href="/" className="font-sans text-xs text-text-muted hover:text-brand-accent">
        ← KEMBALI KE BERANDA
      </Link>
      <h1 className="font-sans text-3xl font-bold uppercase text-text-primary">
        Kebijakan Privasi
      </h1>
      <p className="font-sans text-xs text-text-muted tabular-nums">
        Terakhir diperbarui: {UPDATED} · Kaos Kami, Kota Makassar.
      </p>
      {/* Daftar Isi sticky (CSS only — tanpa lib): anchor per seksi */}
      <nav aria-label="Daftar isi Kebijakan Privasi" className="lg:sticky lg:top-24 rounded-xl border border-border-subtle bg-surface/60 p-4 font-sans text-xs text-text-muted">
        <p className="font-bold text-text-primary text-[11px] uppercase tracking-wider mb-2">Daftar Isi</p>
        <ol className="space-y-1.5 list-none">
          <li><a href="#data-dikumpulkan" className="hover:text-brand-accent hover:underline">1. Data yang kami kumpulkan</a></li>
          <li><a href="#penggunaan-data" className="hover:text-brand-accent hover:underline">2. Penggunaan data</a></li>
          <li><a href="#penyimpanan-keamanan" className="hover:text-brand-accent hover:underline">3. Penyimpanan &amp; keamanan</a></li>
          <li><a href="#hak-anda" className="hover:text-brand-accent hover:underline">4. Hak Anda</a></li>
        </ol>
      </nav>
      <div className="space-y-4 font-sans text-xs leading-relaxed text-text-muted">
        <section id="data-dikumpulkan" className="space-y-1.5 scroll-mt-24">
          <h2 className="font-bold text-text-primary text-sm">1. Data yang kami kumpulkan</h2>
          <p>
            Nama penerima, nomor WhatsApp, alamat pengiriman, dan foto/desain yang Anda
            unggah untuk keperluan produksi sablon DTF. Aplikasi mobile dapat meminta akses
            kamera, galeri, notifikasi, dan biometrik (sidik jari/Face ID), hanya untuk
            fungsi yang Anda minta (upload logo, pelacakan pesanan, kunci admin).
          </p>
        </section>
        <section id="penggunaan-data" className="space-y-1.5 scroll-mt-24">
          <h2 className="font-bold text-text-primary text-sm">2. Penggunaan data</h2>
          <p>
            Data dipakai untuk memproses pesanan, notifikasi status produksi via WhatsApp,
            dan peningkatan layanan. Kami tidak menjual data Anda kepada pihak ketiga.
            Pembayaran diproses secara aman oleh iPaymu Payment Gateway (QRIS Nasional & Bank Transfer); kami tidak menyimpan data keuangan sensitif Anda.
          </p>
        </section>
        <section id="penyimpanan-keamanan" className="space-y-1.5 scroll-mt-24">
          <h2 className="font-bold text-text-primary text-sm">3. Penyimpanan & keamanan</h2>
          <p>
            Data tersimpan di database Turso (edge) dan aset di Cloudflare R2. Invoice
            publik hanya menampilkan status, sedangkan data pribadi (telepon, email, alamat)
            disamarkan untuk non-pemilik pesanan.
          </p>
        </section>
        <section id="hak-anda" className="space-y-1.5 scroll-mt-24">
          <h2 className="font-bold text-text-primary text-sm">4. Hak Anda</h2>
          <p>
            Anda dapat meminta salinan, perbaikan, atau penghapusan data melalui WhatsApp{" "}
            <span className="text-text-primary">6281244002026</span> (Workshop Kaos Kami, Makassar).
          </p>
        </section>
      </div>
      </main>
      <Footer />
    </div>
  );
}
