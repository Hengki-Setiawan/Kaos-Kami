import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { calculate6VariablePrice } from "@/lib/pricingEngine";
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
  deliveryMethod: z.enum(["PICKUP", "INSTANT_COURIER", "FLAT_MAKASSAR", "EXPEDITION_MANUAL"]),
  district: z.string().optional(),
  fullAddress: z.string().min(5),
  courierNotes: z.string().optional(),
  paymentMethod: z.string().max(32).optional(),
  cod: z.boolean().optional(),
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
    const { recipientName, phoneNumber, email, deliveryMethod, district, fullAddress, courierNotes, paymentMethod, cod, items } =
      validation.data;

    let subtotalIdr = 0;
    const validatedItems: any[] = [];
    for (const item of items) {
      const pricing = calculate6VariablePrice({
        apparelSlug: item.apparelSlug,
        fabricThicknessSlug: item.fabricThicknessSlug,
        size: item.size,
        colorHex: item.colorHex,
        decals: item.decals || [],
        quantity: item.quantity,
      });
      subtotalIdr += pricing.totalPriceIdr;
      validatedItems.push({ ...item, unitPriceIdr: pricing.unitPriceIdr, lineTotalIdr: pricing.totalPriceIdr });
    }

    const delivery = MAKASSAR_DELIVERY_OPTIONS.find((d) => d.method === deliveryMethod);
    const totalIdr = subtotalIdr + (delivery?.costIdr || 0);
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");

    let user = await prisma.user.findFirst({
      where: { OR: [{ phoneNumber: cleanPhone }, { email: email || `${cleanPhone}@kaoskami.customer` }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: recipientName,
          phoneNumber: cleanPhone,
          email: email || `${cleanPhone}@kaoskami.customer`,
          role: "CUSTOMER",
        },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label: deliveryMethod === "PICKUP" ? "Workshop Pickup" : "Alamat Kirim",
        recipientName,
        phoneNumber: cleanPhone,
        district: district || "Makassar",
        fullAddress,
        notes: courierNotes,
      },
    });

    const orderNumber = `KK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: "PENDING_PAYMENT",
        deliveryMethod,
        subtotalIdr,
        shippingCostIdr: delivery?.costIdr || 0,
        discountIdr: 0,
        totalIdr,
        shippingAddressId: address.id,
        courierNotes,
        items: {
          create: validatedItems.map((item) => ({
            quantity: item.quantity,
            unitPriceIdr: item.unitPriceIdr,
            lineTotalIdr: item.lineTotalIdr,
            snapshotName: item.title || `${item.apparelSlug.toUpperCase()} Custom DTF Sablon`,
            snapshotSize: item.size,
            snapshotColorName: item.colorName,
          })),
        },
        statusHistory: { create: { status: "PENDING_PAYMENT", note: "Pesanan dari aplikasi mobile." } },
      },
      include: { items: true },
    });

    let charge;
    const invoiceUrlEarly = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${order.id}`;
    if (cod) {
      // Bayar tunai ke kurir: tanpa Duitku, order menunggu konfirmasi admin.
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "DUITKU",
          providerRef: `COD-${order.orderNumber}`,
          method: "COD",
          amountIdr: totalIdr,
          status: "PENDING",
        },
      });
      charge = { reference: `COD-${order.orderNumber}`, paymentUrl: invoiceUrlEarly };
    } else {
    try {
      const duitkuMethod = paymentMethod === "VA_BCA" ? "BC" : "SP"; // QRIS default
      charge = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: totalIdr,
        paymentMethod: duitkuMethod,
        customer: { name: recipientName, phone: cleanPhone, email: email || `${cleanPhone}@kaoskami.customer` },
        itemDetails: validatedItems.map((it) => ({
          name: it.title || `${it.apparelSlug.toUpperCase()} Sablon`,
          price: it.unitPriceIdr,
          quantity: it.quantity,
        })),
      });
    } catch (chargeErr: any) {
      console.error("Mobile checkout Duitku gagal:", chargeErr?.message);
      return NextResponse.json(
        {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: user.id,
          invoiceUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${order.id}`,
          error: "Pembayaran gagal dibuat. Pesanan PENDING — silakan retry.",
        },
        { status: 502 }
      );
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "DUITKU",
        providerRef: charge.reference,
        method: paymentMethod || "DUITKU",
        amountIdr: totalIdr,
        status: "PENDING",
      },
    });
    } // end else (non-COD)

    const invoiceUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${order.id}`;
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
    });
  } catch (e: any) {
    console.error("Mobile checkout error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
