import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeJsonArray } from "@/lib/json";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`catalog:ip:${getClientIp(req)}`, 300, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    }
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const color = searchParams.get("color");
    const size = searchParams.get("size");
    const variants = await db.query.ProductVariant.findMany({
      where: (t, { and, eq }) =>
        and(
          eq(t.isActive, true),
          ...(categoryId ? [eq(t.categoryId, categoryId)] : []),
          ...(color ? [eq(t.colorHex, color)] : []),
          ...(size ? [eq(t.size, size)] : []),
        ),
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 1000,
      with: { category: { columns: { slug: true, name: true, description: true } } },
    });
    const parsed = variants.map((v) => ({ ...v, images: safeJsonArray(v.images) }));

    // Grouping by name + colorHex + categoryId agar tiap produk tahu seluruh variasi ukurannya (S, M, L, XL, XXL)
    const sizeOrder: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
    const groupMap = new Map<string, any[]>();
    for (const v of parsed) {
      const key = `${v.name.trim().toLowerCase()}__${(v.colorHex || "").toLowerCase()}__${v.categoryId}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(v);
    }

    const enriched = parsed.map((v) => {
      const key = `${v.name.trim().toLowerCase()}__${(v.colorHex || "").toLowerCase()}__${v.categoryId}`;
      const siblings = groupMap.get(key) || [v];
      const sizes = siblings
        .map((s) => ({
          size: s.size,
          priceIdr: s.priceIdr,
          stockQty: s.stockQty,
          variantId: s.id,
          sku: s.sku,
        }))
        .sort((a, b) => (sizeOrder[a.size] || 99) - (sizeOrder[b.size] || 99));

      return {
        ...v,
        sizes,
      };
    });

    return NextResponse.json({ success: true, variants: enriched });
  } catch (e: any) {
    console.error("Catalog variants error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat katalog" }, { status: 500 });
  }
}
