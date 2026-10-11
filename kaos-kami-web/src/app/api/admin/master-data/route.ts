import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { ApparelCategory, SablonMethod, MaterialFinish, ColorOption } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

async function assertAdminSession() {
  const { auth } = await import("@/lib/auth");
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs as any });
  const role = (session?.user as any)?.role;
  if (!session?.user) throw new Error("Unauthorized");
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    throw new Error("Forbidden: khusus admin");
  }
  return session.user;
}

const CreateMasterDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("color"),
    name: z.string().min(2, "Nama warna minimal 2 karakter").max(60),
    hex: z.string().min(4).max(9),
    surchargeIdr: z.number().int().min(0).default(0),
    description: z.string().max(200).optional().nullable(),
  }),
  z.object({
    type: z.literal("material"),
    name: z.string().min(2, "Nama material minimal 2 karakter").max(80),
    surchargeIdr: z.number().int().min(0).default(0),
    roughness: z.number().min(0).max(1).default(0.9),
    sheen: z.number().min(0).max(1).default(0.5),
  }),
  z.object({
    type: z.literal("sablon"),
    name: z.string().min(2, "Nama metode sablon minimal 2 karakter").max(80),
    description: z.string().max(300).optional().nullable(),
    priceA6Idr: z.number().int().min(0).default(10000),
    priceA5Idr: z.number().int().min(0).default(15000),
    priceA4Idr: z.number().int().min(0).default(25000),
    priceA3Idr: z.number().int().min(0).default(35000),
  }),
]);

const PatchMasterDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("category"),
    id: z.string().min(1),
    name: z.string().min(2).max(100).optional(),
    tagline: z.string().max(200).optional().nullable(),
    weightGsm: z.string().max(50).optional().nullable(),
    basePriceIdr: z.number().int().min(1000).max(100_000_000).optional(),
    isActive: z.boolean().optional(),
    statusType: z.enum(["ACTIVE", "COMING_SOON", "MOCKUP_ONLY", "INACTIVE"]).optional(),
  }),
  z.object({
    type: z.literal("sablon"),
    id: z.string().min(1),
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(300).optional().nullable(),
    priceA6Idr: z.number().int().min(0).max(100_000_000).optional(),
    priceA5Idr: z.number().int().min(0).max(100_000_000).optional(),
    priceA4Idr: z.number().int().min(0).max(100_000_000).optional(),
    priceA3Idr: z.number().int().min(0).max(100_000_000).optional(),
  }),
  z.object({
    type: z.literal("material"),
    id: z.string().min(1),
    name: z.string().min(2).max(100).optional(),
    surchargeIdr: z.number().int().min(0).max(100_000_000).optional(),
  }),
  z.object({
    type: z.literal("color"),
    id: z.string().min(1),
    name: z.string().min(2).max(100).optional(),
    hex: z.string().min(4).max(9).optional(),
    surchargeIdr: z.number().int().min(0).max(100_000_000).optional(),
  }),
]);

/** POST /api/admin/master-data — Tambah Warna, Material, atau Metode Sablon */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-master-post:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });

  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateMasterDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    if (data.type === "color") {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const [newColor] = await db
        .insert(ColorOption)
        .values({
          id: `color_${nanoid(8)}`,
          slug: `${slug}-${nanoid(4).toLowerCase()}`,
          name: data.name.trim(),
          hex: data.hex.trim(),
          surchargeIdr: data.surchargeIdr,
          description: data.description || null,
          isSpecialPigment: data.surchargeIdr > 0,
        })
        .returning();
      return NextResponse.json({ success: true, item: newColor, message: "Warna kain berhasil ditambahkan" });
    }

    if (data.type === "material") {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const [newMat] = await db
        .insert(MaterialFinish)
        .values({
          id: `mat_${nanoid(8)}`,
          slug: `${slug}-${nanoid(4).toLowerCase()}`,
          name: data.name.trim(),
          surchargeIdr: data.surchargeIdr,
          roughness: data.roughness,
          sheen: data.sheen,
        })
        .returning();
      return NextResponse.json({ success: true, item: newMat, message: "Material finishing berhasil ditambahkan" });
    }

    if (data.type === "sablon") {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const [newSablon] = await db
        .insert(SablonMethod)
        .values({
          id: `sablon_${nanoid(8)}`,
          slug: `${slug}-${nanoid(4).toLowerCase()}`,
          name: data.name.trim(),
          description: data.description || "Sablon resolusi tinggi",
          pricingModel: "TIERED_AREA",
          priceA6Idr: data.priceA6Idr,
          priceA5Idr: data.priceA5Idr,
          priceA4Idr: data.priceA4Idr,
          priceA3Idr: data.priceA3Idr,
          flatPriceIdr: 0,
        })
        .returning();
      return NextResponse.json({ success: true, item: newSablon, message: "Metode sablon berhasil ditambahkan" });
    }

    return NextResponse.json({ error: "Tipe tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal menambahkan data master" }, { status: 500 });
  }
}

/** PATCH /api/admin/master-data — Edit Data Master (Kategori, Sablon, Material, Warna) */
export async function PATCH(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-master-patch:ip:${getClientIp(req)}`, 60, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });

  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchMasterDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    if (data.type === "category") {
      const set: Record<string, unknown> = {};
      if (data.name !== undefined) set.name = data.name.trim();
      if (data.tagline !== undefined) set.tagline = data.tagline ? data.tagline.trim() : null;
      if (data.weightGsm !== undefined) set.weightGsm = data.weightGsm ? data.weightGsm.trim() : null;
      if (data.basePriceIdr !== undefined) set.basePriceIdr = data.basePriceIdr;
      if (data.isActive !== undefined) set.isActive = data.isActive;

      // Handle statusType presets
      if (data.statusType) {
        if (data.statusType === "COMING_SOON") {
          set.isActive = true;
          if (!data.name?.includes("SEGERA")) {
            set.name = `${data.name || "Apparel"} (SEGERA Hadir)`;
          }
          set.tagline = "Mockup & pemesanan SEGERA hadir";
        } else if (data.statusType === "MOCKUP_ONLY") {
          set.isActive = true;
          if (!data.name?.includes("Mockup")) {
            set.name = `${data.name || "Apparel"} (Mockup Saja)`;
          }
          set.tagline = "Mockup 3D — pemesanan SEGERA hadir";
        } else if (data.statusType === "ACTIVE") {
          set.isActive = true;
          set.name = (data.name || "").replace(/\s*\((SEGERA Hadir|Mockup Saja)\)/gi, "").trim();
        } else if (data.statusType === "INACTIVE") {
          set.isActive = false;
        }
      }

      await db.update(ApparelCategory).set(set).where(eq(ApparelCategory.id, data.id));
      return NextResponse.json({ success: true, message: "Kategori pakaian berhasil diperbarui" });
    }

    if (data.type === "sablon") {
      const set: Record<string, unknown> = {};
      if (data.name !== undefined) set.name = data.name.trim();
      if (data.description !== undefined) set.description = data.description ? data.description.trim() : null;
      if (data.priceA6Idr !== undefined) set.priceA6Idr = data.priceA6Idr;
      if (data.priceA5Idr !== undefined) set.priceA5Idr = data.priceA5Idr;
      if (data.priceA4Idr !== undefined) set.priceA4Idr = data.priceA4Idr;
      if (data.priceA3Idr !== undefined) set.priceA3Idr = data.priceA3Idr;

      await db.update(SablonMethod).set(set).where(eq(SablonMethod.id, data.id));
      return NextResponse.json({ success: true, message: "Tarif metode sablon berhasil diperbarui" });
    }

    if (data.type === "material") {
      const set: Record<string, unknown> = {};
      if (data.name !== undefined) set.name = data.name.trim();
      if (data.surchargeIdr !== undefined) set.surchargeIdr = data.surchargeIdr;

      await db.update(MaterialFinish).set(set).where(eq(MaterialFinish.id, data.id));
      return NextResponse.json({ success: true, message: "Material finishing berhasil diperbarui" });
    }

    if (data.type === "color") {
      const set: Record<string, unknown> = {};
      if (data.name !== undefined) set.name = data.name.trim();
      if (data.hex !== undefined) set.hex = data.hex.trim();
      if (data.surchargeIdr !== undefined) set.surchargeIdr = data.surchargeIdr;

      await db.update(ColorOption).set(set).where(eq(ColorOption.id, data.id));
      return NextResponse.json({ success: true, message: "Warna kain berhasil diperbarui" });
    }

    return NextResponse.json({ error: "Tipe data master tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal memperbarui data master" }, { status: 500 });
  }
}

/** DELETE /api/admin/master-data — Hapus Warna, Material, atau Metode Sablon */
export async function DELETE(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-master-del:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });

  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "Parameter type dan id wajib diisi" }, { status: 400 });
  }

  try {
    if (type === "color") {
      await db.delete(ColorOption).where(eq(ColorOption.id, id));
      return NextResponse.json({ success: true, message: "Warna kain berhasil dihapus" });
    }

    if (type === "material") {
      await db.delete(MaterialFinish).where(eq(MaterialFinish.id, id));
      return NextResponse.json({ success: true, message: "Material finishing berhasil dihapus" });
    }

    if (type === "sablon") {
      await db.delete(SablonMethod).where(eq(SablonMethod.id, id));
      return NextResponse.json({ success: true, message: "Metode sablon berhasil dihapus" });
    }

    return NextResponse.json({ error: "Tipe tidak dapat dihapus" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal menghapus item" }, { status: 500 });
  }
}
