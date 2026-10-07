import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductReview, Order } from "@/lib/drizzle-schema";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const SubmitReviewSchema = z.object({
  orderId: z.string().max(64).optional(),
  productVariantId: z.string().max(64).optional(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(5, "Ulasan minimal 5 karakter").max(1000),
  photoUrls: z.array(z.string().url()).max(5).optional(),
});

/** POST /api/reviews — Pembeli mengirimkan ulasan kepuasan produk (1-5 bintang). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "Silakan login untuk mengirimkan ulasan." }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = await checkRateLimitAsync(`review:user:${user.id}`, 5, 3600);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Batas 5 ulasan per jam." }, { status: 429, headers: rateLimitHeaders(rl, 5) });
    }
    void ip;

    const parsed = SubmitReviewSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const { orderId, productVariantId, rating, reviewText, photoUrls } = parsed.data;

    // Verifikasi kepemilikan pesanan jika disertakan
    let isVerified = true;
    if (orderId) {
      const ord = await db.query.Order.findFirst({
        where: (t, { eq }: any) => eq(t.id, orderId),
        columns: { id: true, userId: true, status: true },
      });
      if (ord && ord.userId !== user.id) {
        return NextResponse.json({ error: "Order bukan milik Anda" }, { status: 403 });
      }
      isVerified = ord?.status === "COMPLETED" || ord?.status === "DELIVERED";
    }

    const reviewId = nanoid();
    await db.insert(ProductReview).values({
      id: reviewId,
      orderId: orderId || null,
      userId: user.id,
      productVariantId: productVariantId || null,
      customerName: user.name || "Pelanggan Kaos Kami",
      rating,
      reviewText,
      photoUrls: photoUrls && photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
      isVerifiedPurchase: isVerified,
      isPublished: true,
    });

    return NextResponse.json({ success: true, id: reviewId, message: "Terima kasih! Ulasan Anda berhasil diterbitkan." });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal mengirim ulasan" }, { status: 500 });
  }
}

/** GET /api/reviews — Mengambil ulasan publik untuk social proof & etalase toko. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId");
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));

    const reviews = await db.query.ProductReview.findMany({
      where: (t, { and, eq }: any) => {
        const conds = [eq(t.isPublished, true)];
        if (variantId) conds.push(eq(t.productVariantId, variantId));
        return and(...conds);
      },
      orderBy: (t, { desc }: any) => desc(t.createdAt),
      limit,
    });

    return NextResponse.json({
      success: true,
      reviews: reviews.map((r: any) => ({
        id: r.id,
        customerName: r.customerName || "Pelanggan Terverifikasi",
        rating: r.rating,
        reviewText: r.reviewText,
        photoUrls: r.photoUrls ? JSON.parse(r.photoUrls) : [],
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memuat ulasan" }, { status: 500 });
  }
}
