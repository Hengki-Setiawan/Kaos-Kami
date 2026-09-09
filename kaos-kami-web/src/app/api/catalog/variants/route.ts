import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonArray } from '@/lib/json';
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`catalog:ip:${getClientIp(req)}`, 60, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering." }, { status: 429, headers: rateLimitHeaders(rl, 60) });
    }
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const color = searchParams.get('color');
    const size = searchParams.get('size');
    const variants = await db.query.ProductVariant.findMany({
      where: (t, { and, eq }) =>
        and(
          eq(t.isActive, true),
          ...(categoryId ? [eq(t.categoryId, categoryId)] : []),
          ...(color ? [eq(t.colorHex, color)] : []),
          ...(size ? [eq(t.size, size)] : []),
        ),
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 50,
      with: { category: { columns: { slug: true, name: true } } },
    });
    const parsed = variants.map(v => ({ ...v, images: safeJsonArray(v.images) }));
    return NextResponse.json({ success: true, variants: parsed });
  } catch(e:any){
    // Jujur gagal — JANGAN kembalikan harga/stok fiktif (pernah menipu storefront).
    console.error("Catalog variants error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat katalog" }, { status: 500 });
  }
}
