import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { Cart } from '@/lib/drizzle-schema';
import { assertResourceOwnerOrAdmin } from '@/lib/security/authGuard';

async function getCartWithItems(userId: string) {
  return db.query.Cart.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
    with: { items: { with: { productVariant: true, design: true } } },
  });
}

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
    let cart = await getCartWithItems(userId);
    if (!cart) {
      await db.insert(Cart).values({ id: nanoid(), userId });
      cart = await getCartWithItems(userId);
    }
    return NextResponse.json({ success: true, cart });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
