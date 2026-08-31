import { z } from "zod";

export const DecalLayerSchema = z.object({
  id: z.string(),
  url: z.string().min(1, "URL decal wajib diisi"),
  name: z.string().default("Grafis"),
  targetSide: z.enum(["front", "back"]),
  x: z.number().min(-0.75).max(0.75),
  y: z.number().min(-0.75).max(0.75),
  scale: z.number().min(0.1).max(1.5),
  rotation: z.number().min(-180).max(180),
  opacity: z.number().min(0).max(1),
});

export const SaveDesignSchema = z.object({
  title: z.string().min(1, "Judul desain wajib diisi").max(60),
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"]),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Format warna HEX tidak valid"),
  colorName: z.string().min(1),
  size: z.string().min(1),
  materialFinishSlug: z.string().optional(),
  sablonMethodSlug: z.string().default("dtf"),
  decals: z.array(DecalLayerSchema),
  studioTheme: z.enum(["obsidian", "gallery", "concrete"]).default("obsidian"),
  calculatedPriceIdr: z.number().positive(),
  priceBreakdown: z.record(z.any()),
  previewImageFrontUrl: z.string().optional(),
  previewImageBackUrl: z.string().optional(),
});

export type DecalLayerInput = z.infer<typeof DecalLayerSchema>;
export type SaveDesignInput = z.infer<typeof SaveDesignSchema>;
