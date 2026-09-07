import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.run(sql`SELECT 1 as ok`);
    return NextResponse.json({
      status: "ok",
      db: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      site: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    });
  } catch (e: any) {
    return NextResponse.json({ status: "error", db: "disconnected", error: e?.message }, { status: 500 });
  }
}
