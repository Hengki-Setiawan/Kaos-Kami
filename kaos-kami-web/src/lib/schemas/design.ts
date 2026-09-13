import { z } from "zod";
import { normalizeApparelSlug } from "@/lib/apparelSlug";

/**
 * Slug apparel SSOT (K-B): terima alias legacy "jacket"→"shirt" dari APK lama
 * via z.preprocess; slug asing tetap DITOLAK enum 400 (preprocess tak melempar
 * — kembalikan mentah agar enum yang menolak dengan pesan rapi).
 */
export const ApparelSlugSchema = z.preprocess(
  (v) => {
    try {
      return normalizeApparelSlug(v);
    } catch {
      return v;
    }
  },
  // Fase 13: + cap/pants/shorts (diterima di skema agar pesan hilir jujur;
  // keterpesanan ditegakkan guard orderable di checkout, bukan di sini).
  z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"])
);

export const DecalLayerSchema = z.object({
  id: z.string().max(64),
  url: z.string().min(1, "URL decal wajib diisi").max(500_000, "Decal terlalu besar"),
  name: z.string().default("Grafis"),
  targetSide: z.enum(["front", "back", "left_sleeve", "right_sleeve", "hood"]),
  x: z.number().min(-0.75).max(0.75),
  y: z.number().min(-0.75).max(0.75),
  scale: z.number().min(0.02).max(1.5),
  rotation: z.number().min(-180).max(180),
  opacity: z.number().min(0).max(1),
  // Dimensi raster master (px) — OPSIONAL agar JSON lama tetap lolos.
  // Tanpa ini server fallback aspek 1.0 (undercharge portrait + cm salah);
  // client WAJIB teruskan (drawer/teamwear/checkout sudah set via getImageSize).
  printPx: z
    .object({
      w: z.number().int().positive().max(8000),
      h: z.number().int().positive().max(8000),
    })
    .optional(),
});

/**
 * Kontrak master produksi untuk checkout (K2, Sep 2026).
 * Bentuk: map datar side→httpsURL + `decal:<id>`→httpsURL.
 * - Kunci: "front" | "back" | "left_sleeve" | "right_sleeve" | "hood"
 *   atau "decal:<decalId>" (fidelitas per-artwork drawer).
 * - Nilai: URL https R2 (maks 2048 char) — base64 DITOLAK agar payload
 *   <50KB & DB tak bengkak. Client WAJIB upload base64 ke R2 DULU
 *   (login: POST /api/upload/r2 kind=master; guest: POST /api/designs
 *   draft yang meng-hosting-kan ke R2) lalu kirim URL https di sini.
 * - Batas: maks 20 entri (≈40KB JSON), opsional.
 */
export const CheckoutMasterMapSchema = z
  .record(
    z.string().min(1).max(64),
    z.string().url("URL master tidak valid (wajib https R2)").max(2048)
  )
  .refine((o) => Object.keys(o).length <= 20, {
    message: "Terlalu banyak master (maks 20)",
  })
  .optional();

export const SaveDesignSchema = z.object({
  title: z.string().min(1, "Judul desain wajib diisi").max(60),
  apparelSlug: ApparelSlugSchema,
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Format warna HEX tidak valid"),
  colorName: z.string().min(1).max(40),
  size: z.string().min(1).max(10),
  materialFinishSlug: z.string().max(40).optional(),
  sablonMethodSlug: z.string().default("dtf"),
  decals: z.array(DecalLayerSchema).max(10, "Maks 10 lapis sablon"),
  studioTheme: z.enum(["obsidian", "gallery", "concrete"]).default("obsidian"),
  calculatedPriceIdr: z.number().positive().max(100_000_000).optional(),
  priceBreakdown: z.record(z.any()).optional().default({}),
  previewImageFrontUrl: z.string().max(500_000).optional(),
  previewImageBackUrl: z.string().max(500_000).optional(),
  // Master produksi 300 DPI dari Pola 2D (URL R2; JSON map per panel ATAU url tunggal).
  masterAssetUrl: z.string().max(500_000).optional(),
});

export type DecalLayerInput = z.infer<typeof DecalLayerSchema>;
export type SaveDesignInput = z.infer<typeof SaveDesignSchema>;
