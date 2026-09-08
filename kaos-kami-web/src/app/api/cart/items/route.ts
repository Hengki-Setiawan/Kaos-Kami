import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Cart, CartItem } from '@/lib/drizzle-schema';
import { z } from 'zod';
import { assertResourceOwnerOrAdmin } from '@/lib/security/authGuard';
const AddItemSchema = z.object({
  userId: z.string(),
  productVariantId: z.string().optional(),
  designId: z.string().optional(),
  quantity: z.number().int().positive().max(100).default(1),
  unitPriceIdr: z.number().int(),
});
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AddItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid' }, { status: 400 });
    const { userId, productVariantId, designId, quantity, unitPriceIdr } = parsed.data;
    if (!productVariantId && !designId) return NextResponse.json({ error: 'Need productVariantId or designId' }, { status: 400 });
    try {
      await assertResourceOwnerOrAdmin(userId);
    } catch (e: any) {
      const msg = e?.message || 'Forbidden';
      const status = msg.startsWith('Unauthorized') ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
    let cart = await db.query.Cart.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });
    if (!cart) {
      const [created] = await db.insert(Cart).values({ id: nanoid(), userId }).returning();
      cart = created!;
    }
    // Gabung qty bila item identik sudah ada (varian/desain sama) —
    // jangan bikin baris ganda.
    const same = await db.query.CartItem.findFirst({
      where: (t, { and, eq, isNull }) =>
        and(
          eq(t.cartId, cart.id),
          productVariantId ? eq(t.productVariantId, productVariantId) : isNull(t.productVariantId),
          designId ? eq(t.designId, designId) : isNull(t.designId)
        ),
    });
    if (same) {
      const [merged] = await db
        .update(CartItem)
        .set({ quantity: same.quantity + quantity, unitPriceIdr })
        .where(eq(CartItem.id, same.id))
        .returning();
      return NextResponse.json({ success: true, item: merged, merged: true });
    }
    const [item] = await db
      .insert(CartItem)
      .values({ id: nanoid(), cartId: cart.id, productVariantId: productVariantId || null, designId: designId || null, quantity, unitPriceIdr })
      .returning();
    return NextResponse.json({ success: true, item });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawId = (searchParams.get('itemId') || '').slice(0, 64);
    if (!rawId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    const itemId = rawId;
    const existing = await db.query.CartItem.findFirst({
      where: (t, { eq }) => eq(t.id, itemId),
      with: { cart: true },
    });
    if (!existing || !existing.cart) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    try {
      await assertResourceOwnerOrAdmin(existing.cart.userId);
    } catch (e: any) {
      const msg = e?.message || 'Forbidden';
      const status = msg.startsWith('Unauthorized') ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
    await db.delete(CartItem).where(eq(CartItem.id, itemId));
    return NextResponse.json({ success: true });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const UpdateQtySchema = z.object({
  itemId: z.string().min(5).max(64),
  quantity: z.number().int().min(1).max(100),
});
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UpdateQtySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid itemId/quantity' }, { status: 400 });
    const { itemId, quantity } = parsed.data;
    const existing = await db.query.CartItem.findFirst({
      where: (t, { eq }) => eq(t.id, itemId),
      with: { cart: true },
    });
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    try {
      await assertResourceOwnerOrAdmin(existing.cart.userId);
    } catch (e: any) {
      const msg = e?.message || 'Forbidden';
      const status = msg.startsWith('Unauthorized') ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
    const [updated] = await db
      .update(CartItem)
      .set({ quantity })
      .where(eq(CartItem.id, itemId))
      .returning();
    return NextResponse.json({ success: true, item: updated });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
