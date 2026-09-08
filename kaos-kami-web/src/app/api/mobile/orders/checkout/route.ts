import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import { Address, Order, OrderItem, OrderStatusEvent, Payment, User } from "@/lib/drizzle-schema";
import { calculate6VariablePrice } from "@/lib/pricingEngine";
import { PRODUCT_COLORS } from "@/lib/constants";
import { duitkuProvider } from "@/lib/payments/duitku";
import { sendWhatsAppNotification, buildOrderConfirmedMessage } from "@/lib/notifications/whatsapp";
import { MAKASSAR_DELIVERY_OPTIONS } from "@/lib/shipping/deliveryOptions";
import { DecalLayerSchema } from "@/lib/schemas/design";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const MobileItemSchema = z.object({
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"]),
  fabricThicknessSlug: z
    .enum(["combed-30s", "combed-24s", "combed-20s", "combed-16s", "french-terry-380"])
    .optional(),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3,6})$/),
  colorName: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().positive().max(500),
  decals: z.array(DecalLayerSchema).max(10).default([]),
  title: z.string().max(80).optional(),
});

const MobileCheckoutSchema = z.object({
  recipientName: z.string().min(2),
  phoneNumber: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  deliveryMethod: z.enum(["PICKUP", "FREE_MAKASSAR", "INSTANT_COURIER", "FLAT_MAKASSAR", "EXPEDITION_MANUAL"]),
  district: z.string().optional(),
  destinationCity: z.string().max(80).optional(),
  expeditionZoneId: z.string().max(64).optional(),
  destinationPostalCode: z.string().regex(/^\d{5}$/).optional(),
  expeditionCourier: z.string().max(32).optional(),
  expeditionService: z.string().max(64).optional(),
  fullAddress: z.string().min(5),
  courierNotes: z.string().optional(),
  // Metode yang didukung Duitku inquiry. Tak dikenal → QRIS default (SP),
  // BUKAN collapse diam-diam (transparan di respons).
  paymentMethod: z.enum(["QRIS", "VA_BCA", "VA_MANDIRI", "VA_BNI", "VA_BRI", "GOPAY", "SHOPEEPAY", "COD", "SP", "BC", "M2", "B1", "BT"]).optional(),
  cod: z.boolean().optional(),
  couponCode: z.string().max(32).optional(),
  items: z.array(MobileItemSchema).min(1).max(20),
});

/**
 * M10.2 — POST /api/mobile/orders/checkout
 * Checkout ringkas untuk aplikasi Capacitor: validasi Zod + re-hitung server-side
 * (jangan percaya total dari HP) + Duitku fail-closed seperti web checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`m-checkout:ip:${ip}`, 5, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak transaksi. Tunggu ${rl.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(rl, 5) }
      );
    }

    const validation = MobileCheckoutSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    const { recipientName, phoneNumber, email, deliveryMethod, district, destinationCity, expeditionZoneId, destinationPostalCode, expeditionCourier, expeditionService, fullAddress, courierNotes, paymentMethod, cod, couponCode, items } =
      validation.data;

    let subtotalIdr = 0;
    const validatedItems: any[] = [];
    for (const item of items) {
      const matchedColor = PRODUCT_COLORS.find(
        (c) => c.hex.toLowerCase() === item.colorHex.toLowerCase()
      );
      const pricing = calculate6VariablePrice({
        apparelSlug: item.apparelSlug,
        fabricThicknessSlug: item.fabricThicknessSlug,
        size: item.size,
        colorHex: item.colorHex,
        isSpecialPigment: !!matchedColor?.isSpecialPigment,
        decals: item.decals || [],
        quantity: item.quantity,
      });
      subtotalIdr += pricing.totalPriceIdr;
      validatedItems.push({ ...item, unitPriceIdr: pricing.unitPriceIdr, lineTotalIdr: pricing.totalPriceIdr });
    }

    const delivery = MAKASSAR_DELIVERY_OPTIONS.find((d) => d.method === deliveryMethod);
    // Ekspedisi luar kota: PRIMER live AgenWebsite, fallback tabel zona.
    let shippingIdr = delivery?.costIdr || 0;
    let expeditionLabel = "";
    if (deliveryMethod === "EXPEDITION_MANUAL") {
      const totalQty = validatedItems.reduce((a: number, it: any) => a + (it.quantity || 0), 0);
      const weightGrams = Math.max(250, totalQty * 250);
      let liveResolved = false;
      if (destinationPostalCode) {
        try {
          const { awRatesCached } = await import("@/lib/shipping/agenwebsite");
          const live = await awRatesCached(destinationPostalCode, weightGrams);
          if (live && live.length > 0) {
            const pick =
              live.find((r) => r.courierCode === expeditionCourier && r.serviceCode === expeditionService) ||
              live.find((r) => r.cheapest) ||
              live[0]!;
            shippingIdr = pick.costIdr;
            expeditionLabel = `${pick.courierName} ${pick.serviceName} (live, est. ${pick.etdText})`;
            liveResolved = true;
          }
        } catch (e: any) {
          console.warn("Mobile live ongkir gagal, fallback zona:", e?.message);
        }
      }
      if (!liveResolved) {
        const { resolveExpeditionCost } = await import("@/lib/shipping/zones");
        const resolved = await resolveExpeditionCost({ zoneId: expeditionZoneId, city: destinationCity || district });
        shippingIdr = resolved.costIdr;
        if (resolved.zone) {
          expeditionLabel = `Ekspedisi ${resolved.zone.courier} ${resolved.zone.service} ke ${resolved.zone.city} (est. ${resolved.zone.etdLabel})`;
        }
      }
    }
    // Kupon (opsional) — sama seperti checkout web.
    let discountIdr = 0;
    let appliedCoupon: string | null = null;
    if (couponCode?.trim()) {
      try {
        const { validateCoupon, consumeCoupon } = await import("@/lib/coupons");
        const c = await validateCoupon(couponCode, subtotalIdr);
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
    const totalIdr = subtotalIdr - discountIdr + shippingIdr;
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    const guestEmail = email || `${cleanPhone}@kaoskami.customer`;

    let user = await db.query.User.findFirst({
      where: (t, { or, eq }) => or(eq(t.phoneNumber, cleanPhone), eq(t.email, guestEmail)),
    });
    if (!user) {
      const [created] = await db
        .insert(User)
        .values({ id: nanoid(), name: recipientName, phoneNumber: cleanPhone, email: guestEmail, role: "CUSTOMER" })
        .onConflictDoNothing()
        .returning();
      user =
        created! ||
        (await db.query.User.findFirst({
          where: (t, { or, eq }) => or(eq(t.phoneNumber, cleanPhone), eq(t.email, guestEmail)),
        }))!;
    }

    const [address] = await db
      .insert(Address)
      .values({
        id: nanoid(),
        userId: user.id,
        label: deliveryMethod === "PICKUP" ? "Workshop Pickup" : "Alamat Kirim",
        recipientName,
        phoneNumber: cleanPhone,
        district: deliveryMethod === "EXPEDITION_MANUAL" ? destinationCity || district || "Luar Kota" : district || "Makassar",
        fullAddress,
        notes: [courierNotes, expeditionLabel].filter(Boolean).join(" | ") || undefined,
      })
      .returning({ id: Address.id });

    // Nomor order WITA + retry anti-tabrakan (lihat checkout web).
    const { nextOrderNumber } = await import("@/lib/orderNumber");
    let createdOrder: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 5 && !createdOrder; attempt++) {
      try {
        const [row] = await db
          .insert(Order)
          .values({
            id: nanoid(),
            orderNumber: nextOrderNumber(),
            userId: user.id,
            status: "PENDING_PAYMENT",
            deliveryMethod,
            subtotalIdr,
            shippingCostIdr: shippingIdr,
            discountIdr,
            totalIdr,
            shippingAddressId: address?.id,
            courierNotes: [courierNotes, expeditionLabel].filter(Boolean).join(" | ") || undefined,
          })
          .returning();
        createdOrder = row!;
      } catch (e: any) {
        lastErr = e;
        if (!String(e?.message || "").includes("UNIQUE")) throw e;
      }
    }
    if (!createdOrder) throw lastErr || new Error("Gagal buat nomor order");
    const orderRow = createdOrder;
    // Kompensasi order yatim (lihat checkout web untuk alasan).
    try {
      await db.insert(OrderItem).values(
        validatedItems.map((item) => ({
          id: nanoid(),
          orderId: orderRow.id,
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
        note: "Pesanan dari aplikasi mobile.",
      });
    } catch (itemsErr: any) {
      console.error("Mobile checkout items gagal, kompensasi hapus order:", orderRow.id, itemsErr?.message);
      try {
        await db.delete(OrderStatusEvent).where(eq(OrderStatusEvent.orderId, orderRow.id));
        await db.delete(OrderItem).where(eq(OrderItem.orderId, orderRow.id));
        await db.delete(Order).where(eq(Order.id, orderRow.id));
      } catch (compErr: any) {
        console.error("Kompensasi order yatim gagal:", orderRow.id, compErr?.message);
      }
      throw itemsErr;
    }
    const order = {
      ...orderRow,
      items: validatedItems,
    };

    let charge;
    const invoiceUrlEarly = `${siteUrl()}/orders/${order.id}`;
    if (cod) {
      // Bayar tunai ke kurir: tanpa Duitku, order menunggu konfirmasi admin.
      await db.insert(Payment).values({
        id: nanoid(),
        orderId: order.id,
        provider: "DUITKU",
        providerRef: `COD-${order.orderNumber}`,
        method: "COD",
        amountIdr: totalIdr,
        status: "PENDING",
      });
      charge = { reference: `COD-${order.orderNumber}`, paymentUrl: invoiceUrlEarly };
    } else {
    try {
      // Peta eksplisit metode HP → kode Duitku. Tak dikenal → SP (QRIS).
      const DUITKU_METHOD_MAP: Record<string, string> = {
        QRIS: "SP", SHOPEEPAY: "SP", SP: "SP", GOPAY: "SP",
        VA_BCA: "BC", BC: "BC", VA_MANDIRI: "M2", M2: "M2",
        VA_BNI: "B1", B1: "B1", VA_BRI: "BT", BT: "BT", COD: "SP",
      };
      const duitkuMethod = DUITKU_METHOD_MAP[paymentMethod || "QRIS"] || "SP";
      // Duitku: paymentAmount wajib == Σ item (lihat checkout web).
      const duitkuItems = [
        ...validatedItems.map((it) => ({
          name: it.title || `${it.apparelSlug.toUpperCase()} Sablon`,
          price: it.unitPriceIdr,
          quantity: it.quantity,
        })),
        ...(shippingIdr > 0
          ? [{ name: `Ongkir ${expeditionLabel || delivery?.name || deliveryMethod}`.slice(0, 120), price: shippingIdr, quantity: 1 }]
          : []),
        ...(discountIdr > 0
          ? [{ name: `Diskon kupon ${appliedCoupon || ""}`.trim(), price: -discountIdr, quantity: 1 }]
          : []),
      ];
      charge = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: totalIdr,
        paymentMethod: duitkuMethod,
        customer: { name: recipientName, phone: cleanPhone, email: email || `${cleanPhone}@kaoskami.customer` },
        itemDetails: duitkuItems,
      });
    } catch (chargeErr: any) {
      console.error("Mobile checkout Duitku gagal:", chargeErr?.message);
      return NextResponse.json(
        {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: user.id,
          invoiceUrl: `${siteUrl()}/orders/${order.id}`,
          error: "Pembayaran gagal dibuat. Pesanan PENDING — silakan retry.",
        },
        { status: 502 }
      );
    }

    await db.insert(Payment).values({
      id: nanoid(),
      orderId: order.id,
      provider: "DUITKU",
      providerRef: charge.reference,
      method: paymentMethod || "DUITKU",
      amountIdr: totalIdr,
      status: "PENDING",
    });
    } // end else (non-COD)

    const invoiceUrl = `${siteUrl()}/orders/${order.id}`;
    sendWhatsAppNotification(
      cleanPhone,
      buildOrderConfirmedMessage({
        orderNumber: order.orderNumber,
        recipientName,
        totalIdr,
        deliveryMethod: delivery?.name || deliveryMethod,
        itemSummary: validatedItems.map((it) => `${it.quantity}x ${it.apparelSlug.toUpperCase()} (${it.size})`).join(", "),
        invoiceUrl,
      })
    ).catch((err) => console.warn("Mobile checkout WA warning:", err));

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: user.id,
      paymentUrl: charge.paymentUrl,
      reference: charge.reference,
      invoiceUrl,
      discountIdr,
      appliedCoupon,
    });
  } catch (e: any) {
    console.error("Mobile checkout error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
