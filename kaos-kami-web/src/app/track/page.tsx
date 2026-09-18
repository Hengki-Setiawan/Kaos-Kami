import type { Metadata } from "next";
import { TrackClient } from "./TrackClient";

export const metadata: Metadata = {
  title: "Lacak Status Pesanan",
  description:
    "Lacak status proses sablon dan pengiriman pesanan Anda dengan nomor WhatsApp dan kode OTP 6 digit. Cepat dan transparan.",
};

export default function TrackPage() {
  return <TrackClient />;
}
