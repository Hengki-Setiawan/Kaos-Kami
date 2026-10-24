import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sniffImageMime, uploadToR2, uploadBase64ToR2 } from "@/lib/r2";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB per screenshot kendala
const MAX_REQUEST_BYTES = 8 * 1024 * 1024; // base64 + overhead multipart
const GUEST_ID_RE = /^guest_[a-z0-9]{8,32}$/;

function safeExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const user = session?.user;
    const ip = getClientIp(req);

    const contentType = req.headers.get("content-type") || "";
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Berkas terlalu besar." }, { status: 413 });
    }

    let guestId: string | null = null;
    let imageBase64: string | null = null;
    let fileBuffer: Buffer | null = null;
    let fileMime = "";
    let hp = "";

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      guestId = typeof body?.guestId === "string" ? body.guestId.trim() : null;
      imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : null;
      hp = typeof body?.website_hp === "string" ? body.website_hp : "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      guestId = formData.get("guestId") as string | null;
      hp = (formData.get("website_hp") as string) || "";
      const file = formData.get("file") as File | null;
      if (file) {
        fileMime = file.type;
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }
    }

    // 1. Honeypot check (anti-bot senyap)
    if (hp && hp.trim().length > 0) {
      return NextResponse.json({ success: true, url: "/placeholder-shield.png" });
    }

    if (guestId) {
      const cleanGuest = guestId.trim().toLowerCase();
      guestId = GUEST_ID_RE.test(cleanGuest) ? cleanGuest : null;
    }

    const effectiveId = user?.id || guestId || `ip_${ip.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // 2. Rate limiting ketat: maks 5 upload screenshot per menit
    const rl = await checkRateLimitAsync(`chat:upload:${effectiveId}`, 5, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { error: "Batas 5 upload gambar per menit tercapai. Mohon tunggu beberapa detik." },
        { status: 429, headers: rateLimitHeaders(rl, 5) }
      );
    }

    // 3. Validasi & ekstrak konten
    let finalBuffer: Buffer;
    let finalMime: string;

    if (imageBase64) {
      if (imageBase64.length > 6_000_000) {
        return NextResponse.json({ error: "Berkas terlalu besar." }, { status: 413 });
      }
      if (!imageBase64.startsWith("data:")) {
        return NextResponse.json({ error: "Format gambar base64 tidak valid." }, { status: 400 });
      }
      finalMime = imageBase64.slice(5, imageBase64.indexOf(";"));
      if (!(ALLOWED_MIME as readonly string[]).includes(finalMime)) {
        return NextResponse.json({ error: "Hanya file JPG, PNG, atau WebP yang diperbolehkan." }, { status: 400 });
      }
      const b64Data = imageBase64.split(",")[1] || "";
      finalBuffer = Buffer.from(b64Data, "base64");
    } else if (fileBuffer) {
      finalBuffer = fileBuffer;
      finalMime = fileMime;
      if (!(ALLOWED_MIME as readonly string[]).includes(finalMime)) {
        return NextResponse.json({ error: "Hanya file JPG, PNG, atau WebP yang diperbolehkan." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Berkas gambar belum dipilih." }, { status: 400 });
    }

    if (finalBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran gambar maksimal 3MB." }, { status: 400 });
    }

    // Magic bytes verification: MIME final mengikuti isi berkas, bukan
    // Content-Type kiriman klien (cegah mismatch ekstensi/tipe).
    const sniffed = sniffImageMime(finalBuffer.subarray(0, 32));
    if (!sniffed) {
      return NextResponse.json({ error: "Isi berkas bukan format gambar yang valid." }, { status: 400 });
    }
    finalMime = sniffed;

    // 4. Upload ke Cloudflare R2
    const cleanId = effectiveId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const key = `chat_reports/${cleanId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${safeExt(finalMime)}`;

    const r2Result = await uploadToR2(key, finalBuffer, finalMime);
    if (r2Result.success && r2Result.url) {
      return NextResponse.json({
        success: true,
        url: r2Result.url,
        key: r2Result.key,
      });
    }

    // Fallback: Jika R2 offline / unconfigured, kompresi/simpan data URI jika ukuran wajar
    if (finalBuffer.byteLength <= 1.5 * 1024 * 1024) {
      const dataUri = `data:${finalMime};base64,${finalBuffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        url: dataUri,
        key: `local_${Date.now()}`,
      });
    }

    return NextResponse.json(
      { error: r2Result.error || "Gagal mengunggah gambar bukti. Silakan coba lagi." },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Terjadi kesalahan saat memproses gambar." }, { status: 500 });
  }
}
