import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() {
  try {
    const colors = await db.query.ColorOption.findMany({
      orderBy: (t, { asc }) => asc(t.sortOrder),
    });
    return NextResponse.json({ success: true, colors });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
