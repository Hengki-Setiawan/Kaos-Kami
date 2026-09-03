import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET() {
  try {
    const materials = await prisma.materialFinish.findMany();
    return NextResponse.json({ success: true, materials });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
