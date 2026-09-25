import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { ProductVariant, ApparelCategory } from "@/lib/drizzle-schema";
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

// Floor harga disamakan dengan POST: Rp 1.000 (batas bawah DTF/sablon).
// `delta` = penyesuaian stok server-side (+1/-1) anti lost-update:
// UI kirim delta, server baca stok terkini lalu jumlahkan — bukan stok absolut dari client.
const PRICE_FLOOR_IDR = 1000;
const PRICE_CAP_IDR = 100_000_000;

const PatchSchema = z.object({
  variantId: z.string().min(1),
  stockQty: z.number().int().min(0).max(100000).optional(),
  delta: z.number().int().min(-100000).max(100000).optional(),
  priceIdr: z.number().int().min(PRICE_FLOOR_IDR).max(PRICE_CAP_IDR).optional(),
  isActive: z.boolean().optional(),
});

const CreateVariantSchema = z.object({
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  sku: z.string().min(2).max(50).optional(),
  name: z.string().min(2, "Nama produk wajib diisi").max(120),
  colorHex: z.string().min(4).max(9).default("#121214"),
  colorName: z.string().min(2).max(50).default("Obsidian Black"),
  size: z.string().min(1).max(10).default("L"),
  priceIdr: z.number().int().min(1000).max(100_000_000),
  stockQty: z.number().int().min(0).max(100000).default(10),
  images: z.array(z.string()).min(1).default(["/lookbook/look-01.jpg"]),
  isPreDesigned: z.boolean().default(true),
  frontDecalUrl: z.string().nullable().optional(),
  backDecalUrl: z.string().nullable().optional(),
});

/** PATCH /api/admin/catalog — ubah stok/harga/status varian (admin only). */
export async function PATCH(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cat:ip:${getClientIp(req)}`, 60, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });
  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { variantId, stockQty, delta, priceIdr, isActive } = parsed.data;
  const set: Record<string, unknown> = {};
  if (priceIdr !== undefined) set.priceIdr = priceIdr;
  if (isActive !== undefined) set.isActive = isActive;
  if (stockQty !== undefined && delta === undefined) set.stockQty = stockQty;
  // Jalur delta (disukai): hitung dari stok DB terkini agar dua admin
  // yang menekan +/- bersamaan tidak saling menimpa (anti lost-update).
  if (delta !== undefined) {
    const current = await db.query.ProductVariant.findFirst({
      where: (t, { eq: eqq }) => eqq(t.id, variantId),
      columns: { stockQty: true },
    });
    if (!current) return NextResponse.json({ error: "Varian tidak ditemukan" }, { status: 404 });
    set.stockQty = Math.max(0, Math.min(100000, (current.stockQty ?? 0) + delta));
  }
  if (Object.keys(set).length === 0) return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  await db.update(ProductVariant).set(set).where(eq(ProductVariant.id, variantId));
  return NextResponse.json({ success: true });
}

/** POST /api/admin/catalog — tambah produk varian baru ke katalog & etalase (admin only). */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cat-post:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });
  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input produk tidak valid" }, { status: 400 });
  }

  const {
    categoryId,
    sku: customSku,
    name,
    colorHex,
    colorName,
    size,
    priceIdr,
    stockQty,
    images,
    isPreDesigned,
    frontDecalUrl,
    backDecalUrl,
  } = parsed.data;

  // Verifikasi kategori ada
  const cat = await db.query.ApparelCategory.findFirst({
    where: (t, { eq }) => eq(t.id, categoryId),
  });
  if (!cat) {
    return NextResponse.json({ error: "Kategori pakaian tidak ditemukan" }, { status: 404 });
  }

  // Generate unique SKU bila tidak diisi manual
  const skuPrefix = cat.slug.toUpperCase().slice(0, 3);
  const colorPrefix = colorName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3) || "CLR";
  const sku = customSku?.trim() || `${skuPrefix}-${colorPrefix}-${size.toUpperCase()}-${nanoid(4).toUpperCase()}`;

  // Pastikan SKU unik
  const existing = await db.query.ProductVariant.findFirst({
    where: (t, { eq }) => eq(t.sku, sku),
  });
  if (existing) {
    return NextResponse.json({ error: `SKU '${sku}' sudah ada. Gunakan SKU lain.` }, { status: 409 });
  }

  const variantId = `prod_${nanoid(16)}`;

  const [created] = await db
    .insert(ProductVariant)
    .values({
      id: variantId,
      categoryId,
      sku,
      name,
      colorHex,
      colorName,
      size: size.toUpperCase(),
      priceIdr,
      stockQty,
      images: JSON.stringify(images),
      frontDecalUrl: frontDecalUrl || null,
      backDecalUrl: backDecalUrl || null,
      isPreDesigned,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ success: true, variant: created });
}

/** DELETE /api/admin/catalog — nonaktifkan varian produk (admin only). */
export async function DELETE(req: NextRequest) {
  // Limiter khusus DELETE (aksi destruktif) — sejajar POST 30/mnt.
  const rl = await checkRateLimitAsync(`admin-cat-del:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID varian diperlukan" }, { status: 400 });

  // 404 bila row hilang — tanpa ini client tak bisa bedakan "sudah
  // nonaktif/tak ada" dari sukses (silent-noop menutupi ID salah/enumerasi).
  const existing = await db.query.ProductVariant.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    columns: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Varian tidak ditemukan" }, { status: 404 });
  await db.update(ProductVariant).set({ isActive: false }).where(eq(ProductVariant.id, id));
  return NextResponse.json({ success: true, message: "Produk berhasil dinonaktifkan dari katalog" });
}
