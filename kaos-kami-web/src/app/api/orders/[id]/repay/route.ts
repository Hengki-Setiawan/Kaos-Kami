import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Payment, Verification } from "@/lib/drizzle-schema";
import { hashOtp } from "@/lib/otp";
import { duitkuProvider } from "@/lib/payments/duitku";
import { confirmOrderPaid } from "@/lib/payments/confirmOrder";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

/**
 * POST /api/orders/:id/repay — Buat link bayar BARU untuk order PENDING.
 * Pengaman anti tagih-ganda:
 * 1. Tolak jika order sudah lunas (payment SETTLEMENT ada).
 * 2. WAJIB bukti kepemilikan via OTP WA (mekanisme yang sama dengan
 *    /api/auth/verify-otp & /api/track/orders): client kirim nomor pemilik +
 *    kode 6 digit yang masih berlaku. Tanpa itu → 401. Tamu tanpa akun pun
 *    bisa bayar ulang asal pegang nomor WA pemilik order.
 * 3. Link lama yang masih berlaku TIDAK diputar buta (lihat cek "01").
 * 4. Payment PENDING lama ditandai EXPIRED sebelum bikin baru.
 * 5. Webhook idempoten: callback pertama yang menang (sudah ada).
 * 6. Rate-limit ketat: spam inquiry = spam dashboard merchant.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`repay:ip:${ip}`, 3, 300);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 3) });
    }
    const orl = await checkRateLimitAsync(`repay:order:${orderId}`, 3, 3600);
    if (orl.isLimited) {
      return NextResponse.json(
        { error: "Link baru sudah dibuat 3x. Hubungi admin via WA." },
        { status: 429, headers: rateLimitHeaders(orl, 3) }
      );
    }

    const order = await db.query.Order.findFirst({
      where: (t, { eq }) => eq(t.id, orderId),
      with: { items: true, payment: true, user: true },
    });
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: `Order sudah ${order.status}, tidak perlu bayar ulang` }, { status: 400 });
    }
    if (order.payment?.status === "SETTLEMENT") {
      return NextResponse.json({ error: "Order ini sudah lunas" }, { status: 400 });
    }

    // Gerbang bukti kepemilikan via OTP WA — SEBELUM sentuh Duitku / bikin
    // charge. Mekanisme SAMA seperti verify-otp & track/orders (tabel
    // Verification, hashOtp, kedaluarsa 5 menit, satu-pakai). Body:
    // { phoneNumber: "0812...", otpCode: "123456" } (alias code/otp/
    // otpToken/proof diterima untuk nilai kodenya).
    const body = await req.json().catch(() => null);
    const proofRaw =
      body?.otpCode ?? body?.code ?? body?.otp ?? body?.otpToken ?? body?.proof;
    const proofParsed = z
      .object({
        phoneNumber: z.string().min(9).max(20),
        otp: z.string().regex(/^\d{6}$/),
      })
      .safeParse({
        phoneNumber: body?.phoneNumber,
        otp: typeof proofRaw === "string" ? proofRaw : "",
      });
    if (!proofParsed.success) {
      return NextResponse.json(
        {
          error:
            "Verifikasi OTP WA diperlukan. Minta kode via /api/auth/send-otp lalu kirim ulang dengan phoneNumber + otpCode milik pemilik order.",
        },
        { status: 401 }
      );
    }
    const cleanProofPhone = proofParsed.data.phoneNumber.replace(/[^0-9]/g, "");
    const otpRecord = await db.query.Verification.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.identifier, `otp:${cleanProofPhone}`), eq(t.value, hashOtp(proofParsed.data.otp))),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    // Satu pesan untuk salah & kadaluarsa (anti-oracle, sama seperti verify-otp).
    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa" }, { status: 401 });
    }
    // OTP valid HARUS milik nomor pemilik order (anti pakai OTP nomor lain).
    // Dicek SEBELUM hanguskan OTP — percobaan nomor lain tak boleh
    // menghanguskan OTP yang sah.
    const ownerPhone = (order.user?.phoneNumber || "").replace(/[^0-9]/g, "");
    if (!ownerPhone || ownerPhone !== cleanProofPhone) {
      return NextResponse.json({ error: "OTP bukan milik pemilik order ini" }, { status: 403 });
    }
    // Satu-pakai: hanguskan seperti verify-otp / track/orders (hanya setelah
    // owner terbukti cocok).
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${cleanProofPhone}`)).catch(() => {});

    // Tanya Duitku langsung: kalau ternyata SUDAH lunas (webhook telat/hilang),
    // sahkan di sini, JANGAN bikin tagihan baru (anti tagih ganda).
    // Kalau tagihan lama MASIH PROSES ("01"), link lama masih berlaku —
    // kembalikan referensi lama, JANGAN rotasi buta (setiap inquiry baru =
    // spam dashboard merchant). paymentUrl lama tak disimpan di DB, jadi
    // client memakai link yang sudah diterima via WA/riwayat browser.
    // Gagal tanya (jaringan) → lanjut hati-hati seperti biasa.
    try {
      const remote = await duitkuProvider.checkTransactionStatus(order.orderNumber);
      if (remote.statusCode === "00") {
        // Nominal remote WAJIB sama dengan total order (paritas webhook:
        // tolak underpayment / sukses-tanpa-nominal). Mismatch → JANGAN
        // auto-confirm, lanjut bikin charge baru di bawah.
        const remoteAmount = remote.amount !== undefined && remote.amount !== null && String(remote.amount) !== ""
          ? Number(remote.amount)
          : NaN;
        if (!Number.isFinite(remoteAmount) || remoteAmount !== order.totalIdr) {
          console.warn("Repay: nominal remote mismatch, skip auto-confirm", {
            orderNumber: order.orderNumber,
            remoteAmount: remote.amount,
            total: order.totalIdr,
          });
        } else {
          await db
            .update(Payment)
            .set({ status: "SETTLEMENT", paidAt: new Date() })
            .where(eq(Payment.orderId, order.id));
          await confirmOrderPaid(order.id, {
            paymentCode: order.payment?.method || "DUITKU",
            reference: remote.reference || order.payment?.providerRef,
            via: "repay-check",
          });
          return NextResponse.json({ success: true, alreadyPaid: true });
        }
      }
      if (remote.statusCode === "01") {
        return NextResponse.json(
          {
            error:
              "Link bayar sebelumnya masih berlaku. Gunakan link yang sudah dikirim (cek WA / riwayat browser). Minta link baru hanya bila link lama kedaluarsa.",
            reused: true,
            reference: remote.reference || order.payment?.providerRef,
          },
          { status: 409 }
        );
      }
    } catch (e: any) {
      console.warn("Repay status-check gagal, lanjut bikin charge baru:", e?.message);
    }

    // Update-in-place (B1-2): Payment.orderId UNIQUE → JANGAN insert baris
    // kedua. Timpa ref lama dengan yang baru; link lama ikut mati saat
    // expiry Duitku. Akses dijaga gerbang OTP WA di atas + rate-limit ketat
    // (tamu pemegang nomor WA pemilik tetap bisa bayar ulang).
    // Susun ulang rincian agar balance dengan total (syarat Duitku).
    const itemLines = order.items.map((it) => ({
      name: it.snapshotName.slice(0, 60),
      price: it.unitPriceIdr,
      quantity: it.quantity,
    }));
    if (order.shippingCostIdr > 0) {
      itemLines.push({ name: "Ongkos kirim", price: order.shippingCostIdr, quantity: 1 });
    }
    if (order.discountIdr > 0) {
      itemLines.push({ name: "Diskon kupon", price: -order.discountIdr, quantity: 1 });
    }

    let charge;
    try {
      charge = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: order.totalIdr,
        customer: {
          name: order.user?.name || "Pelanggan",
          phone: order.user?.phoneNumber || "-",
          email: order.user?.email || "customer@kaoskami.biz.id",
        },
        itemDetails: itemLines,
      });
    } catch (chargeErr: any) {
      return NextResponse.json(
        { error: "Gagal buat link baru. Coba lagi / hubungi admin.", detail: chargeErr?.message },
        { status: 502 }
      );
    }

    if (order.payment) {
      await db
        .update(Payment)
        .set({
          providerRef: charge.reference,
          method: "RETRY",
          amountIdr: order.totalIdr,
          status: "PENDING",
          paidAt: null,
          rawWebhookPayload: null,
        })
        .where(eq(Payment.id, order.payment.id));
    } else {
      await db.insert(Payment).values({
        id: nanoid(),
        orderId: order.id,
        provider: "DUITKU",
        providerRef: charge.reference,
        method: "RETRY",
        amountIdr: order.totalIdr,
        status: "PENDING",
      });
    }

    return NextResponse.json({ success: true, paymentUrl: charge.paymentUrl, reference: charge.reference });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
