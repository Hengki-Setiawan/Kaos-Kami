import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Address } from "@/lib/drizzle-schema";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { normalizePhoneId } from "@/lib/phone";

const AddressPayloadSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Label alamat wajib diisi").max(50).default("Rumah"),
  recipientName: z.string().min(2, "Nama penerima minimal 2 karakter").max(100),
  phoneNumber: z.string().min(9, "Nomor telepon minimal 9 digit").max(20),
  province: z.string().max(100).default("Sulawesi Selatan"),
  city: z.string().max(100).default("Makassar"),
  district: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  fullAddress: z.string().min(5, "Alamat lengkap minimal 5 karakter").max(500),
  notes: z.string().max(300).optional().nullable(),
  isDefault: z.boolean().default(false),
});

/**
 * GET /api/addresses
 * Mengambil seluruh daftar alamat milik user saat ini
 */
export async function GET(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }

    const addresses = await db.query.Address.findMany({
      where: (t, { eq }) => eq(t.userId, viewer.id),
      orderBy: (t, { desc }) => [desc(t.isDefault), desc(t.createdAt)],
      limit: 30,
    });

    return NextResponse.json({ success: true, addresses });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/addresses
 * Menambahkan alamat baru
 */
export async function POST(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = AddressPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data alamat tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const cleanPhone = normalizePhoneId(data.phoneNumber);

    // Cek apakah ini alamat pertama (jika ya, otomatis jadikan default)
    const existingCount = await db.query.Address.findMany({
      where: (t, { eq }) => eq(t.userId, viewer.id),
      columns: { id: true },
    });
    const makeDefault = data.isDefault || existingCount.length === 0;

    if (makeDefault) {
      // Nonaktifkan default pada alamat lain milik user
      await db.update(Address).set({ isDefault: false }).where(eq(Address.userId, viewer.id));
    }

    const newId = nanoid();
    await db.insert(Address).values({
      id: newId,
      userId: viewer.id,
      label: data.label.trim(),
      recipientName: data.recipientName.trim(),
      phoneNumber: cleanPhone,
      province: data.province?.trim() || "Sulawesi Selatan",
      city: data.city?.trim() || "Makassar",
      district: data.district?.trim() || null,
      postalCode: data.postalCode?.trim() || null,
      fullAddress: data.fullAddress.trim(),
      notes: data.notes?.trim() || null,
      isDefault: makeDefault,
    });

    const saved = await db.query.Address.findFirst({
      where: (t, { eq }) => eq(t.id, newId),
    });

    return NextResponse.json({ success: true, address: saved, message: "Alamat berhasil ditambahkan!" });
  } catch (e: any) {
    console.error("[Address API] POST error:", e);
    return NextResponse.json({ error: e?.message || "Gagal menambahkan alamat" }, { status: 500 });
  }
}

/**
 * PUT /api/addresses
 * Memperbarui data alamat atau menyetel sebagai default
 */
export async function PUT(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = AddressPayloadSchema.extend({
      id: z.string().min(1, "ID alamat wajib disertakan"),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data alamat tidak valid" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const targetAddr = await db.query.Address.findFirst({
      where: (t, { eq }) => eq(t.id, data.id),
      columns: { id: true, userId: true },
    });

    if (!targetAddr) {
      return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 });
    }

    const isStaff = ["ADMIN", "SUPER_ADMIN"].includes(viewer.role);
    if (!isStaff && targetAddr.userId !== viewer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (data.isDefault) {
      await db.update(Address).set({ isDefault: false }).where(eq(Address.userId, targetAddr.userId));
    }

    const cleanPhone = normalizePhoneId(data.phoneNumber);

    await db
      .update(Address)
      .set({
        label: data.label.trim(),
        recipientName: data.recipientName.trim(),
        phoneNumber: cleanPhone,
        province: data.province?.trim() || "Sulawesi Selatan",
        city: data.city?.trim() || "Makassar",
        district: data.district?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        fullAddress: data.fullAddress.trim(),
        notes: data.notes?.trim() || null,
        isDefault: data.isDefault,
        updatedAt: new Date(),
      })
      .where(eq(Address.id, data.id));

    const updated = await db.query.Address.findFirst({
      where: (t, { eq }) => eq(t.id, data.id),
    });

    return NextResponse.json({ success: true, address: updated, message: "Alamat berhasil diperbarui!" });
  } catch (e: any) {
    console.error("[Address API] PUT error:", e);
    return NextResponse.json({ error: e?.message || "Gagal memperbarui alamat" }, { status: 500 });
  }
}

/**
 * DELETE /api/addresses
 * Hapus alamat milik sendiri
 */
export async function DELETE(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    const parsed = z.object({ id: z.string().min(1).max(64) }).safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "ID alamat tidak valid" }, { status: 400 });
    const { id } = parsed.data;
    const addr = await db.query.Address.findFirst({
      where: (t, { eq }) => eq(t.id, id),
      columns: { id: true, userId: true },
    });
    if (!addr) return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 });
    const isStaff = ["ADMIN", "SUPER_ADMIN"].includes(viewer.role);
    if (!isStaff && addr.userId !== viewer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      await db.delete(Address).where(and(eq(Address.id, id), eq(Address.userId, addr.userId)));
    } catch {
      return NextResponse.json(
        { error: "Alamat masih dipakai pesanan aktif — tidak bisa dihapus" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, message: "Alamat berhasil dihapus" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
