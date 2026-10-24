import { NextRequest, NextResponse } from "next/server";
import { isDevOrTest } from "@/lib/envMode";
import { checkRateLimitAsync, getClientIp } from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

// 1x1 transparent PNG fallback jika gagal fetch
const TRANSPARENT_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// SVG sengaja TIDAK diizinkan: saat dibuka langsung, SVG bisa mengeksekusi
// script di origin kita. Semua upload aplikasi hanya PNG/JPEG/WebP.
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function fallback(cache = "public, max-age=3600") {
  return new NextResponse(TRANSPARENT_1X1_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": cache,
    },
  });
}

/**
 * SSRF guard: proxy HANYA untuk host aset Kaos Kami (R2 publik + origin situs).
 * Sebelumnya URL https/http apa pun diterima → endpoint publik bisa dipakai
 * membaca jaringan internal / metadata cloud dan menimbun bandwidth.
 */
function isAllowedProxyUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const dev = isDevOrTest();
    if (u.protocol !== "https:" && !(dev && u.protocol === "http:")) return false;
    if (u.username || u.password) return false;

    const allowedHosts = new Set<string>();
    for (const envUrl of [process.env.R2_PUBLIC_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
      if (!envUrl) continue;
      try {
        allowedHosts.add(new URL(envUrl).host.toLowerCase());
      } catch {
        // env rusak → jangan tambah host apa pun
      }
    }
    if (dev) {
      allowedHosts.add("localhost:3000");
      allowedHosts.add("127.0.0.1:3000");
    }
    return allowedHosts.has(u.host.toLowerCase());
  } catch {
    return false;
  }
}

async function readCapped(res: Response): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) return null;
  if (!res.body) {
    const buf = await res.arrayBuffer();
    return buf.byteLength > MAX_IMAGE_BYTES ? null : new Uint8Array(buf);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`proxy-image:ip:${getClientIp(req)}`, 60, 60);
    if (rl.isLimited) return fallback("public, max-age=60");

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl || !isAllowedProxyUrl(targetUrl)) {
      return fallback();
    }

    const res = await fetch(targetUrl, {
      headers: {
        Accept: "image/webp,image/png,image/jpeg,image/*;q=0.8",
      },
      // Jangan menggantung saat host aset lambat.
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return fallback();

    const contentType = ((res.headers.get("content-type") || "").split(";")[0] ?? "")
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return fallback();

    const bytes = await readCapped(res);
    if (!bytes) return fallback();

    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return fallback();
  }
}

export async function HEAD(req: NextRequest) {
  return GET(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
