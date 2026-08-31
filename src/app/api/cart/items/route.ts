import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
const AddItemSchema = z.object({
  userId: z.string(),
  productVariantId: z.string().optional(),
  designId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPriceIdr: z.number().int(),
});
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AddItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid' }, { status: 400 });
    const { userId, productVariantId, designId, quantity, unitPriceIdr } = parsed.data;
    if (!productVariantId && !designId) return NextResponse.json({ error: 'Need productVariantId or designId' }, { status: 400 });
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) cart = await prisma.cart.create({ data: { userId } });
    const item = await prisma.cartItem.create({
      data: { cartId: cart.id, productVariantId: productVariantId || null, designId: designId || null, quantity, unitPriceIdr },
    });
    return NextResponse.json({ success: true, item });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, quantity } = body;
    if (!itemId || !quantity || quantity < 1) return NextResponse.json({ error: 'Invalid itemId/quantity' }, { status: 400 });
    if (quantity > 100) return NextResponse.json({ error: 'Max 100 per item' }, { status: 400 });
    const updated = await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return NextResponse.json({ success: true, item: updated });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
