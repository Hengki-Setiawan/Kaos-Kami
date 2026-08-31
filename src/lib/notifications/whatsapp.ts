/**
 * TRANSACTIONAL WHATSAPP NOTIFICATION ENGINE (Fonnte API)
 * Features non-blocking try/catch Graceful Fallback Pattern.
 * Even if Fonnte is offline, checkout always succeeds 100%.
 */

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppNotification(
  targetPhone: string,
  message: string
): Promise<SendWhatsAppResult> {
  const token = process.env.FONNTE_TOKEN;

  // Format phone to 08... or 628...
  const cleanPhone = targetPhone.replace(/[^0-9]/g, "");

  if (!token) {
    console.log(`[Fonnte Mock Log] To: ${cleanPhone}\n${message}`);
    return { success: true, messageId: `mock-wa-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: cleanPhone,
        message,
        countryCode: "62",
      }),
    });

    const data = await res.json();
    return {
      success: !!data.status,
      messageId: data.id?.[0],
      error: data.reason,
    };
  } catch (err: any) {
    console.warn("WhatsApp Fonnte failed (Graceful fallback activated):", err?.message);
    return {
      success: false,
      error: err?.message,
    };
  }
}

export function buildOrderConfirmedMessage(order: {
  orderNumber: string;
  recipientName: string;
  totalIdr: number;
  deliveryMethod: string;
  itemSummary: string;
  invoiceUrl: string;
}) {
  return [
    `*KAOS KAMI MAKASSAR — PESANAN DIKONFIRMASI* ✅`,
    `Halo *${order.recipientName}*, terima kasih telah memesan sablon DTF di Kaos Kami!`,
    ``,
    `📋 *No. Pesanan:* ${order.orderNumber}`,
    `👕 *Item:* ${order.itemSummary}`,
    `🚚 *Pengiriman:* ${order.deliveryMethod}`,
    `💰 *Total Pembayaran:* Rp ${order.totalIdr.toLocaleString("id-ID")}`,
    ``,
    `Pesanan Anda sekarang masuk ke antrean workshop produksi sablon DTF kami. Kami akan mengabari Anda begitu kaos selesai dicetak dan siap diambil/dikirim.`,
    ``,
    `🔗 *Cek Status & Invoice Digital:*`,
    `${order.invoiceUrl}`,
  ].join("\n");
}

export function buildProductionStatusMessage(order: {
  orderNumber: string;
  recipientName: string;
  stageName: string;
  note?: string;
  invoiceUrl: string;
}) {
  return [
    `*UPDATE PRODUKSI KAOS KAMI* ⚙️`,
    `Halo *${order.recipientName}*, pesanan Anda *${order.orderNumber}* saat ini berada di tahap:`,
    `👉 *${order.stageName}*`,
    order.note ? `Catatan operator: _${order.note}_` : "",
    ``,
    `Pantau progres langsung di invoice web Anda:`,
    `${order.invoiceUrl}`,
  ].filter(Boolean).join("\n");
}
