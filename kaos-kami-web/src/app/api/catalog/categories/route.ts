import { NextResponse } from 'next/server';
import { count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ApparelCategory, ProductVariant } from '@/lib/drizzle-schema';
export async function GET() {
  try {
    const categories = await db.query.ApparelCategory.findMany({
      where: (t, { eq }) => eq(t.isActive, true),
      orderBy: (t, { asc }) => asc(t.sortOrder),
    });
    // _count.variants (ganti Prisma _count agar payload storefront identik)
    const counts = await db
      .select({ categoryId: ProductVariant.categoryId, n: count() })
      .from(ProductVariant)
      .groupBy(ProductVariant.categoryId);
    const countMap = new Map(counts.map((r) => [r.categoryId, r.n]));
    const parsed = categories.map(c => ({
      ...c,
      _count: { variants: countMap.get(c.id) || 0 },
      sizes: JSON.parse(c.sizes || '[]'),
      decalNodes: JSON.parse(c.decalNodes || '[]'),
    }));
    return NextResponse.json({ success: true, categories: parsed });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
