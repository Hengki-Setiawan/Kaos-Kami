import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { Cart, CartItem } from "@/lib/drizzle-schema";
import { assertResourceOwnerOrAdmin } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// Reorder batch (audit #24): 1 request untuk N item, harga 100% dari server.
// Menggantikan loop N×POST client (parsial + harga dari client).
const BatchItemSchema = z.object({
  productVariantId: z.string().max(64).optional(),
  designId: z.string().max(64).optional(),
  quantity: z.number().int().positive().max(100).default(1),
});

const BatchSchema = z.object({
  userId: z.string().min(1).max(64),
  items: z.array(BatchItemSchema).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimitAsync(`cart-batch:ip:${getClientIp(req)}`, 10, 60);
  if (rl.isLimited) {
    return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
  }
  try {
    const parsed = BatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
    }
    const { userId, items } = parsed.data;
    try {
      await assertResourceOwnerOrAdmin(userId);
    } catch (e: any) {
      const msg = e?.message || "Forbidden";
      const status = msg.startsWith("Unauthorized") ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }

    let cart = await db.query.Cart.findFirst({ where: (t, { eq: e }) => e(t.userId, userId) });
    if (!cart) {
      const [created] = await db.insert(Cart).values({ id: nanoid(), userId }).returning();
      cart = created!;
    }

    let added = 0;
    let skipped = 0;
    for (const it of items) {
      if (!it.productVariantId && !it.designId) {
        skipped++;
        continue;
      }
      // Harga dari server: varian DB atau desain DB. Client tak dipercaya.
      let unitPriceIdr: number | null = null;
      if (it.productVariantId) {
        const v = await db.query.ProductVariant.findFirst({
          where: (t, { eq: e }) => e(t.id, it.productVariantId!),
        });
        if (!v || !v.isActive) {
          skipped++;
          continue;
        }
        unitPriceIdr = v.priceIdr;
      } else if (it.designId) {
        const d = await db.query.Design.findFirst({
          where: (t, { eq: e }) => e(t.id, it.designId!),
        });
        if (!d) {
          skipped++;
          continue;
        }
        // Desain harus milik sendiri (audit: tambah desain orang ke cart).
        try {
          await assertResourceOwnerOrAdmin(d.userId || userId);
        } catch {
          skipped++;
          continue;
        }
        // Harga dihitung ULANG dari decals (audit: harga tersimpan bisa
        // diracuni via save/claim lama) — jangan percaya kolom DB.
        try {
          const { calculate6VariablePrice } = await import("@/lib/pricingEngine");
          const { PRODUCT_COLORS } = await import("@/lib/constants");
          const { ApparelCategory } = await import("@/lib/drizzle-schema");
          const cat = await db.query.ApparelCategory.findFirst({
            where: (t, { eq: e }) => e(t.id, (d as any).categoryId),
          });
          const decals = JSON.parse((d as any).decals || "[]");
          const matched = PRODUCT_COLORS.find(
            (c: any) => String(c.hex).toLowerCase() === String((d as any).colorHex).toLowerCase()
          );
          const pricing = calculate6VariablePrice({
            apparelSlug: (cat?.slug || "tshirt") as any,
            size: (d as any).size || "L",
            colorHex: (d as any).colorHex || "#121214",
            isSpecialPigment: !!matched?.isSpecialPigment,
            decals: Array.isArray(decals) ? decals : [],
            quantity: 1,
          });
          unitPriceIdr = pricing.totalPriceIdr;
        } catch {
          skipped++;
          continue;
        }
      }
      if (unitPriceIdr == null) {
        skipped++;
        continue;
      }
      const same = await db.query.CartItem.findFirst({
        where: (t, { and, eq: e, isNull }) =>
          and(
            e(t.cartId, cart.id),
            it.productVariantId ? e(t.productVariantId, it.productVariantId) : isNull(t.productVariantId),
            it.designId ? e(t.designId, it.designId) : isNull(t.designId)
          ),
      });
      if (same) {
        await db
          .update(CartItem)
          .set({ quantity: same.quantity + it.quantity, unitPriceIdr })
          .where(eq(CartItem.id, same.id));
      } else {
        await db.insert(CartItem).values({
          id: nanoid(),
          cartId: cart.id,
          productVariantId: it.productVariantId || null,
          designId: it.designId || null,
          quantity: it.quantity,
          unitPriceIdr,
        });
      }
      added++;
    }
    return NextResponse.json({ success: true, added, skipped });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal" }, { status: 500 });
  }
}
