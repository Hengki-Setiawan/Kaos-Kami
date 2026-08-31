import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const color = searchParams.get('color');
    const size = searchParams.get('size');
    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (color) where.colorHex = color;
    if (size) where.size = size;
    const variants = await prisma.productVariant.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const parsed = variants.map(v => ({ ...v, images: JSON.parse(v.images || '[]') }));
    return NextResponse.json({ success: true, variants: parsed });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
