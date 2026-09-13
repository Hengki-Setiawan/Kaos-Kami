import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() {
  try {
    const methods = await db.query.SablonMethod.findMany();
    return NextResponse.json({ success: true, methods });
  } catch(e:any){
    // Jangan bocorkan e.message (potensi detail DB) ke publik; log server saja.
    console.error("Catalog sablon-methods GET error:", e?.message);
    return NextResponse.json({ error: "Gagal memuat metode sablon" }, { status: 500 });
  }
}
