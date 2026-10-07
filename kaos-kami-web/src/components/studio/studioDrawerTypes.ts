// Blueprint Bab 53 Fase 5 — tipe bersama pecahan CustomizerDrawer.
//
// File ini HANYA berisi tipe (zero runtime): tab studio, format ekspor 360°,
// dan bentuk struktural state turunan yang diteruskan via props dari
// useConfiguratorStore/useCartStore yang sama (tanpa duplikasi state).
// Dipindah verbatim dari src/components/ui/CustomizerDrawer.tsx — tanpa ubah perilaku.

import type { PricingBreakdown6Var } from "@/lib/pricingEngine";
import type { PhysicalPrintDimension } from "@/lib/scaleCalibration";
import type { QualityReport } from "@/lib/dpiAnalyzer";

export type StudioTab =
  | "apparel"
  | "decals"
  | "options"
  | "saved"
  | "team"
  | "export";

/** Format ekspor 360° (D2 — muxer benar, bukan MediaRecorder mentah). */
export type Export360Format = "mp4" | "webm" | "gif";

/** Pricing engine 6-variabel — objek `pricing` dari drawer, diteruskan apa adanya. */
export type DrawerPricing = PricingBreakdown6Var;

/** Dimensi fisik cetak DTF — objek `physicalDimensions` dari drawer. */
export type DrawerPhysicalDimensions = PhysicalPrintDimension;

/** Laporan kualitas DPI — objek `qualityReport` dari drawer. */
export type DrawerQualityReport = QualityReport;

/** Info stok varian — bentuk `VariantItemInfo` lokal drawer (slug_color_size). */
export interface VariantStockInfo {
  stockQty: number;
  priceIdr: number;
  sku: string;
}
