import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() {
  try {
    const colors = await db.query.ColorOption.findMany({
      orderBy: (t, { asc }) => asc(t.sortOrder),
    });
    return NextResponse.json({ success: true, colors });
  } catch(e:any){
    // Jangan bocorkan e.message (potensi detail DB) ke publik; log server saja.
    console.error("Catalog colors GET error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat warna" }, { status: 500 });
  }
}
