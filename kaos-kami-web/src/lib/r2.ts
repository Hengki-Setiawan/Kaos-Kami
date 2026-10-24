/**
 * Cloudflare R2 Storage — Zero Egress
 * Bucket: kaos-kami-assets (APAC) | Public: https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev
 * Auth via CLOUDFLARE_API_TOKEN (Bearer) + CLOUDFLARE_ACCOUNT_ID
 * Endpoint: https://api.cloudflare.com/client/v4/accounts/{id}/r2/buckets/{bucket}/objects/{key}
 */
const R2_BUCKET = process.env.R2_BUCKET_NAME || "kaos-kami-assets";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

export function getR2PublicUrl(key: string): string {  // Tanpa R2_PUBLIC_URL, URL publik tidak bisa dibentuk — return key mentah agar
  // caller sadar (jangan karang domain publik).
  if (!R2_PUBLIC_URL) return key.replace(/^\/+/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${cleanKey}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string = "application/octet-stream",
  bucketOverride?: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) {
    // Jangan bocorkan detail misconfig ke client — log rinci server-side saja.
    console.error("[r2] misconfig: CLOUDFLARE_API_TOKEN/ACCOUNT_ID hilang");
    return { success: false, url: "", key, error: "Layanan upload gangguan" };
  }

  // B1-3: backup (PII) WAJIB ke bucket privat terpisah, JANGAN ke bucket aset publik.
  const bucket = bucketOverride || R2_BUCKET;
  if (bucketOverride && R2_BUCKET && bucketOverride === R2_BUCKET) {
    console.error("[r2] tolak upload: bucket backup sama dengan bucket aset publik");
    return {
      success: false,
      url: "",
      key,
      error: "Konfigurasi bucket backup tidak aman (sama dengan bucket publik)",
    };
  }
  const cleanKey = key.replace(/^\/+/, "");
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${bucket}/objects/${encodeURIComponent(cleanKey).replace(/%2F/g, "/")}`;

  try {
    const buffer = typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": contentType,
      },
      body: buffer as any,
      // Upload 4-10MB bisa lambat; batasi agar request tidak menggantung.
      signal: AbortSignal.timeout(25000),
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      return {
        success: false,
        url: "",
        key: cleanKey,
        error: data.errors?.[0]?.message || `R2 upload failed ${res.status}`,
      };
    }

    // Bucket privat (backup): tak ada URL publik — panggil pakai key via API.
    return { success: true, url: bucketOverride ? "" : getR2PublicUrl(cleanKey), key: cleanKey };
  } catch (e: any) {
    return { success: false, url: "", key: cleanKey, error: e?.message || "R2 upload exception" };
  }
}

export async function uploadBase64ToR2(
  base64DataUrl: string,
  key: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  try {
    const match = base64DataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return { success: false, url: "", key, error: "Invalid base64 dataURL" };
    }
    const contentType = match[1]!;
    const buffer = Buffer.from(match[2]!, "base64");
    return await uploadToR2(key, buffer, contentType);
  } catch (e: any) {
    return { success: false, url: "", key, error: e?.message };
  }
}

export async function deleteFromR2(key: string) {  if (!CF_TOKEN || !CF_ACCOUNT_ID) {
    console.error("[r2] misconfig: token/account hilang (delete)");
    return { success: false, error: "Layanan upload gangguan" };
  }
  const cleanKey = key.replace(/^\/+/, "");
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodeURIComponent(cleanKey).replace(/%2F/g, "/")}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await res.json().catch(() => ({}));
    return { success: res.ok && data.success !== false, error: data.errors?.[0]?.message };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

/**
 * List objek R2 per prefix (dipakai CMS lookbook + galeri publik).
 *
 * Cloudflare API mengembalikan `result` sebagai ARRAY (bukan
 * `{ objects: [...] }`) dan memakai cursor di `result_info`. Bentuk lama di
 * sini membuat daftar lookbook SELALU kosong walau bucket berisi file.
 * Maks 5 halaman × 1000 objek agar tidak menahan Worker terlalu lama.
 */
export async function listR2Objects(
  prefix: string
): Promise<{ success: boolean; keys: string[]; error?: string }> {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) {
    console.error("[r2] misconfig: token/account hilang (list)");
    return { success: false, keys: [], error: "Layanan upload gangguan" };
  }
  try {
    const keys: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const qs = new URLSearchParams({ prefix, per_page: "1000" });
      if (cursor) qs.set("cursor", cursor);
      const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects?${qs.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${CF_TOKEN}` },
        signal: AbortSignal.timeout(10000),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        return { success: false, keys: [], error: data.errors?.[0]?.message || `R2 list failed ${res.status}` };
      }
      const objs = Array.isArray(data.result)
        ? data.result
        : Array.isArray(data.result?.objects)
          ? data.result.objects
          : [];
      for (const o of objs) {
        const key = String(o?.key || "");
        if (key && !key.endsWith("/")) keys.push(key);
      }
      const next = data.result_info?.is_truncated ? data.result_info?.cursor : null;
      if (!next) break;
      cursor = String(next);
    }
    return { success: true, keys };
  } catch (e: any) {
    return { success: false, keys: [], error: e?.message };
  }
}

/**
 * Verifikasi magic-byte gambar (JANGAN percaya ekstensi/MIME saja):
 * PNG 89 50 4E 47 · JPEG FF D8 FF · WEBP "RIFF....WEBP".
 */
export function sniffImageMime(buffer: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  )
    return "image/webp";
  return null;
}
