import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { Design } from '@/lib/drizzle-schema';
import { getAuthenticatedUser } from '@/lib/security/authGuard';
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const ClaimDesignSchema = z.object({
  title: z.string().min(1).max(60),
  apparelSlug: z.enum(["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"]),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/),
  colorName: z.string().min(1).max(40),
  size: z.string().min(1).max(10),
  decals: z.array(z.any()).max(10).default([]),
  calculatedPriceIdr: z.number().int().positive().max(100_000_000).default(149000),
});

const ClaimPayloadSchema = z.object({
  designs: z.array(ClaimDesignSchema).min(1).max(20),
});

/**
 * Klaim desain guest (localStorage) ke akun yang baru login.
 * Menggantikan stub lama yang selalu return claimed:0.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`claim:ip:${getClientIp(req)}`, 5, 300);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak klaim." }, { status: 429, headers: rateLimitHeaders(rl, 5) });
    }
    const user = await getAuthenticatedUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: silakan login" }, { status: 401 });
    }
    const validation = ClaimPayloadSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }
    let claimed = 0;
    for (const d of validation.data.designs) {
      const category = await db.query.ApparelCategory.findFirst({
        where: (t, { eq }) => eq(t.slug, d.apparelSlug),
      });
      if (!category) continue;
      await db.insert(Design).values({
        id: nanoid(),
        userId: user.id,
        categoryId: category.id,
        title: d.title,
        colorHex: d.colorHex,
        colorName: d.colorName,
        size: d.size,
        decals: JSON.stringify(d.decals || []),
        calculatedPriceIdr: d.calculatedPriceIdr,
        priceBreakdown: JSON.stringify({ claimedFrom: "guest" }),
        status: "SAVED",
      });
      claimed++;
    }
    return NextResponse.json({ success: true, claimed });
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}
