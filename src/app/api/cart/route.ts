import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    let cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { productVariant: true, design: true } } } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId }, include: { items: { include: { productVariant: true, design: true } } } });
    }
    return NextResponse.json({ success: true, cart });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
