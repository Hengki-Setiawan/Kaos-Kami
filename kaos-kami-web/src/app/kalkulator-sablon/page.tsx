/**
 * M4.2 — KALKULATOR SABLON STATIS (SEO + trust, tanpa API/server).
 * Isi: kalkulator ukuran print (cm → tier + biaya), tabel tier, tabel
 * kain/GSM per apparel, tabel placement baku (cm + tier dari SSOT fisik).
 * Semua angka diambil dari SSOT yang sama dengan mesin harga
 * (printTiers, APPAREL_CATALOG, APPAREL_PHYSICAL_SPECS) — bukan angka ketik manual.
 */

import type { Metadata } from "next";
import { KalkulatorSablonClient } from "./KalkulatorSablonClient";

export const metadata: Metadata = {
  title: "Kalkulator Biaya Sablon DTF",
  description:
    "Hitung estimasi biaya sablon DTF berdasarkan ukuran cetak cm, jenis pakaian, dan area sablon (dada, punggung, lengan). Workshop resmi Kota Makassar.",
};

export default function KalkulatorSablonPage() {
  return <KalkulatorSablonClient />;
}
