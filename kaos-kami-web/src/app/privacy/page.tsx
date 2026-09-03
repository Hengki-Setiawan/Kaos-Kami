import Link from "next/link";

export const metadata = {
  title: "Kebijakan Privasi — Kaos Kami Makassar",
  description: "Kebijakan privasi platform sablon DTF Kaos Kami.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-canvas text-text-primary px-4 py-12 max-w-3xl mx-auto space-y-6">
      <Link href="/" className="font-mono text-xs text-text-muted hover:text-brand-accent">
        ← KEMBALI KE BERANDA
      </Link>
      <h1 className="font-display text-3xl font-black uppercase text-white">
        Kebijakan Privasi
      </h1>
      <p className="font-mono text-xs text-text-muted">
        Terakhir diperbarui: September 2026 — Kaos Kami, Kota Makassar.
      </p>
      <div className="space-y-4 font-mono text-xs leading-relaxed text-text-muted">
        <section className="space-y-1.5">
          <h2 className="font-bold text-white text-sm">1. Data yang kami kumpulkan</h2>
          <p>
            Nama penerima, nomor WhatsApp, alamat pengiriman, dan foto/desain yang Anda
            unggah untuk keperluan produksi sablon DTF. Aplikasi mobile dapat meminta akses
            kamera, galeri, notifikasi, dan biometrik (sidik jari/Face ID) — hanya untuk
            fungsi yang Anda minta (upload logo, pelacakan pesanan, kunci admin).
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-bold text-white text-sm">2. Penggunaan data</h2>
          <p>
            Data dipakai untuk memproses pesanan, notifikasi status produksi via WhatsApp,
            dan peningkatan layanan. Kami tidak menjual data Anda kepada pihak ketiga.
            Pembayaran diproses oleh Duitku; kami tidak menyimpan nomor kartu/VA Anda.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-bold text-white text-sm">3. Penyimpanan & keamanan</h2>
          <p>
            Data tersimpan di database Turso (edge) dan aset di Cloudflare R2. Invoice
            publik hanya menampilkan status — data pribadi (telepon, email, alamat)
            disamarkan untuk non-pemilik pesanan.
          </p>
        </section>
        <section className="space-y-1.5">
          <h2 className="font-bold text-white text-sm">4. Hak Anda</h2>
          <p>
            Anda dapat meminta salinan, perbaikan, atau penghapusan data melalui WhatsApp{" "}
            <span className="text-white">6281244002026</span> (Workshop Kaos Kami, Makassar).
          </p>
        </section>
      </div>
    </main>
  );
}
