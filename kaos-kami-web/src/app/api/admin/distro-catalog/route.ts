import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { CatalogProduct } from "@/lib/drizzle-schema";
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

const CreateCatalogProductSchema = z.object({
  name: z.string().min(2, "Nama produk minimal 2 karakter").max(150),
  slug: z.string().min(2).max(100).optional(),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"]).default("tshirt"),
  basePriceIdr: z.number().int().min(1000).max(100_000_000),
  images: z.array(z.string()).min(1, "Minimal 1 foto produk").default(["/products/tshirt-orange-makassar.jpg"]),
  sizes: z.array(z.string()).min(1, "Minimal 1 ukuran tersedia").default(["S", "M", "L", "XL", "XXL"]),
  tags: z.union([z.array(z.string()), z.record(z.any()), z.string()]).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const PatchCatalogProductSchema = z.object({
  id: z.string().min(1, "ID produk wajib diisi"),
  name: z.string().min(2).max(150).optional(),
  slug: z.string().min(2).max(100).optional(),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt", "cap", "pants", "shorts"]).optional(),
  basePriceIdr: z.number().int().min(1000).max(100_000_000).optional(),
  images: z.array(z.string()).min(1).optional(),
  sizes: z.array(z.string()).min(1).optional(),
  tags: z.union([z.array(z.string()), z.record(z.any()), z.string()]).optional().nullable(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/** GET /api/admin/distro-catalog — Ambil semua produk jadi e-commerce (admin) */
export async function GET(req: NextRequest) {
  try {
    await assertAdminSession();
    const products = await db
      .select()
      .from(CatalogProduct)
      .orderBy(asc(CatalogProduct.sortOrder), desc(CatalogProduct.createdAt));

    return NextResponse.json({ success: true, products });
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : e.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

/** POST /api/admin/distro-catalog — Tambah produk jadi distro baru (admin) */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-distro-post:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });

  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateCatalogProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
  }

  const { name, tagline, description, apparelSlug, basePriceIdr, images, sizes, tags, isFeatured, isActive, sortOrder } = parsed.data;

  // Generate slug unik bila tidak diberikan
  let slug = parsed.data.slug?.trim() || "";
  if (!slug) {
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    // Tambahkan postfix singkat jika sudah ada
    const existing = await db.query.CatalogProduct.findFirst({ where: (t, { eq: eqq }) => eqq(t.slug, slug) });
    if (existing) {
      slug = `${slug}-${nanoid(4).toLowerCase()}`;
    }
  }

  const newId = `catprod_${nanoid(12)}`;

  const [created] = await db
    .insert(CatalogProduct)
    .values({
      id: newId,
      slug,
      name: name.trim(),
      tagline: tagline?.trim() || null,
      description: description?.trim() || null,
      apparelSlug,
      basePriceIdr,
      images: JSON.stringify(images),
      sizes: JSON.stringify(sizes),
      tags: tags ? (typeof tags === "string" ? tags : JSON.stringify(tags)) : null,
      isFeatured,
      isActive,
      sortOrder,
    })
    .returning();

  return NextResponse.json({ success: true, product: created });
}

/** PATCH /api/admin/distro-catalog — Update produk jadi distro (admin) */
export async function PATCH(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-distro-patch:ip:${getClientIp(req)}`, 60, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });

  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchCatalogProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
  }

  const { id, name, slug, tagline, description, apparelSlug, basePriceIdr, images, sizes, tags, isFeatured, isActive, sortOrder } = parsed.data;

  const existing = await db.query.CatalogProduct.findFirst({ where: (t, { eq: eqq }) => eqq(t.id, id) });
  if (!existing) return NextResponse.json({ error: "Produk distro tidak ditemukan" }, { status: 404 });

  const set: Record<string, unknown> = {};
  if (name !== undefined) set.name = name.trim();
  if (slug !== undefined) set.slug = slug.trim().toLowerCase();
  if (tagline !== undefined) set.tagline = tagline ? tagline.trim() : null;
  if (description !== undefined) set.description = description ? description.trim() : null;
  if (apparelSlug !== undefined) set.apparelSlug = apparelSlug;
  if (basePriceIdr !== undefined) set.basePriceIdr = basePriceIdr;
  if (images !== undefined) set.images = JSON.stringify(images);
  if (sizes !== undefined) set.sizes = JSON.stringify(sizes);
  if (tags !== undefined) set.tags = tags ? (typeof tags === "string" ? tags : JSON.stringify(tags)) : null;
  if (isFeatured !== undefined) set.isFeatured = isFeatured;
  if (isActive !== undefined) set.isActive = isActive;
  if (sortOrder !== undefined) set.sortOrder = sortOrder;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
  }

  await db.update(CatalogProduct).set(set).where(eq(CatalogProduct.id, id));
  return NextResponse.json({ success: true, message: "Produk berhasil diperbarui" });
}

/** DELETE /api/admin/distro-catalog — Hapus produk jadi distro (admin) */
export async function DELETE(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-distro-del:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });

  try {
    await assertAdminSession();
  } catch (e: any) {
    const status = e.message.includes("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID produk distro diperlukan" }, { status: 400 });

  const existing = await db.query.CatalogProduct.findFirst({ where: (t, { eq: eqq }) => eqq(t.id, id) });
  if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

  await db.delete(CatalogProduct).where(eq(CatalogProduct.id, id));
  return NextResponse.json({ success: true, message: "Produk distro berhasil dihapus" });
}
