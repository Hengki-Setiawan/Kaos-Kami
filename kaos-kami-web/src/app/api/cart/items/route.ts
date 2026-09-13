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
  // unitPriceIdr dari client DIABAIKAN (audit: harga wajib dari server
  // seperti batch — field lama dibiarkan opsional agar APK lama tak 400,
  // tapi nilainya tak pernah dipakai).
  unitPriceIdr: z.number().int().min(0).max(100_000_000).optional(),
});
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AddItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid' }, { status: 400 });
    const { userId, productVariantId, designId, quantity } = parsed.data;
    if (!productVariantId && !designId) return NextResponse.json({ error: 'Need productVariantId or designId' }, { status: 400 });
    try {
      await assertResourceOwnerOrAdmin(userId);
    } catch (e: any) {
      const msg = e?.message || 'Forbidden';
      const status = msg.startsWith('Unauthorized') ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }
    // Harga 100% dari server (paritas batch): varian DB atau hitung ulang
    // dari decals desain. Client tak dipercaya.
    let unitPriceIdr: number | null = null;
    if (productVariantId) {
      const v = await db.query.ProductVariant.findFirst({
        where: (t, { eq }) => eq(t.id, productVariantId),
        columns: { id: true, isActive: true, priceIdr: true },
      });
      if (!v || !v.isActive) return NextResponse.json({ error: 'Varian tidak tersedia' }, { status: 400 });
      unitPriceIdr = v.priceIdr;
    } else if (designId) {
      const d = await db.query.Design.findFirst({
        where: (t, { eq }) => eq(t.id, designId),
      });
      if (!d) return NextResponse.json({ error: 'Desain tidak ditemukan' }, { status: 404 });
      try {
        await assertResourceOwnerOrAdmin(d.userId || userId);
      } catch (e: any) {
        return NextResponse.json({ error: 'Bukan desain milikmu' }, { status: 403 });
      }
      // Harga dihitung ULANG dari decals (paritas batch — kolom DB bisa
      // diracuni via save/claim lama).
      try {
        const { calculate6VariablePrice } = await import("@/lib/pricingEngine");
        const { PRODUCT_COLORS } = await import("@/lib/constants");
        const cat = await db.query.ApparelCategory.findFirst({
          where: (t, { eq: e }) => e(t.id, (d as any).categoryId),
        });
        const decals = JSON.parse((d as any).decals || "[]");
        const matched = PRODUCT_COLORS.find(
          (c: any) => String(c.hex).toLowerCase() === String((d as any).colorHex).toLowerCase()
        );
        const pricing = calculate6VariablePrice({
          apparelSlug: ((cat as any)?.slug || "tshirt") as any,
          size: (d as any).size || "L",
          colorHex: (d as any).colorHex || "#121214",
          isSpecialPigment: !!matched?.isSpecialPigment,
          decals: Array.isArray(decals) ? decals : [],
          quantity: 1,
        });
        unitPriceIdr = pricing.totalPriceIdr;
      } catch {
        return NextResponse.json({ error: 'Desain tidak valid' }, { status: 400 });
      }
    }
    if (unitPriceIdr == null) return NextResponse.json({ error: 'Need productVariantId or designId' }, { status: 400 });
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
