import type { Metadata } from "next";
import { CatalogClient } from "./CatalogClient";

export const metadata: Metadata = {
  title: "Katalog Produk & Kaos Siap Kirim",
  description:
    "Koleksi pakaian jadi dan kaos polos siap kirim se-Makassar. Katun combed adem dan edisi sablon terbatas. Pesan online langsung kirim.",
  alternates: {
    canonical: "/catalog",
  },
  openGraph: {
    title: "Katalog Produk & Kaos Siap Kirim | Kaos Kami Makassar",
    description:
      "Koleksi pakaian jadi dan kaos polos siap kirim se-Makassar. Katun combed adem dan edisi sablon terbatas. Pesan online langsung kirim.",
    url: "/catalog",
    type: "website",
  },
};

export default function CatalogPage() {
  return <CatalogClient />;
}
