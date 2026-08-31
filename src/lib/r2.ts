/**
 * Cloudflare R2 Storage — Zero Egress
 * Bucket: kaos-kami-assets (APAC) | Public: https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev
 * Auth via CLOUDFLARE_API_TOKEN (Bearer) + CLOUDFLARE_ACCOUNT_ID
 * Endpoint: https://api.cloudflare.com/client/v4/accounts/{id}/r2/buckets/{bucket}/objects/{key}
 */

const R2_BUCKET = process.env.R2_BUCKET_NAME || "kaos-kami-assets";
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL || "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev";
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "6c660b71ad4e72f3bc343252a7c5e825";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

export function getR2PublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  return `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${cleanKey}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string = "application/octet-stream"
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) {
    return { success: false, url: "", key, error: "Missing CLOUDFLARE_API_TOKEN/ACCOUNT_ID" };
  }

  const cleanKey = key.replace(/^\/+/, "");
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodeURIComponent(cleanKey).replace(/%2F/g, "/")}`;

  try {
    const buffer = typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": contentType,
      },
      body: buffer as any,
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

    return { success: true, url: getR2PublicUrl(cleanKey), key: cleanKey };
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

export async function deleteFromR2(key: string) {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) return { success: false, error: "Missing token" };
  const cleanKey = key.replace(/^\/+/, "");
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodeURIComponent(cleanKey).replace(/%2F/g, "/")}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
    });
    const data: any = await res.json().catch(() => ({}));
    return { success: res.ok && data.success !== false, error: data.errors?.[0]?.message };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}
