import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { CatalogProduct } from "@/lib/drizzle-schema";
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

    // 1. Cek koleksi CatalogProduct (distro e-commerce pakaian siap jadi Kaos Kami)
    const catalogProducts = await db
      .select()
      .from(CatalogProduct)
      .where(eq(CatalogProduct.isActive, true))
      .orderBy(asc(CatalogProduct.sortOrder));

    if (catalogProducts.length > 0) {
      const sizeOrder: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
      const distroVariants = catalogProducts
        .filter((cp) => {
          if (categoryId && cp.apparelSlug !== categoryId) return false;
          return true;
        })
        .map((cp) => {
          const rawSizes = (safeJsonArray(cp.sizes) as string[]) || ["M", "L"];
          const images = (safeJsonArray(cp.images) as string[]) || [];
          const colorName =
            cp.slug.includes("orange") || cp.slug.includes("oranye") ? "Oranye" :
            cp.slug.includes("black") || cp.slug.includes("hitam") ? "Hitam" :
            cp.slug.includes("olive") || cp.slug.includes("hijau") ? "Hijau Olive" :
            cp.slug.includes("ecru") || cp.slug.includes("white") ? "Putih Ecru" :
            cp.slug.includes("navy") ? "Navy" :
            cp.slug.includes("ash") || cp.slug.includes("grey") ? "Abu Misty" : "Hitam";

          const colorHex =
            cp.slug.includes("orange") || cp.slug.includes("oranye") ? "#E65100" :
            cp.slug.includes("black") || cp.slug.includes("hitam") ? "#121214" :
            cp.slug.includes("olive") || cp.slug.includes("hijau") ? "#3B4435" :
            cp.slug.includes("ecru") || cp.slug.includes("white") ? "#EFECE6" :
            cp.slug.includes("navy") ? "#1A237E" :
            cp.slug.includes("ash") || cp.slug.includes("grey") ? "#B0B3B8" : "#121214";

          const sizes = rawSizes
            .map((sz) => ({
              size: sz,
              priceIdr: cp.basePriceIdr,
              stockQty: 25,
              variantId: `${cp.id}_${sz}`,
              sku: `${cp.slug}-${sz}`,
            }))
            .sort((a, b) => (sizeOrder[a.size] || 99) - (sizeOrder[b.size] || 99));

          const totalStock = sizes.reduce((acc, s) => acc + s.stockQty, 0);

          return {
            id: cp.id,
            name: cp.name,
            priceIdr: cp.basePriceIdr,
            colorName,
            colorHex,
            size: rawSizes.includes("L") ? "L" : rawSizes.includes("M") ? "M" : rawSizes[0] || "M",
            stockQty: totalStock,
            images: images.length > 0 ? images : ["/products/tshirt-orange-makassar.jpg"],
            isPreDesigned: true,
            tagline: cp.tagline,
            description: cp.description,
            tags: safeJsonArray(cp.tags),
            category: {
              slug: cp.apparelSlug,
              name: cp.tagline || cp.name,
            },
            sizes,
          };
        });

      return NextResponse.json({ success: true, variants: distroVariants });
    }

    // 2. Fallback jika CatalogProduct kosong: baca varian predesigned lawas
    const variants = await db.query.ProductVariant.findMany({
      where: (t, { and, eq }) =>
        and(
          eq(t.isActive, true),
          eq(t.isPreDesigned, true),
          ...(categoryId ? [eq(t.categoryId, categoryId)] : []),
          ...(color ? [eq(t.colorHex, color)] : []),
          ...(size ? [eq(t.size, size)] : []),
        ),
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 1000,
      with: { category: { columns: { slug: true, name: true, description: true } } },
    });

    // Saring produk pengujian (E2E) agar katalog hanya menampilkan produk e-commerce asli/placeholder
    const cleanVariants = variants.filter((v) => !v.name.startsWith("E2E"));
    const parsed = cleanVariants.map((v) => ({ ...v, images: safeJsonArray(v.images) }));

    // Grouping by name + colorHex + categoryId agar tiap produk hanya tampil 1 KARTU master di e-commerce
    const sizeOrder: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
    const groupMap = new Map<string, any[]>();
    for (const v of parsed) {
      const key = `${v.name.trim().toLowerCase()}__${(v.colorHex || "").toLowerCase()}__${v.categoryId}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(v);
    }

    const enriched = Array.from(groupMap.values()).map((siblings) => {
      // Prioritaskan ukuran L atau M sebagai display utama kartu
      const master = siblings.find((s) => s.size === "L") || siblings.find((s) => s.size === "M") || siblings[0];
      const sizes = siblings
        .map((s) => ({
          size: s.size,
          priceIdr: s.priceIdr,
          stockQty: s.stockQty,
          variantId: s.id,
          sku: s.sku,
        }))
        .sort((a, b) => (sizeOrder[a.size] || 99) - (sizeOrder[b.size] || 99));

      const totalStock = sizes.reduce((acc, s) => acc + (s.stockQty || 0), 0);

      return {
        ...master,
        stockQty: totalStock,
        sizes,
      };
    });

    return NextResponse.json({ success: true, variants: enriched });
  } catch (e: any) {
    console.error("Catalog variants error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat katalog" }, { status: 500 });
  }
}
