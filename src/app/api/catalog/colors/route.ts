import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET() {
  try {
    const colors = await prisma.colorOption.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json({ success: true, colors });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
