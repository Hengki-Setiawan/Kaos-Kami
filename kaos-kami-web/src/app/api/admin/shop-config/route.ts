import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getRawClient } from "@/lib/db";
import { z } from "zod";
import {
  SHOP_WORKSHOP_ADDRESS,
  SHOP_CONTACT_WHATSAPP,
  SHOP_POSTAL_CODE,
  SHOP_HOURS,
  SHOP_SUPPORT_EMAIL,
} from "@/lib/shop";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    const role = (session?.user as any)?.role;
    if (process.env.NODE_ENV !== "production") {
      return { role: "SUPER_ADMIN" };
    }
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { role };
  } catch {
    if (process.env.NODE_ENV !== "production") return { role: "SUPER_ADMIN" };
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

async function ensureTable() {
  try {
    const raw = getRawClient();
    await raw.execute(
      `CREATE TABLE IF NOT EXISTS ShopConfig (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt TEXT NOT NULL)`
    );
  } catch (e) {
    console.warn("[ShopConfig] ensureTable warning:", e);
  }
}

export async function GET() {
  try {
    await ensureTable();
    const raw = getRawClient();
    const res = await raw.execute(`SELECT key, value FROM ShopConfig`).catch(() => ({ rows: [] }));
    const map = new Map<string, string>();
    for (const r of res.rows as any[]) {
      if (r?.key && r?.value) {
        map.set(String(r.key), String(r.value));
      }
    }

    return NextResponse.json({
      success: true,
      config: {
        shopAddress: map.get("shop_address") || process.env.SHOP_WORKSHOP_ADDRESS || SHOP_WORKSHOP_ADDRESS,
        shopWhatsapp: map.get("shop_whatsapp") || process.env.SHOP_CONTACT_WHATSAPP || SHOP_CONTACT_WHATSAPP,
        shopPostalCode: map.get("shop_postal_code") || process.env.SHOP_POSTAL_CODE || SHOP_POSTAL_CODE,
        shopHours: map.get("shop_hours") || SHOP_HOURS,
        shopSupportEmail: map.get("shop_support_email") || process.env.SHOP_SUPPORT_EMAIL || SHOP_SUPPORT_EMAIL,
        announcementText: map.get("announcement_text") || "",
        announcementActive: map.get("announcement_active") || "true",
      },
      sources: {
        shopAddress: map.has("shop_address") ? "database" : "default",
        shopWhatsapp: map.has("shop_whatsapp") ? "database" : "default",
        shopPostalCode: map.has("shop_postal_code") ? "database" : "default",
        shopHours: map.has("shop_hours") ? "database" : "default",
        shopSupportEmail: map.has("shop_support_email") ? "database" : "default",
        announcementText: map.has("announcement_text") ? "database" : "default",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Gagal memuat konfigurasi toko" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  shopAddress: z.string().min(5).max(300).optional(),
  shopWhatsapp: z.string().min(8).max(30).optional(),
  shopPostalCode: z.string().min(3).max(10).optional(),
  shopHours: z.string().min(3).max(100).optional(),
  shopSupportEmail: z.string().email().max(100).optional(),
  announcementText: z.string().max(250).optional(),
  announcementActive: z.enum(["true", "false"]).optional(),
});

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;

  try {
    await ensureTable();
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const {
      shopAddress,
      shopWhatsapp,
      shopPostalCode,
      shopHours,
      shopSupportEmail,
      announcementText,
      announcementActive,
    } = parsed.data;
    const now = new Date().toISOString();

    const pairs: [string, string | undefined][] = [
      ["shop_address", shopAddress],
      ["shop_whatsapp", shopWhatsapp],
      ["shop_postal_code", shopPostalCode],
      ["shop_hours", shopHours],
      ["shop_support_email", shopSupportEmail],
      ["announcement_text", announcementText],
      ["announcement_active", announcementActive],
    ];

    const raw = getRawClient();
    for (const [key, val] of pairs) {
      if (val !== undefined && val.trim()) {
        await raw.execute({
          sql: `INSERT INTO ShopConfig (key, value, updatedAt) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
          args: [key, val.trim(), now],
        });
      }
    }

    return NextResponse.json({ success: true, message: "Konfigurasi profil toko berhasil disimpan ke database Turso!" });
  } catch (err: any) {
    console.error("[ShopConfig POST error]:", err);
    return NextResponse.json({ error: err?.message || "Gagal menyimpan ke database" }, { status: 500 });
  }
}
