import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, uploadBase64ToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // JSON base64 mode
    if (contentType.includes("application/json")) {
      const { imageBase64, key } = await req.json();
      if (!imageBase64) {
        return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
      }
      const r2Key = key || `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;
      const result = await uploadBase64ToR2(imageBase64, r2Key);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, url: result.url, key: result.key });
    }

    // Multipart form-data mode
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const key = (formData.get("key") as string) || `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Validate MIME
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: `MIME ${file.type} not allowed` }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File >10MB" }, { status: 400 });
    }

    let buffer = Buffer.from(await file.arrayBuffer());
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
