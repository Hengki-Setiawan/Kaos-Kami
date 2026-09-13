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
  title: "Kalkulator Sablon DTF — Ukuran Print, GSM & Placement | Kaos Kami Makassar",
  description:
    "Hitung tier sablon DTF dari ukuran cm, bandingkan kain GSM, dan lihat tabel placement baku (dada, punggung, lengan) untuk kaos, hoodie, crewneck & coach jacket. Workshop Makassar.",
};

export default function KalkulatorSablonPage() {
  return <KalkulatorSablonClient />;
}
