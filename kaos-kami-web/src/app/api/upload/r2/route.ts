import { NextRequest, NextResponse } from "next/server";
import { sniffImageMime, uploadToR2, uploadBase64ToR2 } from "@/lib/r2";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_BYTES = 10 * 1024 * 1024;

function safeExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

// Kuota harian per-user: 50 file / 200MB (best-effort anti-abuse, BUKAN
// billing-grade: backend limiter memory-per-isolate + KV fail-open —
// lihat rateLimiter.ts. Dipanggil SETELAH validasi MIME/ukuran lolos agar
// request invalid tak memakan kuota; limiter IP 10/mnt tetap jadi tameng awal.
async function checkUploadQuota(userId: string, bytes: number) {
  const count = await checkRateLimitAsync(`upload:user:${userId}:count`, 50, 86400);
  if (count.isLimited) {
    return NextResponse.json(
      { error: "Kuota upload harian habis (50 file/hari). Coba lagi besok." },
      { status: 429, headers: rateLimitHeaders(count, 50) }
    );
  }
  const mb = Math.max(1, Math.ceil(bytes / (1024 * 1024)));
  for (let i = 0; i < mb; i++) {
    const usage = await checkRateLimitAsync(`upload:user:${userId}:mb`, 200, 86400);
    if (usage.isLimited) {
      return NextResponse.json(
        { error: "Kuota 200MB/hari habis. Coba lagi besok." },
        { status: 429, headers: rateLimitHeaders(usage, 200) }
      );
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Wajib login — endpoint publik tanpa auth = penimbunan bucket oleh asing.
    const user = await getAuthenticatedUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const rl = await checkRateLimitAsync(`upload:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak upload." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }

    const contentType = req.headers.get("content-type") || "";

    // JSON base64 mode — validasi sama ketatnya dengan multipart.
    if (contentType.includes("application/json")) {
      const { imageBase64, kind } = await req.json();
      if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:")) {
        return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
      }
      const mime = imageBase64.slice(5, imageBase64.indexOf(";"));
      if (!(ALLOWED_IMAGE as readonly string[]).includes(mime)) {
        return NextResponse.json({ error: `MIME ${mime || "?"} not allowed (png/jpg/webp)` }, { status: 400 });
      }
      const b64 = imageBase64.split(",")[1] || "";
      const byteLen = Buffer.byteLength(b64, "base64");
      if (byteLen > MAX_BYTES) {
        return NextResponse.json({ error: "File >10MB" }, { status: 400 });
      }
      // Magic-byte: isi harus gambar betulan (bukan script ganti baju).
      const probe = Buffer.from(b64.slice(0, 32), "base64");
      if (!sniffImageMime(probe)) {
        return NextResponse.json({ error: "Isi file bukan gambar valid" }, { status: 400 });
      }
      const overQuota = await checkUploadQuota(user.id, byteLen);
      if (overQuota) return overQuota;
      // Key SELALU dari server (user-scoped) — client tidak boleh menentukan path.
      // kind "master" (ekspor 300 DPI studio) → prefix masters/, selain itu uploads/.
      const prefix = kind === "master" ? `masters/${user.id}` : `uploads/${user.id}`;
      const r2Key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${safeExt(mime)}`;
      const result = await uploadBase64ToR2(imageBase64, r2Key);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, url: result.url, key: result.key });
    }

    // Multipart form-data mode
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Validate MIME — SVG ditolak (bisa sisipkan script/XSS saat diserve publik).
    if (!(ALLOWED_IMAGE as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: `MIME ${file.type} not allowed (png/jpg/webp)` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File >10MB" }, { status: 400 });
    }
    const key = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${safeExt(file.type)}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!sniffImageMime(buffer.subarray(0, 32))) {
      return NextResponse.json({ error: "Isi file bukan gambar valid" }, { status: 400 });
    }
    const overQuota = await checkUploadQuota(user.id, buffer.byteLength);
    if (overQuota) return overQuota;
    // TANPA sharp (Sep 2026): resize/kompres WAJIB di browser SEBELUM upload
    // via compressImageClient (preview max 1200px / master max 3000px, format
    // adaptif webp/png/jpeg) — pemanggil: CustomizerDrawer, PatternStudio,
    // imageEditPipeline.uploadMasterDataUrlToR2, gangExport. Server hanya
    // validasi (MIME/magic-byte/10MB) + teruskan bytes apa adanya agar Worker
    // tetap lean (<1.2MB, jauh dari limit 3MB Cloudflare) dan tanpa dependensi
    // native. MIME dipertahankan asli (jangan label ulang webp bila bytes jpg).
    const result = await uploadToR2(key, buffer, file.type);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: result.url, key: result.key });
  } catch (e: any) {
    console.error("R2 upload error", e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
