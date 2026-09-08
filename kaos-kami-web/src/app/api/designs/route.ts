import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { Design } from "@/lib/drizzle-schema";
import { SaveDesignSchema } from "@/lib/schemas/design";
import { uploadBase64ToR2 } from "@/lib/r2";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // Guest boleh simpan (fitur), tapi dibatasi ketat anti-spam/DoS.
    const rl = await checkRateLimitAsync(`designs:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak menyimpan desain." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const len = Number(req.headers.get("content-length") || 0);
    if (len > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload desain >3MB" }, { status: 413 });
    }
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
      masterAssetUrl,
    } = validation.data;

    // Find category
    const category = await db.query.ApparelCategory.findFirst({
      where: (t, { eq }) => eq(t.slug, apparelSlug),
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

    const [design] = await db
      .insert(Design)
      .values({
        id: nanoid(),
        title,
        userId: (await getAuthenticatedUser().catch(() => null))?.id ?? null,
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
        masterAssetUrl: masterAssetUrl || null,
        status: "SAVED",
      })
      .returning();

    return NextResponse.json({ success: true, design });
  } catch (error: any) {
    console.error("Save design error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Anti-IDOR: non-admin hanya melihat desain miliknya sendiri.
    const viewer = await getAuthenticatedUser().catch(() => null);
    const isAdmin =
      !!viewer && ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(viewer.role);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const designs = await db.query.Design.findMany({
      where: isAdmin ? undefined : (t, { eq }) => eq(t.userId, viewer.id),
      limit: 20,
      orderBy: (t, { desc }) => desc(t.createdAt),
      with: { category: true },
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
