import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ApparelCategory, Design } from "@/lib/drizzle-schema";
import { assertResourceOwnerOrAdmin } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const SyncDesignSchema = z.object({
  clientId: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  apparelSlug: z.string().min(1),
  colorHex: z.string().min(1),
  colorName: z.string().min(1),
  size: z.string().min(1),
  decals: z.array(z.any()).max(10).default([]),
  calculatedPriceIdr: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().optional(),
});

const SyncPayloadSchema = z.object({
  userId: z.string().min(1),
  deviceId: z.string().min(1).max(64).optional(),
  designs: z.array(SyncDesignSchema).max(50),
});

/**
 * M10.4 — POST /api/mobile/designs/sync
 * Sinkronisasi desain offline HP → server. Konflik diselesaikan Last-Write-Wins
 * berdasarkan updatedAt (spesifikasi M10 §3). userId wajib & harus ada di DB.
 * (Auth sesi penuh mobile = follow-up; userId+deviceId mengikat perangkat.)
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`sync:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak sinkronisasi." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const validation = SyncPayloadSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    const { userId, designs, deviceId } = validation.data;

    // Anti-IDOR: hanya pemilik akun (atau admin) boleh injeksi desain.
    try {
      await assertResourceOwnerOrAdmin(userId);
    } catch (e: any) {
      const msg = e?.message || "Forbidden";
      const status = msg.startsWith("Unauthorized") ? 401 : 403;
      return NextResponse.json({ error: msg }, { status });
    }

    const user = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, userId),
      columns: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan. Login/daftar dulu di aplikasi." }, { status: 404 });
    }

    const results: Array<{ clientId: string; designId: string; action: "created" | "updated" | "kept-server" }> = [];
    // Preload kategori sekali (hindari N+1 ±150 query).
    const allCategories = await db.query.ApparelCategory.findMany({
      orderBy: (t, { asc }) => asc(t.sortOrder),
    });
    const fallbackCategory = allCategories[0];
    const { calculate6VariablePrice } = await import("@/lib/pricingEngine");
    const { PRODUCT_COLORS } = await import("@/lib/constants");
    for (const d of designs) {
      const category =
        allCategories.find((c) => c.slug === d.apparelSlug) || fallbackCategory;
      if (!category) continue;

      // Harga dihitung ULANG di server (jangan percaya HP).
      let serverPrice = d.calculatedPriceIdr;
      try {
        const matched = PRODUCT_COLORS.find(
          (c: any) => String(c.hex).toLowerCase() === String(d.colorHex).toLowerCase()
        );
        const pricing = calculate6VariablePrice({
          apparelSlug: (category.slug || d.apparelSlug) as any,
          size: d.size,
          colorHex: d.colorHex,
          isSpecialPigment: !!matched?.isSpecialPigment,
          decals: Array.isArray(d.decals) ? d.decals : [],
          quantity: 1,
        });
        serverPrice = pricing.totalPriceIdr;
      } catch {
        // Decal HP tak valid untuk engine → pakai angka HP apa adanya.
      }

      const remoteUpdatedAt = d.updatedAt ? new Date(d.updatedAt) : new Date();
      const existing = await db.query.Design.findFirst({
        where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.title, d.title)),
        orderBy: (t, { desc }) => desc(t.updatedAt),
      });

      // Last-Write-Wins: server menang jika lebih baru dari kiriman HP.
      if (existing && existing.updatedAt > remoteUpdatedAt) {
        results.push({ clientId: d.clientId, designId: existing.id, action: "kept-server" });
        continue;
      }

      // HP lebih baru (atau belum ada): UPDATE baris yang sama, JANGAN
      // bikin duplikat tiap sync.
      if (existing) {
        await db
          .update(Design)
          .set({
            categoryId: category.id,
            colorHex: d.colorHex,
            colorName: d.colorName,
            size: d.size,
            decals: JSON.stringify(d.decals || []),
            calculatedPriceIdr: serverPrice,
            priceBreakdown: JSON.stringify({ syncedFrom: "mobile", deviceId: deviceId || null, deviceUpdatedAt: remoteUpdatedAt }),
            status: "SAVED",
          })
          .where(eq(Design.id, existing.id));
        results.push({ clientId: d.clientId, designId: existing.id, action: "updated" });
        continue;
      }

      const [saved] = await db
        .insert(Design)
        .values({
          id: nanoid(),
          userId,
          categoryId: category.id,
          title: d.title,
          colorHex: d.colorHex,
          colorName: d.colorName,
          size: d.size,
          decals: JSON.stringify(d.decals || []),
          calculatedPriceIdr: serverPrice,
          priceBreakdown: JSON.stringify({ syncedFrom: "mobile", deviceId: deviceId || null, deviceUpdatedAt: remoteUpdatedAt }),
          status: "SAVED",
        })
        .returning({ id: Design.id });
      if (!saved?.id) {
        throw new Error(`Gagal simpan desain ${d.clientId}`);
      }
      results.push({ clientId: d.clientId, designId: saved.id, action: "created" });
    }

    return NextResponse.json({ success: true, synced: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
