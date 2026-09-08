import { z } from "zod";

export const DecalLayerSchema = z.object({
  id: z.string().max(64),
  url: z.string().min(1, "URL decal wajib diisi").max(500_000, "Decal terlalu besar"),
  name: z.string().default("Grafis"),
  targetSide: z.enum(["front", "back", "left_sleeve", "right_sleeve"]),
  x: z.number().min(-0.75).max(0.75),
  y: z.number().min(-0.75).max(0.75),
  scale: z.number().min(0.02).max(1.5),
  rotation: z.number().min(-180).max(180),
  opacity: z.number().min(0).max(1),
});

export const SaveDesignSchema = z.object({
  title: z.string().min(1, "Judul desain wajib diisi").max(60),
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"]),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Format warna HEX tidak valid"),
  colorName: z.string().min(1).max(40),
  size: z.string().min(1).max(10),
  materialFinishSlug: z.string().max(40).optional(),
  sablonMethodSlug: z.string().default("dtf"),
  decals: z.array(DecalLayerSchema).max(10, "Maks 10 lapis sablon"),
  studioTheme: z.enum(["obsidian", "gallery", "concrete"]).default("obsidian"),
  calculatedPriceIdr: z.number().positive().max(100_000_000),
  priceBreakdown: z.record(z.any()),
  previewImageFrontUrl: z.string().max(500_000).optional(),
  previewImageBackUrl: z.string().max(500_000).optional(),
  // Master produksi 300 DPI dari Pola 2D (URL R2; JSON map per panel ATAU url tunggal).
  masterAssetUrl: z.string().max(500_000).optional(),
});

export type DecalLayerInput = z.infer<typeof DecalLayerSchema>;
export type SaveDesignInput = z.infer<typeof SaveDesignSchema>;
