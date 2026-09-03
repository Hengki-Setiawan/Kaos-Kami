import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertResourceOwnerOrAdmin } from '@/lib/security/authGuard';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    try {
      await assertResourceOwnerOrAdmin(userId);
    } catch (e: any) {
      const msg = e?.message || 'Forbidden';
      const status = msg.startsWith('Unauthorized') ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
    let cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { productVariant: true, design: true } } } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId }, include: { items: { include: { productVariant: true, design: true } } } });
    }
    return NextResponse.json({ success: true, cart });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
