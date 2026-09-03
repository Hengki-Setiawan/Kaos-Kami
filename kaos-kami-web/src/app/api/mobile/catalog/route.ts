import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";

/**
 * M10.1 — GET /api/mobile/catalog
 * Katalog hemat kuota: payload lean + ETag/304 (hemat data seluler).
 */
export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.apparelCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        weightGsm: true,
        basePriceIdr: true,
        sizes: true,
        model3dPath: true,
        updatedAt: true,
      },
    });

    const lean = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      weightGsm: c.weightGsm,
      basePriceIdr: c.basePriceIdr,
      sizes: JSON.parse(c.sizes || "[]"),
      model3dPath: c.model3dPath,
    }));

    const etag =
      '"' +
      createHash("sha256")
        .update(JSON.stringify(lean.map((c) => [c.id, c.basePriceIdr])))
        .digest("hex")
        .slice(0, 32) +
      '"';

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return NextResponse.json(
      { success: true, categories: lean },
      { headers: { ETag: etag, "Cache-Control": "public, max-age=300" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
