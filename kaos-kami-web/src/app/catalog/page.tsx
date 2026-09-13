import type { Metadata } from "next";
import { CatalogClient } from "./CatalogClient";

export const metadata: Metadata = {
  title: "Katalog Kaos Heavyweight 240 & 280 GSM — Siap Kirim Makassar | Kaos Kami",
  description:
    "Koleksi pakaian jadi siap kirim hari ini se-Makassar: katun combed tebal 240 & 280 GSM polos dan edisi grafis terbatas. Filter ukuran S–XXL + kustom sablon DTF.",
};

export default function CatalogPage() {
  return <CatalogClient />;
}
