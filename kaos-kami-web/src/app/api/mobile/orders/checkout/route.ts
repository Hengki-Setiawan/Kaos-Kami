import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import { Address, ApparelCategory, Design, Order, OrderItem, OrderStatusEvent, Payment, User, Verification } from "@/lib/drizzle-schema";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { PRODUCT_COLORS, APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import { duitkuProvider } from "@/lib/payments/duitku";
import { hashOtp } from "@/lib/otp";
import { sendWhatsAppNotification, buildOrderConfirmedMessage } from "@/lib/notifications/whatsapp";
import { MAKASSAR_DELIVERY_OPTIONS, MAKASSAR_SUBDISTRICTS } from "@/lib/shipping/deliveryOptions";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { DecalLayerSchema, ApparelSlugSchema, CheckoutMasterMapSchema } from "@/lib/schemas/design";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { uploadBase64ToR2 } from "@/lib/r2";

/**
 * Arsip mobile: hosting-kan decal base64 ke R2 server-side (paritas web).
 * Best-effort — gagal → simpan apa adanya, checkout tetap sukses.
 */
async function archiveDecalsToR2(decals: any[], tag: string): Promise<any[]> {
  try {
    return await Promise.all(
      (decals || []).map(async (d: any, idx: number) => {
        if (typeof d?.url === "string" && d.url.startsWith("data:image")) {
          try {
            const up = await uploadBase64ToR2(
              d.url,
              `decals/m-checkout-${tag}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`
            );
            if (up.success && up.url) return { ...d, url: up.url, r2Key: up.key };
          } catch {}
        }
        return d;
      })
    );
  } catch {
    return decals;
  }
}

const MobileItemSchema = z.object({
  // K-B: alias legacy "jacket"→"shirt" dinormalisasi preprocess (APK lama tetap jalan).
  apparelSlug: ApparelSlugSchema,
  fabricThicknessSlug: z
    .enum(["combed-30s", "combed-24s", "combed-20s", "combed-16s", "french-terry-380"])
    .optional(),
  // K-F: finish visual → server turunkan kain fail-closed.
  // Kompat: legacy `isAcidWash` (nonaktif Sep 2026) SENGAJA tak dideklarasi —
  // Zod strip unknown key → APK lama tetap lolos, tanpa surcharge.
  materialFinishSlug: z.string().max(40).optional(),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3,6})$/),
  colorName: z.string().min(1).max(40),
  size: z.string().min(1).max(10),
  quantity: z.number().int().positive().max(500),
  decals: z.array(DecalLayerSchema).max(10).default([]),
  title: z.string().max(80).optional(),
  // K2: master produksi mobile (opsional, map side→https + decal:<id>→https).
  // APK lama tanpa field ini tetap lolos (opsional); bila ada wajib https.
  masterAssetUrl: CheckoutMasterMapSchema,
});

const MAX_MOBILE_CHECKOUT_RAW_BYTES = 2 * 1024 * 1024;

const MobileCheckoutSchema = z.object({
  recipientName: z.string().min(2).max(100),
  phoneNumber: z
    .string()
    .min(10)
    .max(16)
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Nomor WhatsApp tidak valid (contoh: 081234567890)"),
  email: z.string().email().optional().or(z.literal("")),
  deliveryMethod: z.enum(["PICKUP", "FREE_MAKASSAR", "EXPEDITION_MANUAL"]),
  district: z.string().max(80).optional(),
  destinationCity: z.string().max(80).optional(),
  expeditionZoneId: z.string().max(64).optional(),
  destinationPostalCode: z.string().regex(/^\d{5}$/).optional(),
  expeditionCourier: z.string().max(32).optional(),
  expeditionService: z.string().max(64).optional(),
  fullAddress: z.string().min(5).max(500),
  courierNotes: z.string().max(500).optional(),
  // QRIS ONLY (keputusan owner Sep 2026: sablon lunas-dulu, fee 0,7%).
  // Nilai lain DITOLAK 400 (bukan collapse diam-diam).
  paymentMethod: z.enum(["QRIS", "SP"]).optional(),
  couponCode: z.string().max(32).optional(),
  // P0-3/P0-4 paritas web: bukti OTP WA + token anti-bot (keduanya opsional di
  // skema, tapi gerbang server mewajibkan OTP; Turnstile wajib bila secret ada).
  otpCode: z.string().max(32).optional(),
  turnstileToken: z.string().max(2048).optional(),
  items: z.array(MobileItemSchema).min(1).max(20),
});

/**
 * M10.2 — POST /api/mobile/orders/checkout
 * Checkout ringkas untuk aplikasi Capacitor: validasi Zod + re-hitung server-side
 * (jangan percaya total dari HP) + Duitku fail-closed seperti web checkout.
 */
export async function POST(req: NextRequest) {
  let idemKey: string | null = null;
  let idemSealed = false;
  const releaseIdemClaim = async () => {
    if (idemKey && !idemSealed) {
      const idemId: string = idemKey;
      await db.delete(Verification).where(eq(Verification.identifier, idemId)).catch(() => {});
    }
  };
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`m-checkout:ip:${ip}`, 5, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak transaksi. Tunggu ${rl.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(rl, 5) }
      );
    }

    // P0-2 IDEMPOTENCY TANPA MIGRASI (paritas web checkout): dedupe via header
    // Idempotency-Key di atas tabel Verification yang SUDAH ADA (identifier
    // `idem:checkout:<key>` → value orderId, expiry 24 jam). TANPA kolom/tabel
    // baru: JANGAN edit prisma/schema.prisma, JANGAN db push/migrate.
    // Batasan jujur: identifier HANYA index (non-unique) → best-effort untuk
    // retry/double-tap sequential, BUKAN lock konkuren ketat. Prosedur
    // guarantee (@unique + tangkap P2002) didokumentasikan di route web —
    // (JANGAN dieksekusi tanpa perintah eksplisit owner.)
    const rawIdemKey = (req.headers.get("idempotency-key") || "").trim();
    if (/^[A-Za-z0-9\-_.:]{8,128}$/.test(rawIdemKey)) {
      idemKey = `idem:checkout:${rawIdemKey}`;
      const replayId: string = idemKey;
      const prior = await db.query.Verification.findFirst({
        where: (t, { eq }) => eq(t.identifier, replayId),
        orderBy: (t, { desc }) => desc(t.createdAt),
      });
      if (prior && new Date() <= prior.expiresAt) {
        if (prior.value.startsWith("claim:")) {
          return NextResponse.json(
            { error: "Permintaan checkout sama sedang diproses. Tunggu sebentar lalu coba lagi." },
            { status: 409 }
          );
        }
        const priorOrder = await db.query.Order.findFirst({
          where: (t, { eq }) => eq(t.id, prior.value),
        });
        return NextResponse.json(
          {
            error: "Checkout ini sudah diproses (Idempotency-Key sama) — tidak dibuat order ganda.",
            orderId: prior.value,
            orderNumber: priorOrder?.orderNumber,
            invoiceUrl: `${siteUrl()}/orders/${prior.value}`,
          },
          { status: 409 }
        );
      }
      if (prior) {
        await db.delete(Verification).where(eq(Verification.identifier, replayId)).catch(() => {});
      }
    }

    // Fail-closed: tolak 503 sebelum tulis order bila secret Duitku kosong
    // (paritas web checkout).
    try {
      duitkuProvider.assertDuitkuConfigured();
    } catch {
      return NextResponse.json(
        { error: "Pembayaran belum dikonfigurasi. Coba lagi nanti / hubungi admin." },
        { status: 503 }
      );
    }

    const rawBody = await req.text();
    // Cap body mentah dulu (paritas web: anti OOM sebelum Zod).
    if (rawBody.length > MAX_MOBILE_CHECKOUT_RAW_BYTES) {
      return NextResponse.json({ error: "Payload terlalu besar (maks 2MB)" }, { status: 413 });
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
    }
    const validation = MobileCheckoutSchema.safeParse(parsedBody);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    const { recipientName, phoneNumber, email, deliveryMethod, district, destinationCity, expeditionZoneId, destinationPostalCode, expeditionCourier, expeditionService, fullAddress, courierNotes, couponCode, items, turnstileToken } =
      validation.data;

    // P0-3 GUARD FREE_MAKASSAR (paritas web): kecamatan wajib & whitelist kota.
    if (deliveryMethod === "FREE_MAKASSAR") {
      const pickedDistrict = (district || "").trim();
      if (!pickedDistrict) {
        return NextResponse.json(
          { error: "Kecamatan wajib diisi untuk pengiriman antar gratis Makassar" },
          { status: 400 }
        );
      }
      if (!MAKASSAR_SUBDISTRICTS.includes(pickedDistrict)) {
        return NextResponse.json(
          {
            error: `Kecamatan "${pickedDistrict}" di luar jangkauan antar gratis. Pilih kecamatan se-Kota Makassar atau metode pengiriman lain.`,
          },
          { status: 400 }
        );
      }
    }

    // M1 mobile (Sep 2026): verifikasi Turnstile DITUNDA hingga setelah
    // gerbang OTP di bawah — APK (CheckoutSheet) tak kirim turnstileToken.
    // Bila OTP LOLOS (nomor WA terverifikasi via Fonnte = proof-of-human
    // yang lebih kuat dari Turnstile + user sudah bayar biaya OTP), Turnstile
    // DILEWATI (hemat, risiko spam rendah: tiap checkout butuh nomor WA
    // valid + kode 6-digit satu-pakai + owner-match).
    // Bila OTP DIBYPASS via CHECKOUT_OTP_REQUIRED=false (darurat Fonnte),
    // Turnstile TETAP wajib (fail-closed, lihat blok pasca-OTP).
    // Route WEB tak diubah (milik agen lain).

    // Paritas web checkout: tolak apparel belum bisa dipesan
    // (cap/pants/shorts) dengan 400 JUJUR — SEBELUM hitung harga / tulis order.
    for (const item of items) {
      const opt = APPAREL_CATALOG[(item as any).apparelSlug as ApparelType];
      if (!opt?.orderable) {
        const reason = !opt
          ? `Apparel "${(item as any).apparelSlug}" tidak dikenal.`
          : !opt.mockupEnabled
            ? `${opt.name} belum tersedia — mockup 3D maupun pemesanan SEGERA hadir.`
            : `${opt.name} belum bisa dipesan — mockup 3D-nya bisa dicoba di studio, tapi pemesanan SEGERA dibuka.`;
        return NextResponse.json(
          { error: `${reason} Keluarkan item ini lalu checkout ulang.` },
          { status: 400 }
        );
      }
    }

    let subtotalIdr = 0;
    const validatedItems: any[] = [];
    for (const item of items) {
      const matchedColor = PRODUCT_COLORS.find(
        (c) => c.hex.toLowerCase() === item.colorHex.toLowerCase()
      );
      // Acid-wash NONAKTIF Sep 2026: legacy `isAcidWash` / finish
      // "acid-wash" diabaikan (tanpa surcharge, tanpa 400).
      const finishPricing = materialFinishToPricing(item.materialFinishSlug);
      const pricing = calculate6VariablePrice({
        apparelSlug: item.apparelSlug,
        fabricThicknessSlug: item.fabricThicknessSlug ?? finishPricing.fabricThicknessSlug,
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
        // P0-3 STRICT (paritas web): pilihan kurir/layanan eksplisit WAJIB ada
        // di live rates — JANGAN silent-fallback termurah.
        const wantCourier = (expeditionCourier || "").trim();
        const wantService = (expeditionService || "").trim();
        const wantSpecific = !!(wantCourier || wantService);
        try {
          const { awRatesCached } = await import("@/lib/shipping/agenwebsite");
          const live = await awRatesCached(destinationPostalCode, weightGrams);
          if (live && live.length > 0) {
            const pick = wantSpecific
              ? live.find(
                  (r) =>
                    (!wantCourier || r.courierCode === wantCourier) &&
                    (!wantService || r.serviceCode === wantService)
                )
              : live.find((r) => r.cheapest) || live[0]!;
            if (!pick) {
              return NextResponse.json(
                {
                  error: `Kurir/layanan yang dipilih (${[wantCourier, wantService].filter(Boolean).join(" ")}) tidak tersedia untuk kode pos ${destinationPostalCode}. Pilih dari daftar tarif live terbaru lalu checkout ulang.`,
                },
                { status: 400 }
              );
            }
            shippingIdr = pick.costIdr;
            expeditionLabel = `${pick.courierName} ${pick.serviceName} (live, est. ${pick.etdText})`;
            liveResolved = true;
          } else if (wantSpecific) {
            return NextResponse.json(
              {
                error: `Tarif live tidak tersedia untuk kode pos ${destinationPostalCode}. Coba lagi / pilih kurir lain.`,
              },
              { status: 400 }
            );
          }
        } catch (e: any) {
          if (wantSpecific) {
            console.warn("Mobile live ongkir gagal (pilihan eksplisit, tolak 400):", e?.message);
            return NextResponse.json(
              { error: "Tarif live kurir pilihan sedang gangguan. Coba lagi sebentar / pilih kurir lain." },
              { status: 400 }
            );
          }
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
    // B3: validasi kupon READ-ONLY + hitung total SEBELUM gerbang OTP (paritas
    // web) — OTP satu-pakai tak hangus bila kupon invalid / total di luar
    // batas. Reservasi kuota (consumeCoupon, tulis) tetap SESUDAH klaim.
    let discountIdr = 0;
    let appliedCoupon: string | null = null;
    if (couponCode?.trim()) {
      try {
        const { validateCoupon } = await import("@/lib/coupons");
        const c = await validateCoupon(couponCode, subtotalIdr);
        discountIdr = c.discountIdr;
        appliedCoupon = c.code;
      } catch (couponErr: any) {
        return NextResponse.json({ error: couponErr?.message || "Kupon tidak valid" }, { status: 400 });
      }
    }
    const totalIdr = subtotalIdr - discountIdr + shippingIdr;
    // Paritas web: batas wajar transaksi tunggal (audit).
    if (!Number.isSafeInteger(totalIdr) || totalIdr < 10000 || totalIdr > 500_000_000) {
      return NextResponse.json({ error: "Total transaksi di luar batas wajar" }, { status: 400 });
    }
    // Kill-switch darurat CHECKOUT_OTP_REQUIRED="false" → lewati gerbang OTP
    // (dipakai saat Fonnte mati). RISIKO: bypass OTP = order fiktif mungkin
    // (nomor WA tak terverifikasi) — aktifkan hanya sementara saat darurat.
    // P0-3 GERBANG OTP (paritas web/repay): SETELAH semua 400 validasi murah,
    // SEBELUM tulis apa pun. Kode 6 digit dari /api/auth/send-otp → hashOtp +
    // expiry + owner-match (nomor bukti == nomor pemesan) + satu-pakai.
    // INTEGRASI WAJIB: APK harus kirim otpCode — tanpa itu checkout 401.
    // M1: flag bukti-human OTP — true hanya bila kode 6-digit terverifikasi
    // (hash + expiry + owner-match) di bawah. Dipakai gerbang Turnstile
    // pasca-OTP: OTP lolos → Turnstile dilewati; OTP dibypass darurat →
    // Turnstile tetap wajib.
    let mobileOtpVerified = false;
    if (process.env.CHECKOUT_OTP_REQUIRED === "false") {
      console.warn("[m-checkout] CHECKOUT_OTP_REQUIRED=false — gerbang OTP DILEWATI (mode darurat)");
    } else {
    const otpRaw =
      (parsedBody as any)?.otpCode ??
      (parsedBody as any)?.code ??
      (parsedBody as any)?.otp ??
      (parsedBody as any)?.otpToken ??
      (parsedBody as any)?.proof;
    const otpParsed = z
      .object({
        phoneNumber: z.string().min(9).max(20),
        otp: z.string().regex(/^\d{6}$/),
      })
      .safeParse({
        phoneNumber: (parsedBody as any)?.phoneNumber,
        otp: typeof otpRaw === "string" ? otpRaw : "",
      });
    if (!otpParsed.success) {
      return NextResponse.json(
        {
          error:
            "Verifikasi OTP WA diperlukan. Minta kode via /api/auth/send-otp lalu kirim ulang dengan phoneNumber + otpCode milik nomor pemesan.",
        },
        { status: 401 }
      );
    }
    const cleanProofPhone = otpParsed.data.phoneNumber.replace(/[^0-9]/g, "");
    const cleanOrderPhone = phoneNumber.replace(/[^0-9]/g, "");
    const otpRecord = await db.query.Verification.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.identifier, `otp:${cleanProofPhone}`), eq(t.value, hashOtp(otpParsed.data.otp))),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa" }, { status: 401 });
    }
    if (!cleanOrderPhone || cleanProofPhone !== cleanOrderPhone) {
      return NextResponse.json({ error: "OTP bukan milik nomor pemesan ini" }, { status: 403 });
    }
    await db.delete(Verification).where(eq(Verification.identifier, `otp:${cleanProofPhone}`)).catch(() => {});
    mobileOtpVerified = true;
    } // end CHECKOUT_OTP_REQUIRED kill-switch (default wajib)

    // M1 mobile (Sep 2026): gerbang Turnstile PASCA-OTP (route MOBILE saja,
    // route web tak diubah). OTP LOLOS = nomor WA terverifikasi via Fonnte
    // (hash + expiry + owner-match + satu-pakai) = proof-of-human lebih kuat
    // dari Turnstile → LEWATI verifikasi Turnstile (hemat: user mobile sudah
    // bayar biaya OTP; risiko spam rendah karena tiap checkout butuh nomor WA
    // valid). OTP DIBYPASS darurat (CHECKOUT_OTP_REQUIRED=false) → Turnstile
    // TETAP wajib fail-closed seperti semula (prod tanpa secret = 503;
    // dev tanpa secret = lewati + warn; secret ada = token wajib lolos).
    if (mobileOtpVerified) {
      console.debug("[m-checkout] OTP lolos — verifikasi Turnstile DILEWATI (proof-of-human via Fonnte)");
    } else if (process.env.TURNSTILE_ENFORCE === "false") {
      console.warn("[m-checkout] TURNSTILE_ENFORCE=false — verifikasi anti-bot DILEWATI (mode darurat)");
    } else if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Verifikasi anti-bot belum dikonfigurasi. Coba lagi nanti / hubungi admin." },
          { status: 503 }
        );
      }
      console.warn("[m-checkout] CLOUDFLARE_TURNSTILE_SECRET_KEY kosong (dev) — verifikasi anti-bot dilewati");
    } else {
      const ts = await verifyTurnstileToken(turnstileToken || "", ip);
      if (!ts.success) {
        return NextResponse.json(
          { error: "Verifikasi anti-bot gagal. Muat ulang dan coba lagi." },
          { status: 403 }
        );
      }
    }

    // P0-2 KLAIM (paritas web): SEBELUM reservasi kuota kupon / tulis order.
    if (idemKey) {
      const claimId: string = idemKey;
      await db.delete(Verification).where(eq(Verification.identifier, claimId)).catch(() => {});
      await db
        .insert(Verification)
        .values({
          id: nanoid(),
          identifier: claimId,
          value: `claim:${ip}:${Date.now()}`,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        })
        .catch(() => {});
    }

    // Kupon: reservasi kuota atomik SESUDAH klaim (B3, paritas web — validasi
    // READ-ONLY + hitung total sudah SEBELUM gerbang OTP di atas).
    if (appliedCoupon) {
      try {
        const { consumeCoupon } = await import("@/lib/coupons");
        const reserved = await consumeCoupon(appliedCoupon);
        if (!reserved) {
          await releaseIdemClaim();
          return NextResponse.json({ error: "Kuota kupon habis" }, { status: 400 });
        }
      } catch (couponErr: any) {
        await releaseIdemClaim();
        return NextResponse.json({ error: couponErr?.message || "Kupon tidak valid" }, { status: 400 });
      }
    }
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
            // Marker kupon untuk restore kuota saat batal/refund
            // (dibaca getOrderCouponCode — JANGAN hapus/pakai untuk teks bebas).
            notes: appliedCoupon ? `COUPON:${appliedCoupon}` : null,
            courierNotes: [courierNotes, expeditionLabel]
              .filter(Boolean)
              .join(" | ")
              .replace(/\[TIER:[^\]]*\]/g, "")
              .trim() || undefined,
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
    // P0-2 SEAL (paritas web): klaim → orderId konkret (replay = 409 + orderId).
    if (idemKey) {
      const sealId: string = idemKey;
      await db
        .update(Verification)
        .set({ value: orderRow.id, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) })
        .where(eq(Verification.identifier, sealId))
        .catch(() => {});
      idemSealed = true;
    }
    // Kompensasi order yatim (lihat checkout web untuk alasan).
    // P0-2: perluas ke Design arsip + Address (fresh-id request ini).
    const createdDesignIds: string[] = [];
    try {
      const insertedItems = await db.insert(OrderItem).values(
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
      ).returning({ id: OrderItem.id });
      // Arsip desain kustom (sama seperti checkout web — produksi butuh decals).
      const rowIds = (insertedItems as any[]).map((r: any) => r.id);
      await Promise.all(
        validatedItems.map(async (item, idx) => {
          if (!Array.isArray(item.decals) || item.decals.length === 0) return;
          try {
            const cat = await db.query.ApparelCategory.findFirst({
              where: (t, { eq }) => eq(t.slug, item.apparelSlug),
              columns: { id: true },
            });
            if (!cat) return;
            // Hosting-kan decal base64 ke R2 dulu (jangan TEXT mentah ke DB).
            const decalsForArchive = await archiveDecalsToR2(item.decals, orderRow.orderNumber);
            const [design] = await db
              .insert(Design)
              .values({
                id: nanoid(),
                userId: user.id,
                categoryId: cat.id,
                title: item.title || `Custom ${item.apparelSlug.toUpperCase()} ${orderRow.orderNumber}`,
                colorHex: item.colorHex,
                colorName: item.colorName,
                size: item.size,
                decals: JSON.stringify(decalsForArchive),
                calculatedPriceIdr: item.lineTotalIdr,
                priceBreakdown: JSON.stringify(item.pricingSnapshot || {}),
                // K2: arsip master mobile bila dikirim (map side/decal:<id>→https).
                masterAssetUrl:
                  item.masterAssetUrl && typeof item.masterAssetUrl === "object"
                    ? JSON.stringify(item.masterAssetUrl)
                    : null,
                status: "ORDERED",
              })
              .returning({ id: Design.id });
            if (design && rowIds[idx]) {
              createdDesignIds.push((design as any).id);
              await db.update(OrderItem).set({ designId: (design as any).id }).where(eq(OrderItem.id, rowIds[idx]));
            }
          } catch (e: any) {
            console.warn("Arsip desain mobile gagal:", orderRow.id, e?.message);
          }
        })
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
        // P0-2: arsip Design yatim + Address pengiriman (fresh-id request ini).
        if (createdDesignIds.length > 0) {
          await db.delete(Design).where(inArray(Design.id, createdDesignIds)).catch(() => {});
        }
        if (address?.id) {
          await db.delete(Address).where(eq(Address.id, address.id)).catch(() => {});
        }
        await db.delete(Order).where(eq(Order.id, orderRow.id));
        // B2: order sudah dihapus → seal idempotency WAJIB dilepas juga
        // (paritas web). Tanpa ini klaim `idem:checkout:<key>` tetap menunjuk
        // orderId yatim (idemSealed=true menahan releaseIdemClaim di catch) →
        // retry key sama 409 selamanya ke order yang tak ada.
        if (idemKey) {
          const sealId: string = idemKey;
          await db.delete(Verification).where(eq(Verification.identifier, sealId)).catch(() => {});
          idemSealed = false;
        }
      } catch (compErr: any) {
        console.error("Kompensasi order yatim gagal:", orderRow.id, compErr?.message);
      }
      // Kupon yatim (mobile): kembalikan kuota best-effort, jangan gagalkan kompensasi.
      try {
        if (appliedCoupon) {
          const { restoreCoupon } = await import("@/lib/coupons");
          await restoreCoupon(appliedCoupon).catch(() => false);
        }
      } catch (e: any) {
        console.warn("Restore kupon kompensasi mobile gagal:", orderRow.id, e?.message);
      }
      throw itemsErr;
    }
    const order = {
      ...orderRow,
      items: validatedItems,
    };

    // P0-1 (paritas web): Payment PENDING dengan ref sementara SEBELUM Duitku.
    // Webhook kompatibel (lookup via orderNumber, timpa providerRef dari
    // callback). Charge gagal → baris PENDING tertinggal untuk repay.
    const pendingRef = `pending-${order.id}`;
    await db.insert(Payment).values({
      id: nanoid(),
      orderId: order.id,
      provider: "DUITKU",
      providerRef: pendingRef,
      method: "QRIS",
      amountIdr: totalIdr,
      status: "PENDING",
    });

    let charge;
    try {
      // QRIS ONLY (Duitku kode SP). Tanpa cabang COD — sablon lunas-dulu.
      const duitkuMethod = "SP";
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
      // M2 tersambung 13 Sep: returnUrl charge = deep-link APK (ditangani
      // appUrlOpen + parseDuitkuReturnUrl di mobile page.tsx). Fallback tetap
      // ada: paymentUrl di Browser + polling status bila return tak terpicu.
      charge = await duitkuProvider.createCharge({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountIdr: totalIdr,
        paymentMethod: duitkuMethod,
        customer: { name: recipientName, phone: cleanPhone, email: email || `${cleanPhone}@kaoskami.customer` },
        itemDetails: duitkuItems,
        returnUrlOverride: `kaoskami://payment/callback?orderId=${order.id}`,
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

    // P0-1: selesaikan baris PENDING — timpa ref sementara dengan reference asli.
    await db
      .update(Payment)
      .set({ providerRef: charge.reference })
      .where(eq(Payment.orderId, order.id));

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
    // Klaim idempotency yang belum di-seal dilepas best-effort (paritas web).
    await releaseIdemClaim();
    const status = e?.status === 400 ? 400 : 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
