import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() {
  try {
    const materials = await db.query.MaterialFinish.findMany();
    return NextResponse.json({ success: true, materials });
  } catch(e:any){
    // Jangan bocorkan e.message (potensi detail DB) ke publik; log server saja.
    console.error("Catalog materials GET error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat material" }, { status: 500 });
  }
}
