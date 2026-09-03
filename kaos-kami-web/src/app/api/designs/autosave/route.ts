import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apparelSlug, colorHex, colorName, size, decals, studioTheme, materialFinishSlug } = body;
    if (!apparelSlug) return NextResponse.json({ success: true, autosaved: true });

    // Try to get session — if guest, just ack (offline-first)
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = (session?.user as any)?.id || null;
    } catch {}

    if (userId) {
      // Find or create DRAFT design for this user (latest)
      const category = await prisma.apparelCategory.findUnique({ where: { slug: apparelSlug } });
      if (category) {
        const existingDraft = await prisma.design.findFirst({
          where: { userId, status: 'DRAFT' },
          orderBy: { updatedAt: 'desc' },
        });
        const decalsStr = JSON.stringify(decals || []);
        const priceBreakdownStr = JSON.stringify({ autosave: true });
        if (existingDraft) {
          await prisma.design.update({
            where: { id: existingDraft.id },
            data: {
              categoryId: category.id,
              colorHex: colorHex || '#121214',
              colorName: colorName || 'Obsidian Black',
              size: size || 'L',
              materialFinishSlug: materialFinishSlug || 'combed-cotton',
              decals: decalsStr,
              studioTheme: studioTheme || 'obsidian',
              priceBreakdown: priceBreakdownStr,
            },
          });
        } else {
          await prisma.design.create({
            data: {
              userId,
              categoryId: category.id,
              title: 'Autosave Draft',
              colorHex: colorHex || '#121214',
              colorName: colorName || 'Obsidian Black',
              size: size || 'L',
              materialFinishSlug: materialFinishSlug || 'combed-cotton',
              decals: decalsStr,
              studioTheme: studioTheme || 'obsidian',
              calculatedPriceIdr: 149000,
              priceBreakdown: priceBreakdownStr,
              status: 'DRAFT',
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, autosaved: true, persisted: !!userId });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
