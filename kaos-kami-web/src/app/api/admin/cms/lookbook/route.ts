import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { deleteFromR2, getR2PublicUrl, listR2Objects, sniffImageMime, uploadToR2 } from "@/lib/r2";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

// CMS Lookbook R2 (admin): list + upload + hapus di prefix lookbook/.
// Key SELALU dari server (prefix terkunci) — client tak boleh tentukan path.

const PREFIX = "lookbook/";
const MAX_BYTES = 5 * 1024 * 1024;

async function requireAdmin(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cms:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited)
    return { error: NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) }) };
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return { error: NextResponse.json({ error: "Forbidden: khusus admin" }, { status: 403 }) };
    }
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {};
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const list = await listR2Objects(PREFIX);
  if (!list.success) return NextResponse.json({ error: list.error || "Gagal list R2" }, { status: 502 });
  return NextResponse.json({
    items: list.keys.map((key) => ({ key, url: getR2PublicUrl(key) })),
  });
}

const UploadSchema = z.object({
  // dataURL base64 (dipilih karena upload route existing pakai pola sama).
  imageBase64: z.string().min(100).max(MAX_BYTES * 2),
  ext: z.enum(["jpg", "jpeg", "png", "webp"]).default("jpg"),
});

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const parsed = UploadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
  const match = parsed.data.imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "Format dataURL salah" }, { status: 400 });
  const buffer = Buffer.from(match[2]!, "base64");
  if (buffer.length > MAX_BYTES) return NextResponse.json({ error: "Maksimal 5MB" }, { status: 400 });
  const mime = sniffImageMime(buffer);
  if (!mime) return NextResponse.json({ error: "Bukan file gambar (PNG/JPEG/WebP)" }, { status: 400 });
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const key = `${PREFIX}${Date.now()}-${nanoid(6)}.${ext}`;
  const up = await uploadToR2(key, buffer, mime);
  if (!up.success) return NextResponse.json({ error: up.error || "Upload gagal" }, { status: 502 });
  return NextResponse.json({ item: { key, url: getR2PublicUrl(key) } }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate.error) return gate.error;
  const key = new URL(req.url).searchParams.get("key") || "";
  // Kunci prefix: cegah hapus file di luar lookbook/ (path traversal).
  if (!key.startsWith(PREFIX) || key.includes("..") || key === PREFIX) {
    return NextResponse.json({ error: "Key tidak valid" }, { status: 400 });
  }
  const del = await deleteFromR2(key);
  if (!del.success) return NextResponse.json({ error: del.error || "Hapus gagal" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
