"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_PHONE_DISPLAY,
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
  ShieldCheck,
  Search,
  Droplets,
  Hand,
  Leaf,
  Flame,
  Clock,
} from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
  category: "custom" | "payment" | "production" | "care";
}

const FAQS: FaqItem[] = [
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
    a: "Area sablon kami mendukung hingga standar format A3 dengan lebar fisik maksimal 30.0 cm, menyesuaikan anatomi proporsional dada kaos dan mesin heat press industri kami.",
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

const CATEGORIES = [
  { id: "all", label: "Semua Pertanyaan", icon: HelpCircle },
  { id: "custom", label: "Kustom & Desain 3D", icon: Shirt },
  { id: "payment", label: "Pembayaran & Garansi", icon: CreditCard },
  { id: "production", label: "Produksi & Ongkir", icon: Truck },
  { id: "care", label: "Bahan & Perawatan", icon: Sparkles },
];

export default function FaqPage() {
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
      <main className="flex-1 px-4 py-12 max-w-4xl mx-auto space-y-8 w-full">
        <div>
          <Link
            href="/"
            className="font-sans text-xs font-medium text-text-muted hover:text-brand-accent transition-colors"
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
            placeholder="Cari pertanyaan (misal: ukuran, satuan, ongkir, cuci)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-accent placeholder:text-text-muted transition-colors font-sans"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-brand-accent text-canvas font-bold shadow-sm"
                    : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:border-brand-accent/50"
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
            <div className="p-8 text-center rounded-2xl bg-surface border border-border-subtle space-y-2 text-xs text-text-muted">
              <p>Tidak ada pertanyaan yang sesuai dengan kata kunci pencarian Anda.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-brand-accent font-sans underline hover:brightness-110"
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
                  className="rounded-2xl bg-surface/60 border border-border-subtle overflow-hidden transition-colors hover:border-border-subtle/80"
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
