import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ProductVariant } from "@/lib/drizzle-schema";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const PatchSchema = z.object({
  variantId: z.string().min(1),
  stockQty: z.number().int().min(0).max(100000).optional(),
  priceIdr: z.number().int().min(0).max(100_000_000).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/admin/catalog — ubah stok/harga/status varian (admin only). */
export async function PATCH(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cat:ip:${getClientIp(req)}`, 60, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 60) });
  try {
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: khusus admin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { variantId, stockQty, priceIdr, isActive } = parsed.data;
  const set: Record<string, unknown> = {};
  if (stockQty !== undefined) set.stockQty = stockQty;
  if (priceIdr !== undefined) set.priceIdr = priceIdr;
  if (isActive !== undefined) set.isActive = isActive;
  if (Object.keys(set).length === 0) return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  await db.update(ProductVariant).set(set).where(eq(ProductVariant.id, variantId));
  return NextResponse.json({ success: true });
}

// ------------------------------------------------------------------
// SENGAJA READ-ONLY selain PATCH di atas: pembuatan/penghapusan varian
// (POST/DELETE) TIDAK dibuka via API — varian dikelola via seed/Studio
// agar SKU unik + relasi kategori tak rusak dari request liar. 405 di
// bawah ini JUJUR (bukan 404 palsu) agar integrasi tahu method tak didukung.
// Bila butuh CRUD varian penuh, tambahkan POST/DELETE dengan validasi
// categoryId+sku+size+priceIdr di sini.
// ------------------------------------------------------------------

/** POST /api/admin/catalog — tidak didukung (read-only selain PATCH). */
export async function POST() {
  return NextResponse.json(
    { error: "Method tidak didukung: pembuatan varian via seed/Studio (gunakan PATCH untuk stok/harga/status)" },
    { status: 405, headers: { Allow: "PATCH" } }
  );
}

/** DELETE /api/admin/catalog — tidak didukung (nonaktifkan via PATCH isActive:false). */
export async function DELETE() {
  return NextResponse.json(
    { error: "Method tidak didukung: hapus varian via seed/Studio (gunakan PATCH isActive:false untuk nonaktifkan)" },
    { status: 405, headers: { Allow: "PATCH" } }
  );
}
