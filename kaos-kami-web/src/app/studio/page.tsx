import type { Metadata } from "next";
import StudioClientLoader from "./StudioClientLoader";

// P0 bundle: chunk 3D (three/fiber/drei via CanvasStage) hanya diunduh saat
// /studio dibuka — loader adalah Client Component berisi dynamic(ssr:false),
// halaman ini tetap Server Component (metadata).

export const metadata: Metadata = {
  title: "Studio 3D Kustom Sablon DTF — Mockup Real-Time | Kaos Kami Makassar",
  description:
    "Desain kaos, hoodie & crewneck dalam 3D real-time: upload desain, atur posisi skala cm 1:1 (maks 30 cm), cek DPI, lalu order ke workshop Makassar.",
};

export default function StudioPage() {
  return <StudioClientLoader />;
}
