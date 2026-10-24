export interface FaqItem {
  q: string;
  a: string;
  category: "custom" | "payment" | "production" | "care";
}

export const FAQS: FaqItem[] = [
  // Kategori 1: Pemesanan & 3D Customizer
  {
    category: "custom",
    q: "Apakah saya bisa memesan sablon custom satuan (1 pcs)?",
    a: "Bisa banget! Kaos Kami melayani pemesanan mulai dari 1 kaos (tanpa minimum order) hingga ratusan kaos untuk seragam komunitas, event, atau perusahaan.",
  },
  {
    category: "custom",
    q: "Format file gambar apa yang paling bagus untuk sablon DTF?",
    a: "Format terbaik adalah PNG transparan dengan resolusi tinggi minimal 300 DPI. Kami juga menerima format vektor PDF, AI, atau SVG. Hindari mengunggah hasil screenshot agar hasil cetak tidak buram atau pecah.",
  },
  {
    category: "custom",
    q: "Bagaimana cara melihat preview desain sebelum dicetak?",
    a: "Gunakan fitur 3D Interactive Studio kami di menu 'Studio 3D Mockup'. Anda dapat memutar model 360°, mengubah warna kaos, menggeser posisi sablon, dan melihat estimasi ukuran cetak dalam centimeter secara akurat.",
  },
  {
    category: "custom",
    q: "Berapa ukuran maksimal bidang sablon di Kaos Kami?",
    a: "Area sablon kami mendukung lebar fisik maksimal 35.0 cm (SSOT REAL_WORLD_PRINT_LIMITS), menyesuaikan anatomi proporsional dada kaos dan mesin heat press industri kami.",
  },

  // Kategori 2: Pembayaran & Keamanan
  {
    category: "payment",
    q: "Metode pembayaran apa saja yang didukung?",
    a: "Kami mendukung QRIS Nasional (dapat dibayar dari BCA Mobile, Livin Mandiri, BRImo, BNI Mobile, GoPay, OVO, Dana, ShopeePay, LinkAja) serta Virtual Account bank-bank nasional. Konfirmasi pembayaran diverifikasi secara otomatis dan instan.",
  },
  {
    category: "payment",
    q: "Apakah transaksi pembayaran di website Kaos Kami aman?",
    a: "Sangat aman. Seluruh transaksi diproses melalui iPaymu Payment Gateway (QRIS Nasional & Bank Transfer) berizin dan diawasi resmi oleh Bank Indonesia dengan enkripsi SSL 256-bit standar perbankan. Kami tidak menyimpan informasi sensitif rekening atau kartu Anda.",
  },
  {
    category: "payment",
    q: "Kapan pesanan saya mulai diproduksi setelah bayar?",
    a: "Begitu pembayaran Anda terverifikasi oleh iPaymu Payment Gateway (QRIS Nasional & Bank Transfer), status pesanan otomatis berubah menjadi PROCESSING dan tim workshop kami langsung menjadwalkan pencetakan film DTF dan proses heat press.",
  },

  // Kategori 3: Produksi, Pengiriman & Pengambilan
  {
    category: "production",
    q: "Berapa lama proses pembuatan kaos sablon custom?",
    a: "Untuk pesanan satuan (1-5 pcs), proses pengerjaan rata-rata 1 hingga 2 hari kerja. Untuk pesanan lusinan atau partai besar, estimasi sekitar 3 hingga 5 hari kerja tergantung antrean produksi workshop.",
  },
  {
    category: "production",
    q: "Apakah ada fasilitas gratis ongkir untuk wilayah Kota Makassar?",
    a: "Ya! Kami menyediakan opsi Pengiriman Gratis untuk area Kota Makassar menggunakan kurir internal tim Kaos Kami. Anda juga dapat memilih opsi 'Ambil di Workshop' (Self Pickup) di Tallo, Makassar tanpa biaya pengiriman.",
  },
  {
    category: "production",
    q: "Apakah Kaos Kami melayani pengiriman ke luar kota dan luar pulau?",
    a: "Tentu! Kami melayani pengiriman ke seluruh kota dan kabupaten di Indonesia menggunakan mitra logistik resmi terpercaya seperti JNE, J&T, SiCepat, dan Pos Indonesia dengan nomor resi pelacakan langsung.",
  },
  {
    category: "production",
    q: "Bagaimana cara melacak status pengerjaan pesanan saya?",
    a: "Anda dapat memantau status pesanan kapan saja melalui menu 'Lacak Pesanan' (/track) atau dashboard akun Anda. Kami juga mengirimkan pembaruan status produksi langsung ke nomor WhatsApp Anda.",
  },

  // Kategori 4: Bahan & Perawatan Pakaian
  {
    category: "care",
    q: "Bahan kaos apa yang digunakan di Kaos Kami?",
    a: "Kami menggunakan bahan 100% Katun Combed 24s Premium yang berkarakter halus, adem, menyerap keringat, dan tidak kaku, dengan ketebalan yang pas dan kokoh untuk iklim tropis Indonesia.",
  },
  {
    category: "care",
    q: "Apakah sablon DTF tahan lama dan tidak mudah retak?",
    a: "Sablon DTF (Direct-to-Film) komersial kami menggunakan tinta pigmen tekstil dan bubuk perekat hotmelt grade industri. Karakter sablon lentur, warnanya tajam, tidak mudah pecah, dan tahan hingga puluhan kali pencucian normal.",
  },
  {
    category: "care",
    q: "Bagaimana tips mencuci dan merawat kaos sablon DTF agar awet?",
    a: "1) Balik pakaian saat mencuci (posisi sablon di bagian dalam). 2) Gunakan air dingin dan detergen lembut tanpa pemutih keras. 3) Jangan menyikat langsung di permukaan sablon. 4) Saat menyetrika, setrika dari bagian dalam baju atau lapisi dengan kain tipis (jangan menyentuhkan plat setrika panas langsung ke permukaan sablon).",
  },
];
