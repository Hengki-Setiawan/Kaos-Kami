import { NextResponse } from "next/server";
import { getR2PublicUrl, listR2Objects } from "@/lib/r2";

// Publik: daftar foto lookbook R2 untuk beranda (file-nya memang publik).
// Gagal R2 → list kosong (client pakai fallback statis), bukan 500.
export async function GET() {
  try {
    const list = await listR2Objects("lookbook/");
    if (!list.success) return NextResponse.json({ items: [] });
    return NextResponse.json(
      { items: list.keys.map((key) => ({ key, url: getR2PublicUrl(key) })) },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ items: [] });
  }
}
