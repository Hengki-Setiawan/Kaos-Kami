import { NextResponse } from "next/server";
import { getRawClient } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  try {
    const raw = getRawClient();
    const res = await raw
      .execute(
        "SELECT key, value FROM ShopConfig WHERE key IN ('announcement_text', 'announcement_active')"
      )
      .catch(() => ({ rows: [] }));

    const map = new Map<string, string>();
    for (const r of res.rows as any[]) {
      if (r?.key && r?.value) {
        map.set(String(r.key), String(r.value));
      }
    }

    const text = (map.get("announcement_text") || "").trim();
    const active = map.get("announcement_active") !== "false";

    return NextResponse.json(
      { text, active: active && text.length > 0 },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
    );
  } catch {
    return NextResponse.json({ text: "", active: false });
  }
}
