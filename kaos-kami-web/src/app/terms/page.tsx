import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_EMAIL,
  SHOP_PHONE_DISPLAY,
  shopWaLink,
} from "@/lib/shop";

export const metadata = {
  title: "Syarat & Ketentuan · Kaos Kami Makassar",
  description:
    "Syarat dan ketentuan layanan pemesanan sablon DTF dan produk apparel Kaos Kami Kota Makassar.",
};

const UPDATED = new Date().toLocaleDateString("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function TermsPage() {
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
            Syarat & Ketentuan Layanan
          </h1>
          <p className="font-mono text-xs text-text-muted mt-2">
            Terakhir diperbarui: {UPDATED} · Kaos Kami, Kota Makassar, Sulawesi Selatan.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle text-xs text-text-muted leading-relaxed">
          Selamat datang di platform resmi <strong>Kaos Kami</strong> (kaoskami.biz.id). 
          Dengan mengakses situs, menggunakan 3D Customizer, atau melakukan pemesanan pakaian custom sablon DTF dan produk apparel kami, Anda dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum di bawah ini.
        </div>

        {/* Daftar Isi sticky (CSS only — tanpa lib): anchor per seksi */}
        <nav aria-label="Daftar isi Syarat & Ketentuan" className="lg:sticky lg:top-24 rounded-xl border border-border-subtle bg-surface/60 p-4 font-sans text-xs text-text-muted">
          <p className="font-bold text-text-primary text-[11px] uppercase tracking-wider mb-2">Daftar Isi</p>
          <ol className="space-y-1.5 list-none">
            <li><a href="#definisi-layanan" className="hover:text-brand-accent hover:underline">1. Definisi &amp; Ruang Lingkup</a></li>
            <li><a href="#hak-kekayaan" className="hover:text-brand-accent hover:underline">2. Hak Kekayaan Intelektual</a></li>
            <li><a href="#spesifikasi-cetak" className="hover:text-brand-accent hover:underline">3. Spesifikasi Cetak &amp; Toleransi</a></li>
            <li><a href="#pemesanan-pembayaran" className="hover:text-brand-accent hover:underline">4. Pemesanan &amp; Pembayaran</a></li>
            <li><a href="#sla-pengiriman" className="hover:text-brand-accent hover:underline">5. SLA &amp; Pengiriman</a></li>
            <li><a href="#hukum-cs" className="hover:text-brand-accent hover:underline">6. Hukum &amp; Layanan Pelanggan</a></li>
          </ol>
        </nav>

        <div className="space-y-6 text-xs text-text-muted leading-relaxed">
          {/* Bagian 1 */}
          <section id="definisi-layanan" className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle scroll-mt-24">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                01
              </span>
              Definisi & Ruang Lingkup Layanan
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                <strong>Kaos Kami</strong> adalah unit usaha UMKM konveksi & sablon digital DTF (Direct-to-Film) yang berdomisili fisik di Kota Makassar, Sulawesi Selatan.
              </li>
              <li>
                Layanan meliputi penyediaan pakaian polos (ready stock), layanan kustomisasi sablon digital berbasis web 3D interaktif, cetak maklon sablon DTF, serta jasa pengiriman ke seluruh Indonesia.
              </li>
              <li>
                <strong>Pelanggan</strong> adalah individu atau badan hukum yang membuat akun, menggunakan konfigurator 3D, atau menyelesaikan transaksi pembayaran di platform Kaos Kami.
              </li>
            </ul>
          </section>

          {/* Bagian 2 */}
          <section id="hak-kekayaan" className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle scroll-mt-24">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                02
              </span>
              Hak Kekayaan Intelektual & Materi Desain
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                Pelanggan bertanggung jawab penuh atas hak cipta, merek dagang, izin lisensi, dan keaslian seluruh gambar, logo, ilustrasi, atau tipografi yang diunggah ke dalam sistem.
              </li>
              <li>
                Kaos Kami dibebaskan dari segala tuntutan hukum pihak ketiga yang timbul akibat pelanggaran hak cipta atas materi desain yang disediakan oleh Pelanggan.
              </li>
              <li>
                Kami berhak secara sepihak membatalkan pesanan yang memuat materi terlarang berdasarkan hukum Republik Indonesia, termasuk konten pornografi, ujaran kebencian, separatisme, atau penistaan bernuansa SARA.
              </li>
            </ul>
          </section>

          {/* Bagian 3 */}
          <section id="spesifikasi-cetak" className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle scroll-mt-24">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                03
              </span>
              Spesifikasi Fisik, Kalibrasi Cetak & Toleransi Garmen
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                <strong>Skala Cetak Maksimal:</strong> Sesuai anatomi dada kaos dan ukuran mesin heat press komersial kami, lebar area sablon maksimal dibatasi hingga <strong>30.0 cm (standar A3)</strong>.
              </li>
              <li>
                <strong>Akurasi Warna:</strong> Representasi warna pada layar monitor/smartphone (RGB) dapat memiliki perbedaan saturasi dan tone sebesar 5% - 10% dibanding hasil fisik tinta DTF tekstil (CMYK + White).
              </li>
              <li>
                <strong>Toleransi Ukuran Kaos:</strong> Sesuai standar industri konveksi garmen, toleransi jahit pola potongan kaos adalah <strong>±1 hingga 2 cm</strong>.
              </li>
            </ul>
          </section>

          {/* Bagian 4 */}
          <section id="pemesanan-pembayaran" className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle scroll-mt-24">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                04
              </span>
              Pemesanan, Pembayaran & Verifikasi
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                Seluruh pesanan sablon custom bersifat <em>Made-to-Order</em> (diproduksi khusus atas permintaan Anda) dan mewajibkan pembayaran penuh (100% pre-paid).
              </li>
              <li>
                Transaksi pembayaran diproses melalui iPaymu Payment Gateway (QRIS Nasional & Bank Transfer) yang terlisensi resmi Bank Indonesia (QRIS Nasional, Virtual Account Mandiri, BCA, BNI, BRI, Permata, atau e-Wallet).
              </li>
              <li>
                Pesanan baru akan masuk ke antrean produksi (status <code>PROCESSING</code>) setelah pembayaran terkonfirmasi otomatis oleh sistem payment gateway.
              </li>
            </ul>
          </section>

          {/* Bagian 5 */}
          <section id="sla-pengiriman" className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle scroll-mt-24">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                05
              </span>
              Waktu Pengerjaan (SLA) & Pengiriman
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-brand-accent">
              <li>
                <strong>Estimasi Produksi:</strong> Pesanan satuan berkisar antara 1 - 3 hari kerja; pesanan partai/komunitas besar berkisar antara 3 - 7 hari kerja tergantung antrean workshop.
              </li>
              <li>
                <strong>Pengiriman Lokal Makassar:</strong> Tersedia opsi <em>Ambil di Workshop</em> (Jl. Galangan Kapal, Kec. Tallo, Makassar) dan <em>Pengiriman Kurir Internal Gratis</em> untuk wilayah tertentu di Kota Makassar.
              </li>
              <li>
                <strong>Pengiriman Luar Kota:</strong> Menggunakan jasa ekspedisi resmi (JNE, J&T, SiCepat). Keterlambatan akibat pihak logistik atau bencana alam (force majeure) di luar kendali langsung Kaos Kami, namun tim kami akan membantu investigasi secara aktif.
              </li>
            </ul>
          </section>

          {/* Bagian 6 */}
          <section id="hukum-cs" className="space-y-2 p-5 rounded-2xl bg-surface/50 border border-border-subtle scroll-mt-24">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center font-mono text-xs">
                06
              </span>
              Hukum yang Berlaku & Layanan Pelanggan
            </h2>
            <p>
              Syarat dan ketentuan ini diatur berdasarkan hukum negara Republik Indonesia. Apabila terdapat perselisihan, para pihak sepakat untuk mengutamakan penyelesaian secara musyawarah untuk mufakat.
            </p>
            <div className="pt-2 text-text-muted">
              Hubungi layanan pelanggan kami untuk klarifikasi atau informasi lebih lanjut:
              <div className="mt-2 space-y-1 font-mono text-[11px] text-text-primary">
                <div>Alamat: {SHOP_WORKSHOP_ADDRESS}</div>
                <div>Email: {SHOP_EMAIL}</div>
                <div>
                  WhatsApp:{" "}
                  <a
                    href={shopWaLink("Halo CS Kaos Kami, saya ingin bertanya tentang Syarat & Ketentuan.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-accent hover:underline"
                  >
                    {SHOP_PHONE_DISPLAY}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
