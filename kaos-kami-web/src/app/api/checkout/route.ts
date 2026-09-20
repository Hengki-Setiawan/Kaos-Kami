import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/siteUrl";
import { Address, ApparelCategory, Design, Order, OrderItem, OrderStatusEvent, Payment, User, Verification } from "@/lib/drizzle-schema";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { APPAREL_CATALOG, PRODUCT_COLORS, type ApparelType } from "@/lib/constants";
import { duitkuProvider } from "@/lib/payments/duitku";
import { hashOtp } from "@/lib/otp";
import { sendWhatsAppNotification, buildOrderConfirmedMessage } from "@/lib/notifications/whatsapp";
import { MAKASSAR_DELIVERY_OPTIONS, MAKASSAR_SUBDISTRICTS, PRODUCTION_TURNAROUND_OPTIONS } from "@/lib/shipping/deliveryOptions";
import { z } from "zod";
import { DecalLayerSchema, ApparelSlugSchema, CheckoutMasterMapSchema } from "@/lib/schemas/design";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { uploadBase64ToR2 } from "@/lib/r2";

/**
 * Arsip checkout: hosting-kan decal base64 ke R2 server-side (paritas
 * POST /api/designs) agar kolom Design.decals tak menyimpan TEXT 500k×10
 * mentah. Best-effort: gagal → simpan apa adanya, checkout tetap sukses.
 */
async function archiveDecalsToR2(decals: any[], tag: string): Promise<any[]> {
  try {
    return await Promise.all(
      (decals || []).map(async (d: any, idx: number) => {
        if (typeof d?.url === "string" && d.url.startsWith("data:image")) {
          try {
            const up = await uploadBase64ToR2(
              d.url,
              `decals/checkout-${tag}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`
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

const CheckoutItemSchema = z.object({
  apparelSlug: ApparelSlugSchema,
  productVariantId: z.string().min(1).max(64).optional(),
  designId: z.string().cuid().optional(),
  fabricThicknessSlug: z.enum(["combed-30s", "combed-24s", "combed-20s", "combed-16s", "french-terry-380"]).optional(),
  // K-F: finish visual studio → server turunkan kain fail-closed
  // (client tak dipercaya meniadakan surcharge).
  // Kompat: legacy `isAcidWash` (nonaktif Sep 2026) SENGAJA tak dideklarasi —
  // Zod strip unknown key → request lama tetap lolos, tanpa surcharge.
  materialFinishSlug: z.string().max(40).optional(),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3,6})$/, "HEX invalid"),
  colorName: z.string().min(1).max(40),
  size: z.string().min(1).max(10),
  quantity: z.number().int().positive().max(500),
  decals: z.array(DecalLayerSchema).max(10).default([]),
  title: z.string().max(80).optional(),
  // K2: master produksi 300 DPI (map side→https + decal:<id>→https).
  // Opsional; hanya URL https yang diterima (base64 ditolak Zod) — client
  // WAJIB upload ke R2 dulu (login: /api/upload/r2 kind=master; guest:
  // POST /api/designs draft). Disimpan ke arsip Design saat checkout.
  masterAssetUrl: CheckoutMasterMapSchema,
});

const MAX_CHECKOUT_RAW_BYTES = 2 * 1024 * 1024;

const CheckoutPayloadSchema = z.object({
  recipientName: z.string().min(2, "Nama penerima wajib diisi").max(100),
  phoneNumber: z
    .string()
    .min(10, "Nomor WhatsApp wajib diisi")
    .max(16)
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Nomor WhatsApp tidak valid (contoh: 081234567890)"),
  email: z.string().email().optional().or(z.literal("")),
  deliveryMethod: z.enum(["PICKUP", "FREE_MAKASSAR", "EXPEDITION_MANUAL"]),
  turnaroundTier: z.enum(["REGULER", "EXPRESS_24H"]).default("REGULER"),
  district: z.string().max(80).optional(),
  // Ekspedisi luar kota: kota tujuan + zona terpilih (harga FINAL di-resolve
  // server via zones.resolveExpeditionCost — client tak dipercaya).
  destinationCity: z.string().max(80).optional(),
  expeditionZoneId: z.string().max(64).optional(),
  // AgenWebsite live: kode pos tujuan + kurir/layanan terpilih dari quote.
  // Harga FINAL tetap di-resolve server (client tak dipercaya).
  destinationPostalCode: z.string().regex(/^\d{5}$/).optional(),
  expeditionCourier: z.string().max(32).optional(),
  expeditionService: z.string().max(64).optional(),
  fullAddress: z.string().min(5, "Alamat lengkap wajib diisi").max(500),
  courierNotes: z.string().max(500).optional(),
  items: z.array(CheckoutItemSchema).min(1, "Minimal 1 item di keranjang").max(20, "Maksimal 20 item per checkout"),
  turnstileToken: z.string().max(2048).optional(),
  // P0-3: bukti kepemilikan nomor WA (kode 6 digit dari /api/auth/send-otp).
  // Alias code/otp/otpToken/proof dibaca dari body mentah (lihat gerbang OTP).
  otpCode: z.string().max(32).optional(),
  couponCode: z.string().max(32).optional(),
});

export async function POST(req: NextRequest) {
  let idemKey: string | null = null;
  let idemSealed = false; // true setelah klaim di-upgrade ke orderId
  const releaseIdemClaim = async () => {
    if (idemKey && !idemSealed) {
      const idemId: string = idemKey;
      await db.delete(Verification).where(eq(Verification.identifier, idemId)).catch(() => {});
    }
  };
  try {
    const ip = getClientIp(req);
    const limit = await checkRateLimitAsync(`checkout:ip:${ip}`, 5, 60); // Maks 5 checkout per menit per IP
    if (limit.isLimited) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan transaksi. Silakan tunggu ${limit.resetSeconds} detik.` },
        { status: 429, headers: rateLimitHeaders(limit, 5) }
      );
    }

    // P0-2 IDEMPOTENCY TANPA MIGRASI: dedupe via header Idempotency-Key di atas
    // tabel Verification yang SUDAH ADA (identifier `idem:checkout:<key>` →
    // value orderId, expiry 24 jam). TANPA kolom/tabel baru: JANGAN edit
    // prisma/schema.prisma, JANGAN db push/migrate untuk ini.
    // Batasan jujur: Verification.identifier HANYA index (non-unique) → dua
    // request bersamaan persis masih bisa lolos ganda (best-effort untuk
    // retry/double-tap sequential, BUKAN lock konkuren ketat). Bila butuh
    // guarantee konkuren:
    //   1) prisma/schema.prisma → Verification.identifier tambah @unique,
    //   2) npx prisma db push (atau: npx prisma migrate dev --name unique-verification-identifier),
    //   3) di sini ganti pola check-then-claim jadi insert klaim + tangkap
    //      P2002 → 409.
    //   (PROSEDUR SAJA — JANGAN dieksekusi tanpa perintah eksplisit owner.)
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

    // Fail-closed: tolak 503 sebelum tulis order bila secret Duitku kosong.
    try {
      duitkuProvider.assertDuitkuConfigured();
    } catch {
      return NextResponse.json(
        { error: "Pembayaran belum dikonfigurasi. Coba lagi nanti / hubungi admin." },
        { status: 503 }
      );
    }

    const rawBody = await req.text();
    // Cap body mentah dulu (anti OOM: decals 500k×10 bisa 5MB sebelum Zod).
    if (rawBody.length > MAX_CHECKOUT_RAW_BYTES) {
      return NextResponse.json({ error: "Payload terlalu besar (maks 2MB)" }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
    }
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
      destinationCity,
      expeditionZoneId,
      destinationPostalCode,
      expeditionCourier,
      expeditionService,
      fullAddress,
      courierNotes,
      items,
      turnstileToken,
      couponCode,
    } = validation.data;

    // P0-3 GUARD FREE_MAKASSAR: kecamatan wajib & harus dalam whitelist kota
    // (paritas dropdown CheckoutModal←MAKASSAR_SUBDISTRICTS) — tolak 400,
    // JANGAN diam-diam memperlakukan sebagai PICKUP/Makassar generik.
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

    // Kill-switch darurat TURNSTILE_ENFORCE="false" → lewati verifikasi
    // (dipakai saat Turnstile issue/outage). RISIKO: bot/spam order bisa
    // lolos — aktifkan hanya sementara saat darurat.
    // P0-4 Turnstile FAIL-CLOSED: production tanpa secret = 503 (JANGAN
    // fail-open buta); dev tanpa secret = lewati + warn (DX lokal).
    // Secret ada = token wajib lolos verifikasi (403 bila gagal).
    if (process.env.TURNSTILE_ENFORCE === "false") {
      console.warn("[checkout] TURNSTILE_ENFORCE=false — verifikasi anti-bot DILEWATI (mode darurat)");
    } else if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Verifikasi anti-bot belum dikonfigurasi. Coba lagi nanti / hubungi admin." },
          { status: 503 }
        );
      }
      console.warn("[checkout] CLOUDFLARE_TURNSTILE_SECRET_KEY kosong (dev) — verifikasi anti-bot dilewati");
    } else {
      const ts = await verifyTurnstileToken(turnstileToken || "", ip);
      if (!ts.success) {
        return NextResponse.json(
          { error: "Verifikasi anti-bot gagal. Muat ulang dan coba lagi." },
          { status: 403 }
        );
      }
    }

    // Fase 13: tolak apparel yang belum bisa dipesan (cap/pants/shorts)
    // dengan 400 JUJUR — SEBELUM hitung harga / tulis order / sentuh kupon & stok.
    for (const item of items) {
      const opt = APPAREL_CATALOG[item.apparelSlug as ApparelType];
      if (!opt?.orderable) {
        const reason = !opt
          ? `Apparel "${item.apparelSlug}" tidak dikenal.`
          : !opt.mockupEnabled
            ? `${opt.name} belum tersedia — mockup 3D maupun pemesanan SEGERA hadir.`
            : `${opt.name} belum bisa dipesan — mockup 3D-nya bisa dicoba di studio, tapi pemesanan SEGERA dibuka.`;
        return NextResponse.json(
          { error: `${reason} Keluarkan item ini lalu checkout ulang.` },
          { status: 400 }
        );
      }
    }

    // 1. Re-calculate entire price server-side (Never trust client prices)
    let computedSubtotalIdr = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      // Pigment surcharge DITENTUKAN server dari colorHex (client tak
      // dipercaya). Acid-wash NONAKTIF Sep 2026: legacy `isAcidWash` /
      // finish "acid-wash" diabaikan (tanpa surcharge, tanpa 400).
      const matchedColor = PRODUCT_COLORS.find(
        (c) => c.hex.toLowerCase() === item.colorHex.toLowerCase()
      );
      const isSpecialPigment = !!matchedColor?.isSpecialPigment;
      const finishPricing = materialFinishToPricing(item.materialFinishSlug);

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
        if (!Number.isSafeInteger(lineTotal) || lineTotal < 0) {
          return NextResponse.json({ error: "Hitungan harga tidak valid" }, { status: 400 });
        }
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
        fabricThicknessSlug: item.fabricThicknessSlug ?? finishPricing.fabricThicknessSlug,
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
    let shippingCostIdr = selectedDelivery?.costIdr || 0;
    // Ekspedisi luar kota: ongkir dari tabel zona (server-side, bukan flat).
    let expeditionLabel = "";
    if (deliveryMethod === "EXPEDITION_MANUAL") {
      // PRIMER: tarif live AgenWebsite (kode pos + berat real order).
      // Berat: ±250g per pcs (kaos + packing).
      const totalQty = validatedItems.reduce((a, it) => a + (it.quantity || 0), 0);
      const weightGrams = Math.max(250, totalQty * 250);
      let liveResolved = false;
      if (destinationPostalCode) {
        // P0-3 STRICT: kurir/layanan yang dipilih user WAJIB ada di live rates —
        // JANGAN silent-fallback ke termurah (user membayar ekspektasi layanan
        // yang tak terkirim). Tanpa pilihan eksplisit → termurah (default jujur).
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
            shippingCostIdr = pick.costIdr;
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
            // Live down + pilihan eksplisit = 400 JUJUR (fallback zona diam-diam
            // bisa menagih tarif/janji layanan yang tak dipilih user).
            console.warn("Live ongkir gagal (pilihan eksplisit, tolak 400):", e?.message);
            return NextResponse.json(
              { error: "Tarif live kurir pilihan sedang gangguan. Coba lagi sebentar / pilih kurir lain." },
              { status: 400 }
            );
          }
          console.warn("Live ongkir gagal, fallback zona:", e?.message);
        }
      }
      if (!liveResolved) {
        const { resolveExpeditionCost } = await import("@/lib/shipping/zones");
        const resolved = await resolveExpeditionCost({
          zoneId: expeditionZoneId,
          city: destinationCity || district,
        });
        shippingCostIdr = resolved.costIdr;
        if (resolved.zone) {
          expeditionLabel = `Ekspedisi ${resolved.zone.courier} ${resolved.zone.service} ke ${resolved.zone.city} (est. ${resolved.zone.etdLabel})`;
        }
      }
    }

    const selectedTurnaround = PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === turnaroundTier);
    const turnaroundSurchargeIdr = selectedTurnaround?.surchargeIdr || 0;

    // B3: validasi kupon READ-ONLY + hitung total SEBELUM gerbang OTP agar OTP
    // satu-pakai tak hangus sia-sia bila kupon invalid / total di luar batas.
    // Reservasi kuota (consumeCoupon, tulis) tetap SESUDAH klaim di bawah.
    let discountIdr = 0;
    let appliedCoupon: string | null = null;
    if (couponCode?.trim()) {
      try {
        const { validateCoupon } = await import("@/lib/coupons");
        const c = await validateCoupon(couponCode, computedSubtotalIdr);
        discountIdr = c.discountIdr;
        appliedCoupon = c.code;
      } catch (couponErr: any) {
        return NextResponse.json({ error: couponErr?.message || "Kupon tidak valid" }, { status: 400 });
      }
    }
    const computedTotalIdr = computedSubtotalIdr - discountIdr + shippingCostIdr + turnaroundSurchargeIdr;
    // Batas wajar transaksi tunggal (anti total fiktif ke gateway).
    if (!Number.isSafeInteger(computedTotalIdr) || computedTotalIdr < 10000 || computedTotalIdr > 500_000_000) {
      return NextResponse.json({ error: "Total transaksi di luar batas wajar" }, { status: 400 });
    }

    // Kill-switch darurat CHECKOUT_OTP_REQUIRED="false" → lewati gerbang OTP
    // (dipakai saat Fonnte mati). RISIKO: bypass OTP = order fiktif mungkin
    // (nomor WA tak terverifikasi) — aktifkan hanya sementara saat darurat.
    // P0-3 GERBANG OTP (paritas repay): dipasang SETELAH semua 400 validasi
    // Resolve session & existing user first:
    const cleanOrderPhone = phoneNumber.replace(/[^0-9]/g, "");
    let sessionUser: any = null;
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth.api.getSession({ headers: req.headers });
      if (session?.user?.id) {
        sessionUser = await db.query.User.findFirst({
          where: (t, { eq }) => eq(t.id, session.user.id),
        });
      }
    } catch {}

    // OPTIMALISASI FONNTE (Keputusan Sep 2026):
    // Verifikasi nomor telepon HANYA SEKALI SELAMANYA per akun!
    // Bila akun sudah pernah verifikasi (phoneVerified === true) dan nomor WA
    // yang digunakan sama dengan nomor akunnya -> LEWATI GERBANG OTP!
    const cleanUserPhone = (sessionUser?.phoneNumber || "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    const isAlreadyVerified =
      Boolean(sessionUser?.phoneVerified) &&
      Boolean(sessionUser?.phoneNumber) &&
      cleanUserPhone === cleanOrderPhone.replace(/^0/, "62");

    if (process.env.CHECKOUT_OTP_REQUIRED === "false" || isAlreadyVerified) {
      if (isAlreadyVerified) {
        console.log(`[checkout] Akun ${sessionUser?.id} (${cleanOrderPhone}) sudah phoneVerified — gerbang OTP dilewati.`);
      } else {
        console.warn("[checkout] CHECKOUT_OTP_REQUIRED=false — gerbang OTP DILEWATI (mode darurat)");
      }
    } else {
      const otpRaw =
        (body as any)?.otpCode ??
        (body as any)?.code ??
        (body as any)?.otp ??
        (body as any)?.otpToken ??
        (body as any)?.proof;
      const otpParsed = z
        .object({
          phoneNumber: z.string().min(9).max(20),
          otp: z.string().regex(/^\d{6}$/),
        })
        .safeParse({
          phoneNumber: (body as any)?.phoneNumber,
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
      const otpRecord = await db.query.Verification.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.identifier, `otp:${cleanProofPhone}`), eq(t.value, hashOtp(otpParsed.data.otp))),
        orderBy: (t, { desc }) => desc(t.createdAt),
      });
      // Satu pesan untuk salah & kadaluarsa (anti-oracle, paritas repay/verify-otp).
      if (!otpRecord || new Date() > otpRecord.expiresAt) {
        return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa" }, { status: 401 });
      }
      // Owner-match SEBELUM hanguskan — nomor lain tak boleh menghanguskan OTP sah.
      if (!cleanOrderPhone || cleanProofPhone !== cleanOrderPhone) {
        return NextResponse.json({ error: "OTP bukan milik nomor pemesan ini" }, { status: 403 });
      }
      // Satu-pakai: hanguskan seperti verify-otp / repay / track/orders.
      await db.delete(Verification).where(eq(Verification.identifier, `otp:${cleanProofPhone}`)).catch(() => {});
    } // end CHECKOUT_OTP_REQUIRED / isAlreadyVerified;

    // P0-2 KLAIM: tandai key sedang diproses SEBELUM reservasi kuota kupon /
    // tulis order — retry sequential dengan key sama berhenti di cek replay
    // (409), tak bakar kupon ganda. Klaim pendek (10 mnt); di-upgrade ke
    // orderId + 24 jam setelah order terbuat (lihat seal di bawah).
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

    // 2b. Kupon: reservasi kuota atomik SESUDAH klaim (B3 — validasi READ-ONLY
    // + hitung total sudah dilakukan SEBELUM gerbang OTP di atas; OTP tak
    // hangus bila kupon invalid). consumeCoupon tetap di sini (tulis, bukan
    // sebelum OTP) agar retry tak bakar kuota ganda.
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

    // 3. Find or create user for this WhatsApp number.
    // Prioritaskan pengguna yang sedang login (session), tandai phoneVerified = true untuk selamanya.
    const cleanPhone = cleanOrderPhone;
    let user: any = sessionUser;

    if (user) {
      try {
        await db
          .update(User)
          .set({ phoneNumber: cleanPhone, phoneVerified: true })
          .where(eq(User.id, user.id));
      } catch {}
    } else {
      const guestEmail = email || `${cleanPhone}@kaoskami.customer`;
      user = await db.query.User.findFirst({
        where: (t, { or, eq }) => or(eq(t.phoneNumber, cleanPhone), eq(t.email, guestEmail)),
      });

      if (!user) {
        const [created] = await db
          .insert(User)
          .values({
            id: nanoid(),
            name: recipientName,
            phoneNumber: cleanPhone,
            phoneVerified: true,
            email: guestEmail,
            role: "CUSTOMER",
          })
          .onConflictDoNothing()
          .returning();
        user =
          created! ||
          (await db.query.User.findFirst({
            where: (t, { or, eq }) => or(eq(t.phoneNumber, cleanPhone), eq(t.email, guestEmail)),
          }))!;
      } else {
        await db
          .update(User)
          .set({ phoneNumber: cleanPhone, phoneVerified: true })
          .where(eq(User.id, user.id))
          .catch(() => {});
      }
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
        district: deliveryMethod === "EXPEDITION_MANUAL" ? destinationCity || district || "Luar Kota" : district || "Makassar",
        fullAddress,
        notes: courierNotes,
      })
      .returning({ id: Address.id });

    // 5. Generate Human-Readable Order Number (KK-YYYYMMDD-XXXX, tanggal WITA)
    // + retry anti-tabrakan UNIQUE (ruang 9000/hari bisa penuh saat ramai).
    const { nextOrderNumber } = await import("@/lib/orderNumber");
    let orderBase: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 5 && !orderBase; attempt++) {
      try {
        const [row] = await db
          .insert(Order)
          .values({
            id: nanoid(),
            orderNumber: nextOrderNumber(),
            userId: user.id,
            status: "PENDING_PAYMENT",
            deliveryMethod,
            subtotalIdr: computedSubtotalIdr,
            shippingCostIdr,
            discountIdr,
            totalIdr: computedTotalIdr,
            shippingAddressId: address?.id,
            // Marker kupon untuk restore kuota saat batal/refund
            // (dibaca getOrderCouponCode — JANGAN hapus/pakai untuk teks bebas).
            notes: appliedCoupon ? `COUPON:${appliedCoupon}` : null,
            // Marker tier SERVER-ONLY: notes user dibersihkan dari pola [TIER:*]
            // agar tak bisa klaim prioritas gratis (audit: substring EXPRESS).
            courierNotes: [
              (courierNotes || "").replace(/\[TIER:[^\]]*\]/g, "").trim(),
              expeditionLabel,
              turnaroundTier === "EXPRESS_24H" ? "EXPRESS 24H [TIER:EXPRESS_24H]" : "",
            ]
              .filter(Boolean)
              .join(" | "),
          })
          .returning();
        orderBase = row!;
      } catch (e: any) {
        lastErr = e;
        if (!String(e?.message || "").includes("UNIQUE")) throw e;
      }
    }
    if (!orderBase) throw lastErr || new Error("Gagal buat nomor order");
    const orderRow = orderBase;
    // P0-2 SEAL: klaim → orderId konkret (replay key sama = 409 + orderId,
    // client lanjut bayar via repay, BUKAN checkout ulang).
    if (idemKey) {
      const sealId: string = idemKey;
      await db
        .update(Verification)
        .set({ value: orderRow.id, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) })
        .where(eq(Verification.identifier, sealId))
        .catch(() => {});
      idemSealed = true;
    }
    // Kompensasi order yatim: jika tulis items/riwayat gagal setelah order
    // terbuat (libsql/web tanpa transaksi interaktif), hapus order-nya agar
    // tidak ada order tanpa item di admin. P0-2: perluas ke Address + Design
    // arsip (keduanya fresh-id request ini, aman dihapus) agar tak ada arsip
    // yatim. Kegagalan kompensasi di-log saja.
    const createdDesignIds: string[] = [];
    try {
      const insertedItems = await db.insert(OrderItem).values(
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
      ).returning({ id: OrderItem.id });
      // Arsipkan desain kustom ke tabel Design + tautkan item (audit E2E:
      // sebelumnya custom-decals TAK PERNAH sampai produksi — task selalu
      // fallback 28.5×16 front tanpa master).
      const rowIds = (insertedItems as any[]).map((r: any) => r.id);
      await Promise.all(
        validatedItems.map(async (item, idx) => {
          if (item.designId || item.productVariantId) return;
          if (!Array.isArray(item.decals) || item.decals.length === 0) return;
          try {
            const cat = await db.query.ApparelCategory.findFirst({
              where: (t, { eq }) => eq(t.slug, item.apparelSlug),
              columns: { id: true },
            });
            if (!cat) return;
            // Hosting-kan decal base64 ke R2 dulu (jangan simpan TEXT
            // 500k×10 mentah ke DB — paritas POST /api/designs).
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
                // K2: arsip master produksi dari checkout (map side→https +
                // decal:<id>→https). Null bila client tak kirim (drawer tanpa
                // ekspor) — confirmOrder fallback ke preview, jangan null diam.
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
            // Arsip best-effort: checkout TETAP sukses (produksi fallback lama).
            console.warn("Arsip desain order gagal:", orderRow.id, e?.message);
          }
        })
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
        // P0-2: arsip Design yatim (fresh-id request ini) + Address pengiriman.
        if (createdDesignIds.length > 0) {
          await db.delete(Design).where(inArray(Design.id, createdDesignIds)).catch(() => {});
        }
        if (address?.id) {
          await db.delete(Address).where(eq(Address.id, address.id)).catch(() => {});
        }
        await db.delete(Order).where(eq(Order.id, orderRow.id));
        // B2: order sudah dihapus → seal idempotency WAJIB dilepas juga.
        // Tanpa ini klaim `idem:checkout:<key>` tetap menunjuk orderId yatim
        // (idemSealed=true menahan releaseIdemClaim di catch) → retry key sama
        // 409 selamanya ke order yang tak ada. Hapus baris seal + buka kunci
        // agar retry membuat order baru yang sehat.
        if (idemKey) {
          const sealId: string = idemKey;
          await db.delete(Verification).where(eq(Verification.identifier, sealId)).catch(() => {});
          idemSealed = false;
        }
      } catch (compErr: any) {
        console.error("Kompensasi order yatim gagal:", orderRow.id, compErr?.message);
      }
      // Kupon yatim: kuota sudah di-reserve sebelum order dibuat. Kembalikan
      // best-effort agar tak hangus; JANGAN gagalkan kompensasi bila gagal.
      try {
        if (appliedCoupon) {
          const { restoreCoupon } = await import("@/lib/coupons");
          await restoreCoupon(appliedCoupon).catch(() => false);
        }
      } catch (e: any) {
        console.warn("Restore kupon kompensasi gagal:", orderRow.id, e?.message);
      }
      throw itemsErr;
    }
    const order = { ...orderRow, items: validatedItems };

    // P0-1: catat Payment PENDING dulu dengan ref sementara SEBELUM sentuh
    // Duitku — tak ada lagi order lunas-tanpa-baris-payment bila proses mati
    // di tengah createCharge. Webhook tetap kompatibel: ia lookup order via
    // merchantOrderId (= orderNumber), BUKAN via providerRef, lalu menimpa
    // providerRef dari reference callback + dedupe 4b tak false-positive
    // (ref `pending-*` ≠ reference Duitku; rawWebhookPayload masih null).
    // Charge gagal → baris PENDING tertinggal untuk repay (update-in-place).
    const pendingRef = `pending-${order.id}`;
    await db.insert(Payment).values({
      id: nanoid(),
      orderId: order.id,
      provider: "DUITKU",
      providerRef: pendingRef,
      amountIdr: computedTotalIdr,
      status: "PENDING",
    });

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
          ? [{ name: `Ongkir ${expeditionLabel || selectedDelivery?.name || deliveryMethod}`.slice(0, 120), price: shippingCostIdr, quantity: 1 }]
          : []),
        ...(turnaroundSurchargeIdr > 0
          ? [{ name: "Surcharge EXPRESS 24H", price: turnaroundSurchargeIdr, quantity: 1 }]
          : []),
        ...(discountIdr > 0
          ? [{ name: `Diskon kupon ${appliedCoupon || ""}`.trim(), price: -discountIdr, quantity: 1 }]
          : []),
      ];
      console.log("[checkout] DUITKU CHARGE DEBUG:", {
        computedTotalIdr,
        duitkuItems,
        sum: duitkuItems.reduce((acc, it) => acc + it.price * it.quantity, 0),
      });
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
        captureException?.(chargeErr, { extra: { orderId: order.id, orderNumber: order.orderNumber } });
      } catch {}
      return NextResponse.json(
        {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          invoiceUrl: `${siteUrl()}/orders/${order.id}`,
          error: "Pembayaran Duitku gagal dibuat. Pesanan tersimpan PENDING — silakan retry checkout.",
          detail: chargeErr?.message,
        },
        { status: 502 }
      );
    }

    // 8. Selesaikan baris Payment PENDING (P0-1): timpa ref sementara dengan
    // reference Duitku asli. Update-by-orderId (Payment.orderId UNIQUE).
    await db
      .update(Payment)
      .set({ providerRef: chargeResult.reference })
      .where(eq(Payment.orderId, order.id));

    // 9. Send WhatsApp Confirmation:
    // PENGHEMATAN KUOTA FONNTE (Keputusan Owner Sep 2026):
    // Notifikasi transaksional otomatis via WhatsApp dinonaktifkan agar kuota Fonnte
    // khusus dipakai untuk OTP verifikasi nomor telepon (1x selamanya per akun).
    // Pelanggan memantau status via Dashboard Invoice Web, Web Notification, dan Aplikasi Capacitor.
    // Tombol chat WhatsApp manual (wa.me) tetap tersedia di halaman invoice secara gratis.
    const invoiceUrl = `${siteUrl()}/orders/${order.id}`;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: computedTotalIdr,
      paymentUrl: chargeResult.paymentUrl,
      reference: chargeResult.reference,
      invoiceUrl,
      discountIdr,
      appliedCoupon,
    });
  } catch (error: any) {
    console.error("Checkout process error:", error);
    // Klaim idempotency yang belum di-seal (gagal sebelum order terbuat)
    // dilepas best-effort agar retry key sama tak terkunci 409 selama 10 mnt.
    await releaseIdemClaim();
    const status = error?.status === 400 ? 400 : 500;
    return NextResponse.json({ error: error?.message || "Internal server error during checkout" }, { status });
  }
}
