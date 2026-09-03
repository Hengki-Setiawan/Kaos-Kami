import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET() {
  try {
    const categories = await prisma.apparelCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { variants: true } } },
    });
    const parsed = categories.map(c => ({
      ...c,
      sizes: JSON.parse(c.sizes || '[]'),
      decalNodes: JSON.parse(c.decalNodes || '[]'),
    }));
    return NextResponse.json({ success: true, categories: parsed });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
