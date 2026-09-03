import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function GET() {
  try {
    const methods = await prisma.sablonMethod.findMany();
    return NextResponse.json({ success: true, methods });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
