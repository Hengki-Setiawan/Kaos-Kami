import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { guestToken } = await req.json();
    return NextResponse.json({ success: true, claimed: 0, guestToken });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
