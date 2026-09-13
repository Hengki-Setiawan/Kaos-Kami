import type { Metadata } from "next";
import { TrackClient } from "./TrackClient";

export const metadata: Metadata = {
  title: "Lacak Pesanan Tanpa Daftar — OTP WhatsApp | Kaos Kami",
  description:
    "Lacak status pesanan sablon DTF cukup dengan nomor WA + kode OTP 6 digit. Tanpa daftar, langsung dari workshop Makassar.",
};

export default function TrackPage() {
  return <TrackClient />;
}
