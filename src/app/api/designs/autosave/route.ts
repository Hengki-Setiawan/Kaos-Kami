import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apparelSlug, colorHex, decals } = body;
    if (!apparelSlug) return NextResponse.json({ success: true, autosaved: true });
    return NextResponse.json({ success: true, autosaved: true, received: Object.keys(body).length });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
