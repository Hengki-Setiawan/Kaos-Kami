import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET(req: NextRequest) {
  try {
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
    const parsed = variants.map(v => ({ ...v, images: JSON.parse(v.images || '[]') }));
    return NextResponse.json({ success: true, variants: parsed });
  } catch(e:any){
    // Jujur gagal — JANGAN kembalikan harga/stok fiktif (pernah menipu storefront).
    console.error("Catalog variants error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat katalog" }, { status: 500 });
  }
}
