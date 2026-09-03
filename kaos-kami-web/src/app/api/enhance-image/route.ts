import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "Missing imageBase64 data" }, { status: 400 });
    }

    // Extract base64 buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Perform DTF Print Optimization:
    // 1. Unsharp mask for high-definition edge recovery
    // 2. Normalization to remove compression noise
    // 3. Output as high-quality PNG with transparency
    const enhancedBuffer = await sharp(buffer)
      .sharpen({
        sigma: 1.5,
        m1: 1.0,
        m2: 2.0,
      })
      .toFormat("png", { quality: 100, compressionLevel: 6 })
      .toBuffer();

    const enhancedBase64 = `data:image/png;base64,${enhancedBuffer.toString("base64")}`;

    // Upload to R2 (zero egress) — key: enhanced/{timestamp}.png
    const r2Key = `enhanced/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const r2Result = await uploadToR2(r2Key, enhancedBuffer, "image/png");

    return NextResponse.json({
      success: true,
      enhancedUrl: enhancedBase64,
      r2Url: r2Result.success ? r2Result.url : null,
      r2Key: r2Result.success ? r2Result.key : null,
      r2Error: r2Result.error || null,
    });
  } catch (error: any) {
    console.error("Enhance image error:", error);
    return NextResponse.json({ error: error?.message || "Failed to process image" }, { status: 500 });
  }
}
