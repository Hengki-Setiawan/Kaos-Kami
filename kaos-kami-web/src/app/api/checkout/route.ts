import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Address, Order, OrderItem, OrderStatusEvent, Payment, User } from "@/lib/drizzle-schema";
import { calculate6VariablePrice } from "@/lib/pricingEngine";
import { PRODUCT_COLORS } from "@/lib/constants";
import { duitkuProvider } from "@/lib/payments/duitku";
import { sendWhatsAppNotification, buildOrderConfirmedMessage } from "@/lib/notifications/whatsapp";
import { MAKASSAR_DELIVERY_OPTIONS, PRODUCTION_TURNAROUND_OPTIONS } from "@/lib/shipping/deliveryOptions";
import { z } from "zod";
import { DecalLayerSchema } from "@/lib/schemas/design";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { verifyTurnstileToken } from "@/lib/turnstile";

const CheckoutItemSchema = z.object({
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"]),
  productVariantId: z.string().cuid().optional(),
  designId: z.string().cuid().optional(),
  fabricThicknessSlug: z.enum(["combed-30s", "combed-24s", "combed-20s", "combed-16s", "french-terry-380"]).optional(),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3,6})$/, "HEX invalid"),
  colorName: z.string().min(1).max(40),
  size: z.string().min(1).max(10),
  quantity: z.number().int().positive().max(500),
  decals: z.array(DecalLayerSchema).max(10).default([]),
  title: z.string().max(80).optional(),
});

const CheckoutPayloadSchema = z.object({
  recipientName: z.string().min(2, "Nama penerima wajib diisi"),
  phoneNumber: z.string().min(10, "Nomor WhatsApp wajib diisi"),
  email: z.string().email().optional().or(z.literal("")),
  deliveryMethod: z.enum(["PICKUP", "INSTANT_COURIER", "FLAT_MAKASSAR", "EXPEDITION_MANUAL"]),
  turnaroundTier: z.enum(["REGULER", "EXPRESS_24H"]).default("REGULER"),
  district: z.string().optional(),
  fullAddress: z.string().min(5, "Alamat lengkap wajib diisi"),
  courierNotes: z.string().optional(),
  items: z.array(CheckoutItemSchema).min(1, "Minimal 1 item di keranjang"),
  turnstileToken: z.string().max(2048).optional(),
  couponCode: z.string().max(32).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = await checkRateLimitAsync(`checkout:ip:${ip}`, 5, 60); // Maks 5 checkout per menit per IP
    if (limit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan transaksi. Silakan tunggu ${limit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(limit, 5) }
      );
    }

    const body = await req.json();
    const validation = CheckoutPayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }

    const {
      recipientName,
      phoneNumber,
      email,
      deliveryMethod,
      turnaroundTier,
      district,
      fullAddress,
      courierNotes,
      items,
      turnstileToken,
      couponCode,
    } = validation.data;

    // Anti-bot: wajib lolos HANYA bila server mengonfigurasi secret Turnstile.
    // Tanpa secret = fitur nonaktif (terdokumentasi), bukan fail-open buta.
    if (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      const ts = await verifyTurnstileToken(turnstileToken || "", ip);
      if (!ts.success) {
        return NextResponse.json(
          { error: "Verifikasi anti-bot gagal. Muat ulang dan coba lagi." },
          { status: 403 }
        );
      }
    }

    // 1. Re-calculate entire price server-side (Never trust client prices)
    let computedSubtotalIdr = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      // Pigment/acid surcharge DITENTUKAN server dari colorHex (client tak dipercaya).
      const matchedColor = PRODUCT_COLORS.find(
        (c) => c.hex.toLowerCase() === item.colorHex.toLowerCase()
      );
      const isSpecialPigment = !!matchedColor?.isSpecialPigment;

      // Item katalog: harga dari varian DB (sudah termasuk sablon & size).
      if (item.productVariantId) {
        const variant = await db.query.ProductVariant.findFirst({
          where: (t, { eq }) => eq(t.id, item.productVariantId!),
          with: { category: { columns: { slug: true } } },
        });
        if (!variant || !variant.isActive) {
          return NextResponse.json({ error: "Varian produk tidak tersedia" }, { status: 400 });
        }
        if (variant.stockQty < item.quantity) {
          return NextResponse.json({ error: `Stok ${variant.name} kurang` }, { status: 400 });
        }
        const lineTotal = variant.priceIdr * item.quantity;
        computedSubtotalIdr += lineTotal;
        validatedItems.push({
          ...item,
          apparelSlug: (variant.category?.slug || item.apparelSlug) as any,
          unitPriceIdr: variant.priceIdr,
          lineTotalIdr: lineTotal,
          pricingSnapshot: { source: "variant", variantId: variant.id },
        });
        continue;
      }

      const pricing = calculate6VariablePrice({
        apparelSlug: item.apparelSlug,
        fabricThicknessSlug: item.fabricThicknessSlug,
        size: item.size,
        colorHex: item.colorHex,
        isSpecialPigment,
        decals: item.decals || [],
        quantity: item.quantity,
      });

      computedSubtotalIdr += pricing.totalPriceIdr;

      validatedItems.push({
        ...item,
        unitPriceIdr: pricing.unitPriceIdr,
        lineTotalIdr: pricing.totalPriceIdr,
        pricingSnapshot: pricing,
      });
    }

    // 2. Add Shipping Cost & Turnaround Surcharge
    const selectedDelivery = MAKASSAR_DELIVERY_OPTIONS.find((d) => d.method === deliveryMethod);
    const shippingCostIdr = selectedDelivery?.costIdr || 0;

    const selectedTurnaround = PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === turnaroundTier);
    const turnaroundSurchargeIdr = selectedTurnaround?.surchargeIdr || 0;

    // 2b. Kupon (opsional): validasi server-side + reservasi kuota atomik.
    let discountIdr = 0;
    let appliedCoupon: string | null = null;
    if (couponCode?.trim()) {
      try {
        const { validateCoupon, consumeCoupon } = await import("@/lib/coupons");
        const c = await validateCoupon(couponCode, computedSubtotalIdr);
        const reserved = await consumeCoupon(c.code);
        if (!reserved) {
          return NextResponse.json({ error: "Kuota kupon habis" }, { status: 400 });
        }
        discountIdr = c.discountIdr;
        appliedCoupon = c.code;
      } catch (couponErr: any) {
        return NextResponse.json({ error: couponErr?.message || "Kupon tidak valid" }, { status: 400 });
      }
    }

    const computedTotalIdr = computedSubtotalIdr - discountIdr + shippingCostIdr + turnaroundSurchargeIdr;

    // 3. Find or create user for this WhatsApp number
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    let user = await db.query.User.findFirst({
      where: (t, { or, eq }) =>
        or(eq(t.phoneNumber, cleanPhone), eq(t.email, email || `${cleanPhone}@kaoskami.customer`)),
    });

    if (!user) {
      const [created] = await db
        .insert(User)
        .values({
          id: nanoid(),
          name: recipientName,
          phoneNumber: cleanPhone,
          email: email || `${cleanPhone}@kaoskami.customer`,
          role: "CUSTOMER",
        })
        .returning();
      user = created!;
    }

    // 4. Save Address
    const [address] = await db
      .insert(Address)
      .values({
        id: nanoid(),
        userId: user.id,
        label: deliveryMethod === "PICKUP" ? "Workshop Pickup" : "Alamat Kirim",
        recipientName,
        phoneNumber: cleanPhone,
        district: district || "Makassar",
        fullAddress,
        notes: courierNotes,
      })
      .returning({ id: Address.id });

    // 5. Generate Human-Readable Order Number (KK-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `KK-${dateStr}-${randomSuffix}`;

    // 6. Create Order & Items in DB Transaction
    const [orderBase] = await db
      .insert(Order)
      .values({
        id: nanoid(),
        orderNumber,
        userId: user.id,
        status: "PENDING_PAYMENT",
        deliveryMethod,
        subtotalIdr: computedSubtotalIdr,
        shippingCostIdr,
        discountIdr,
        totalIdr: computedTotalIdr,
        shippingAddressId: address?.id,
        courierNotes: courierNotes || (turnaroundTier === "EXPRESS_24H" ? "EXPRESS 24H" : ""),
      })
      .returning();
    const orderRow = orderBase!;
    // Kompensasi order yatim: jika tulis items/riwayat gagal setelah order
    // terbuat (libsql/web tanpa transaksi interaktif), hapus order-nya agar
    // tidak ada order tanpa item di admin. Kegagalan kompensasi di-log saja.
    try {
      await db.insert(OrderItem).values(
        validatedItems.map((item) => ({
          id: nanoid(),
          orderId: orderRow.id,
          productVariantId: item.productVariantId || null,
          designId: item.designId || null,
          quantity: item.quantity,
          unitPriceIdr: item.unitPriceIdr,
          lineTotalIdr: item.lineTotalIdr,
          snapshotName: item.title || `${item.apparelSlug.toUpperCase()} Custom DTF Sablon`,
          snapshotSize: item.size,
          snapshotColorName: item.colorName,
        })),
      );
      await db.insert(OrderStatusEvent).values({
        id: nanoid(),
        orderId: orderRow.id,
        status: "PENDING_PAYMENT",
        note: `Pesanan dibuat oleh pelanggan (${recipientName}).`,
      });
    } catch (itemsErr: any) {
      console.error("Checkout items gagal, kompensasi hapus order:", orderRow.id, itemsErr?.message);
      try {
        await db.delete(OrderStatusEvent).where(eq(OrderStatusEvent.orderId, orderRow.id));
        await db.delete(OrderItem).where(eq(OrderItem.orderId, orderRow.id));
        await db.delete(Order).where(eq(Order.id, orderRow.id));
      } catch (compErr: any) {
        console.error("Kompensasi order yatim gagal:", orderRow.id, compErr?.message);
      }
      throw itemsErr;
    }
    const order = { ...orderRow, items: validatedItems };

    // 7. Request Duitku Payment Token & Reference (fail-closed: lempar 502, order tetap PENDING)
    let chargeResult;
    try {
      // Duitku mewajibkan paymentAmount == Σ(item price×qty): kirim baris
      // ongkir/surcharge/diskon eksplisit (harga negatif untuk diskon OK).
      const duitkuItems = [
        ...validatedItems.map((it) => ({
          name: it.title || `${it.apparelSlug.toUpperCase()} Sablon`,
          price: it.unitPriceIdr,
          quantity: it.quantity,
        })),
        ...(shippingCostIdr > 0
          ? [{ name: `Ongkir ${selectedDelivery?.name || deliveryMethod}`, price: shippingCostIdr, quantity: 1 }]
          : []),
        ...(turnaroundSurchargeIdr > 0
          ? [{ name: "Surcharge EXPRESS 24H", price: turnaroundSurchargeIdr, quantity: 1 }]
          : []),
        ...(discountIdr > 0
          ? [{ name: `Diskon kupon ${appliedCoupon || ""}`.trim(), price: -discountIdr, quantity: 1 }]
          : []),
      ];
      chargeResult = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: computedTotalIdr,
        customer: {
          name: recipientName,
          phone: cleanPhone,
          email: email || `${cleanPhone}@kaoskami.customer`,
        },
        itemDetails: duitkuItems,
      });
    } catch (chargeErr: any) {
      console.error("Duitku charge gagal, order tetap PENDING_PAYMENT:", chargeErr?.message);
      try {
        const { captureException } = await import("@sentry/nextjs").catch(() => ({ captureException: null as any }));
        captureException?.(chargeErr, { extra: { orderId: order.id, orderNumber } });
      } catch {}
      return NextResponse.json(
        {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          invoiceUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${order.id}`,
          error: "Pembayaran Duitku gagal dibuat. Pesanan tersimpan PENDING — silakan retry checkout.",
          detail: chargeErr?.message,
        },
        { status: 502 }
      );
    }

    // 8. Create Payment Record in Database
    await db.insert(Payment).values({
      id: nanoid(),
      orderId: order.id,
      provider: "DUITKU",
      providerRef: chargeResult.reference,
      amountIdr: computedTotalIdr,
      status: "PENDING",
    });

    // 9. Send WhatsApp Confirmation asynchronously (Graceful fallback)
    const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${order.id}`;
    const itemsSummary = validatedItems
      .map((it) => `${it.quantity}x ${it.apparelSlug.toUpperCase()} (${it.size})`)
      .join(", ");

    sendWhatsAppNotification(
      cleanPhone,
      buildOrderConfirmedMessage({
        orderNumber: order.orderNumber,
        recipientName,
        totalIdr: computedTotalIdr,
        deliveryMethod: selectedDelivery?.name || deliveryMethod,
        itemSummary: itemsSummary,
        invoiceUrl,
      })
    ).catch((err) => console.warn("Background WA notification warning:", err));

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl: chargeResult.paymentUrl,
      reference: chargeResult.reference,
      invoiceUrl,
      discountIdr,
      appliedCoupon,
    });
  } catch (error: any) {
    console.error("Checkout process error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error during checkout" }, { status: 500 });
  }
}
