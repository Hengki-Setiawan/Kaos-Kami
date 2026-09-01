import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculate6VariablePrice } from "@/lib/pricingEngine";
import { duitkuProvider } from "@/lib/payments/duitku";
import { sendWhatsAppNotification, buildOrderConfirmedMessage } from "@/lib/notifications/whatsapp";
import { MAKASSAR_DELIVERY_OPTIONS, PRODUCTION_TURNAROUND_OPTIONS } from "@/lib/shipping/deliveryOptions";
import { z } from "zod";
import { DecalLayerSchema } from "@/lib/schemas/design";

const CheckoutItemSchema = z.object({
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"]),
  fabricThicknessSlug: z.enum(["combed-30s", "combed-24s", "combed-20s", "combed-16s", "french-terry-380"]).optional(),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3,6})$/, "HEX invalid"),
  colorName: z.string().min(1),
  size: z.string().min(1),
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
});

export async function POST(req: NextRequest) {
  try {
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
    } = validation.data;

    // 1. Re-calculate entire price server-side (Never trust client prices)
    let computedSubtotalIdr = 0;
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

    const computedTotalIdr = computedSubtotalIdr + shippingCostIdr + turnaroundSurchargeIdr;

    // 3. Find or create user for this WhatsApp number
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: cleanPhone }, { email: email || `${cleanPhone}@kaoskami.customer` }],
      },
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

    // 4. Save Address
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

    // 5. Generate Human-Readable Order Number (KK-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `KK-${dateStr}-${randomSuffix}`;

    // 6. Create Order & Items in DB Transaction
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: "PENDING_PAYMENT",
        deliveryMethod,
        subtotalIdr: computedSubtotalIdr,
        shippingCostIdr,
        discountIdr: 0,
        totalIdr: computedTotalIdr,
        shippingAddressId: address.id,
        courierNotes: courierNotes || (turnaroundTier === "EXPRESS_24H" ? "EXPRESS 24H" : ""),
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
        statusHistory: {
          create: {
            status: "PENDING_PAYMENT",
            note: `Pesanan dibuat oleh pelanggan (${recipientName}).`,
          },
        },
      },
      include: { items: true },
    });

    // 7. Request Duitku Payment Token & Reference
    const chargeResult = await duitkuProvider.createCharge({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountIdr: computedTotalIdr,
      customer: {
        name: recipientName,
        phone: cleanPhone,
        email: email || `${cleanPhone}@kaoskami.customer`,
      },
      itemDetails: [
        ...validatedItems.map((it) => ({
          name: it.title || `${it.apparelSlug.toUpperCase()} Sablon`,
          price: it.unitPriceIdr,
          quantity: it.quantity,
        })),
      ],
    });

    // 8. Create Payment Record in Database
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "duitku",
        providerRef: chargeResult.reference,
        amountIdr: computedTotalIdr,
        status: "PENDING",
      },
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
    });
  } catch (error: any) {
    console.error("Checkout process error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error during checkout" }, { status: 500 });
  }
}
