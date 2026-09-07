import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() {
  try {
    const materials = await db.query.MaterialFinish.findMany();
    return NextResponse.json({ success: true, materials });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
