import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ProductionTask, QcInspection } from "@/lib/drizzle-schema";
import {
  checkRateLimitAsync,
  getClientIp,
  rateLimitHeaders,
} from "@/lib/security/rateLimiter";

// Standar enterprise cermin route tetangga
// (admin/production-tasks): RBAC ADMIN/SUPER_ADMIN/PRODUCTION_STAFF +
// rate-limit + fail-closed (anon/error auth SELALU 401, tak pernah lolos).
const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"] as const;
const QC_LIMIT_PER_MINUTE = 30;

const QC_DEFECTS = ["LUBANG", "NODA", "MISPRINT", "CRACKING"] as const;

const postSchema = z.object({
  orderId: z.string().min(1, "orderId wajib diisi"),
  productionTaskId: z.string().min(1).optional(),
  photoUrl: z
    .string()
    .url("photoUrl harus URL valid")
    .refine((u) => u.startsWith("https://"), "photoUrl wajib https"),
  grazingDeg: z
    .union([z.literal(15), z.literal(30), z.literal(45), z.literal(90)])
    .optional(),
  luxEstimate: z.number().int().min(0).max(100000).optional(),
  side: z.string().max(20).optional(),
  checks: z.array(z.enum(QC_DEFECTS)).default([]),
  note: z.string().max(500, "Catatan maks 500 karakter").optional(),
});

async function requireStaff(): Promise<
  | { user: { id: string; role: string } }
  | { response: NextResponse }
> {
  try {
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) {
      return {
        response: NextResponse.json(
          { success: false, error: "Unauthorized: silakan login" },
          { status: 401 },
        ),
      };
    }
    if (!(STAFF_ROLES as readonly string[]).includes(role)) {
      return {
        response: NextResponse.json(
          { success: false, error: "Forbidden: khusus tim workshop" },
          { status: 403 },
        ),
      };
    }
    return {
      user: { id: (session.user as any).id, role },
    };
  } catch {
    // Fail-closed: error auth = tolak, jangan lolos.
    return {
      response: NextResponse.json(
        { success: false, error: "Unauthorized: silakan login" },
        { status: 401 },
      ),
    };
  }
}

function rateLimited(ip: string) {
  return checkRateLimitAsync(
    `qc-inspections:ip:${ip}`,
    QC_LIMIT_PER_MINUTE,
    60,
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimited(ip);
    if (rl.isLimited) {
      return NextResponse.json(
        { success: false, error: "Rate limited" },
        { status: 429, headers: rateLimitHeaders(rl, QC_LIMIT_PER_MINUTE) },
      );
    }

    const gate = await requireStaff();
    if ("response" in gate) return gate.response;

    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "Input tidak valid",
        },
        { status: 400 },
      );
    }
    const d = parsed.data;

    // Validasi silang: productionTaskId (bila diisi) WAJIB milik orderId yang
    // sama — cegah jejak QC menempel ke order yang salah. Tak ada task = 404,
    // milik order lain = 400.
    const crossTaskId = d.productionTaskId;
    if (crossTaskId) {
      const task = await db.query.ProductionTask.findFirst({
        where: (t, { eq }) => eq(t.id, crossTaskId),
        columns: { id: true, orderId: true },
      });
      if (!task) {
        return NextResponse.json(
          { success: false, error: "Production task tidak ditemukan" },
          { status: 404 },
        );
      }
      if (task.orderId !== d.orderId) {
        return NextResponse.json(
          { success: false, error: "productionTaskId bukan milik orderId tersebut" },
          { status: 400 },
        );
      }
    }

    const row = {
      id: nanoid(),
      orderId: d.orderId,
      productionTaskId: d.productionTaskId ?? null,
      photoUrl: d.photoUrl,
      grazingDeg: d.grazingDeg ?? null,
      luxEstimate: d.luxEstimate ?? null,
      side: d.side ?? null,
      checksJson: JSON.stringify(d.checks),
      note: d.note ?? null,
      createdByUserId: gate.user.id,
      createdAt: new Date(),
    };
    await db.insert(QcInspection).values(row);

    // SKIP WA: notifikasi QC tidak dikirim agar checkout/produksi tak
    // bergantung pada kuota Fonnte (fail-safe: tanpa side-effect = tanpa gagal).
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error("QC inspections POST error:", error?.message);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan inspeksi QC" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimited(ip);
    if (rl.isLimited) {
      return NextResponse.json(
        { success: false, error: "Rate limited" },
        { status: 429, headers: rateLimitHeaders(rl, QC_LIMIT_PER_MINUTE) },
      );
    }

    const gate = await requireStaff();
    if ("response" in gate) return gate.response;

    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId wajib diisi" },
        { status: 400 },
      );
    }

    const rows = await db.query.QcInspection.findMany({
      where: (t, { eq }) => eq(t.orderId, orderId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 50,
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("QC inspections GET error:", error?.message);
    return NextResponse.json(
      { success: false, error: "Gagal memuat jejak QC" },
      { status: 500 },
    );
  }
}
