import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { Address } from "@/lib/drizzle-schema";
import { getAuthenticatedUser } from "@/lib/security/authGuard";

/** DELETE /api/addresses — hapus alamat milik sendiri. */
export async function DELETE(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (!viewer) return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    const { id } = z.object({ id: z.string().min(1) }).parse(await req.json().catch(() => ({})));
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
        { error: "Alamat masih dipakai order — tidak bisa dihapus" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
