import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SaveDesignSchema } from "@/lib/schemas/design";
import { uploadBase64ToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = SaveDesignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }

    const {
      title,
      apparelSlug,
      colorHex,
      colorName,
      size,
      materialFinishSlug,
      sablonMethodSlug,
      decals,
      studioTheme,
      calculatedPriceIdr,
      priceBreakdown,
      previewImageFrontUrl,
      previewImageBackUrl,
    } = validation.data;

    // Find category
    const category = await prisma.apparelCategory.findUnique({
      where: { slug: apparelSlug },
    });

    if (!category) {
      return NextResponse.json({ error: "Apparel category not found" }, { status: 404 });
    }

    // Upload decal base64 to R2 (zero egress, hindari DB bengkak 90%)
    const processedDecals = await Promise.all(
      (decals as any[]).map(async (d: any, idx: number) => {
        if (typeof d.url === "string" && d.url.startsWith("data:image")) {
          const r2Key = `decals/${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}.png`;
          const uploaded = await uploadBase64ToR2(d.url, r2Key);
          if (uploaded.success) {
            return { ...d, url: uploaded.url, r2Key: uploaded.key };
          }
        }
        return d;
      })
    );

    // Upload preview images if base64
    let finalFrontUrl = previewImageFrontUrl;
    let finalBackUrl = previewImageBackUrl;
    if (finalFrontUrl && finalFrontUrl.startsWith("data:image")) {
      const up = await uploadBase64ToR2(finalFrontUrl, `previews/${Date.now()}-front.png`);
      if (up.success) finalFrontUrl = up.url;
    }
    if (finalBackUrl && finalBackUrl.startsWith("data:image")) {
      const up = await uploadBase64ToR2(finalBackUrl, `previews/${Date.now()}-back.png`);
      if (up.success) finalBackUrl = up.url;
    }

    const design = await prisma.design.create({
      data: {
        title,
        categoryId: category.id,
        colorHex,
        colorName,
        size,
        materialFinishSlug: materialFinishSlug || "combed-cotton",
        sablonMethodSlug: sablonMethodSlug || "dtf",
        decals: JSON.stringify(processedDecals),
        studioTheme: studioTheme || "obsidian",
        calculatedPriceIdr,
        priceBreakdown: JSON.stringify(priceBreakdown),
        previewImageFrontUrl: finalFrontUrl,
        previewImageBackUrl: finalBackUrl,
        status: "SAVED",
      },
    });

    return NextResponse.json({ success: true, design });
  } catch (error: any) {
    console.error("Save design error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const designs = await prisma.design.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    const parsedDesigns = designs.map((d) => ({
      ...d,
      decals: JSON.parse(d.decals || "[]"),
      priceBreakdown: JSON.parse(d.priceBreakdown || "{}"),
    }));

    return NextResponse.json({ success: true, designs: parsedDesigns });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
