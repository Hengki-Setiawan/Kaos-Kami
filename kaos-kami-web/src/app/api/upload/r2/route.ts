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
      const { imageBase64 } = await req.json();
      if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:")) {
        return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
      }
      const mime = imageBase64.slice(5, imageBase64.indexOf(";"));
      if (!(ALLOWED_IMAGE as readonly string[]).includes(mime)) {
        return NextResponse.json({ error: `MIME ${mime || "?"} not allowed (png/jpg/webp)` }, { status: 400 });
      }
      const b64 = imageBase64.split(",")[1] || "";
      if (Buffer.byteLength(b64, "base64") > MAX_BYTES) {
        return NextResponse.json({ error: "File >10MB" }, { status: 400 });
      }
      // Magic-byte: isi harus gambar betulan (bukan script ganti baju).
      const probe = Buffer.from(b64.slice(0, 32), "base64");
      if (!sniffImageMime(probe)) {
        return NextResponse.json({ error: "Isi file bukan gambar valid" }, { status: 400 });
      }
      // Key SELALU dari server (user-scoped) — client tidak boleh menentukan path.
      const r2Key = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${safeExt(mime)}`;
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

    let buffer = Buffer.from(await file.arrayBuffer());
    if (!sniffImageMime(buffer.subarray(0, 32))) {
      return NextResponse.json({ error: "Isi file bukan gambar valid" }, { status: 400 });
    }
    // Sharp re-encode: resize max 1200, webp/png, strip metadata (10MB guard)
    try {
      const sharp = (await import("sharp")).default;
      const image = sharp(buffer);
      const meta = await image.metadata();
      if ((meta.width || 0) > 1200 || (meta.height || 0) > 1200) {
        image.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true });
      }
      // Re-encode to webp for 90% saving, or keep png if transparency
      if (file.type === "image/png") {
        buffer = await image.png({ compressionLevel: 8 }).toBuffer();
      } else {
        buffer = await image.webp({ quality: 85 }).toBuffer();
      }
    } catch (e) {
      console.warn("Sharp re-encode skip", e);
    }
    const result = await uploadToR2(key, buffer, file.type.includes("png") ? "image/png" : "image/webp");

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: result.url, key: result.key });
  } catch (e: any) {
    console.error("R2 upload error", e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
