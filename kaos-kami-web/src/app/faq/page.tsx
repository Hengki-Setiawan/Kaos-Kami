import type { Metadata } from "next";
import { FaqClient } from "./FaqClient";
import { FAQS } from "./faqData";

export const metadata: Metadata = {
  title: "FAQ - Pertanyaan Umum Sablon DTF & Kaos Makassar",
  description:
    "Pusat bantuan & tanya jawab lengkap seputar sablon DTF satuan/lusinan, 3D Mockup Studio, metode pembayaran QRIS/VA, pengiriman Kota Makassar & luar kota, serta tips perawatan pakaian.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "FAQ - Pertanyaan Umum Sablon DTF & Kaos Makassar | Kaos Kami",
    description:
      "Pertanyaan yang sering diajukan mengenai sablon DTF satuan tanpa minimum order, 3D Studio, pengiriman gratis se-Makassar, dan panduan cuci kaos.",
    url: "/faq",
    type: "website",
  },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqClient />
    </>
  );
}
