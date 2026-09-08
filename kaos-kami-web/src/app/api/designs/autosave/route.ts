import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Design } from '@/lib/drizzle-schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const AutosaveSchema = z.object({
  apparelSlug: z.string().min(1).max(32),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).optional(),
  colorName: z.string().max(40).optional(),
  size: z.string().max(10).optional(),
  decals: z.array(z.any()).max(10).optional(),
  studioTheme: z.string().max(20).optional(),
  materialFinishSlug: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`autosave:ip:${getClientIp(req)}`, 20, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Autosave dibatasi." }, { status: 429, headers: rateLimitHeaders(rl, 20) });
    }
    const body = await req.json();
    const parsed = AutosaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, autosaved: false, error: "Payload autosave tidak valid" }, { status: 400 });
    }
    const { apparelSlug, colorHex, colorName, size, decals, studioTheme, materialFinishSlug } = parsed.data;
    if (!apparelSlug) return NextResponse.json({ success: true, autosaved: true });

    // Try to get session — if guest, just ack (offline-first)
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = (session?.user as any)?.id || null;
    } catch {}

    if (userId) {
      // Find or create DRAFT design for this user (latest)
      const category = await db.query.ApparelCategory.findFirst({
        where: (t, { eq }) => eq(t.slug, apparelSlug),
      });
      if (category) {
        const existingDraft = await db.query.Design.findFirst({
          where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.status, 'DRAFT')),
          orderBy: (t, { desc }) => desc(t.updatedAt),
        });
        const decalsStr = JSON.stringify(decals || []);
        const priceBreakdownStr = JSON.stringify({ autosave: true });
        if (existingDraft) {
          await db
            .update(Design)
            .set({
              categoryId: category.id,
              colorHex: colorHex || '#121214',
              colorName: colorName || 'Obsidian Black',
              size: size || 'L',
              materialFinishSlug: materialFinishSlug || 'combed-cotton',
              decals: decalsStr,
              studioTheme: studioTheme || 'obsidian',
              priceBreakdown: priceBreakdownStr,
            })
            .where(eq(Design.id, existingDraft.id));
        } else {
          await db.insert(Design).values({
            id: nanoid(),
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
          });
        }
      }
    }

    return NextResponse.json({ success: true, autosaved: true, persisted: !!userId });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
