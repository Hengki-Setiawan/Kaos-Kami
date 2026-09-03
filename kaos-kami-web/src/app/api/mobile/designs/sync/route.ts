import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

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
    const validation = SyncPayloadSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    const { userId, designs } = validation.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan. Login/daftar dulu di aplikasi." }, { status: 404 });
    }

    const results: Array<{ clientId: string; designId: string; action: "created" | "kept-server" }> = [];
    for (const d of designs) {
      const category =
        (await prisma.apparelCategory.findUnique({ where: { slug: d.apparelSlug } })) ||
        (await prisma.apparelCategory.findFirst({ orderBy: { sortOrder: "asc" } }));
      if (!category) continue;

      const remoteUpdatedAt = d.updatedAt ? new Date(d.updatedAt) : new Date();
      const existing = await prisma.design.findFirst({
        where: { userId, title: d.title },
        orderBy: { updatedAt: "desc" },
      });

      // Last-Write-Wins: server menang jika lebih baru dari kiriman HP.
      if (existing && existing.updatedAt > remoteUpdatedAt) {
        results.push({ clientId: d.clientId, designId: existing.id, action: "kept-server" });
        continue;
      }

      const saved = await prisma.design.create({
        data: {
          userId,
          categoryId: category.id,
          title: d.title,
          colorHex: d.colorHex,
          colorName: d.colorName,
          size: d.size,
          decals: JSON.stringify(d.decals || []),
          calculatedPriceIdr: d.calculatedPriceIdr,
          priceBreakdown: JSON.stringify({ syncedFrom: "mobile", deviceUpdatedAt: remoteUpdatedAt }),
          status: "SAVED",
        },
      });
      results.push({ clientId: d.clientId, designId: saved.id, action: "created" });
    }

    return NextResponse.json({ success: true, synced: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
