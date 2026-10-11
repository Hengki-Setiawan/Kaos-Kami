import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteFromR2, listR2Objects, uploadToR2 } from "@/lib/r2";
import { getHeroContent, invalidateHeroCache, type HomeContent, DEFAULT_HERO } from "@/lib/cms";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const CmsSchema = z.object({
  heroTitle: z.string().min(2).max(100),
  heroSubtitle: z.string().max(300).optional().default(""),
  specsTitle: z.string().max(100).optional(),
  specsSubtitle: z.string().max(300).optional(),
  backGraphicTitle: z.string().max(100).optional(),
  backGraphicSubtitle: z.string().max(300).optional(),
  showcaseBadge: z.string().max(80).optional(),
  showcaseTitle: z.string().max(100).optional(),
  showcaseSubtitle: z.string().max(300).optional(),
  aboutBadge: z.string().max(80).optional(),
  aboutTitle: z.string().max(120).optional(),
  aboutStory: z.string().max(800).optional(),
  instagramUrl: z.string().max(200).optional(),
  tiktokUrl: z.string().max(200).optional(),
  facebookUrl: z.string().max(200).optional(),
  whatsappNumber: z.string().max(50).optional(),
  workshopAddress: z.string().max(300).optional(),
  workshopHours: z.string().max(100).optional(),
  workshopMapsUrl: z.string().max(300).optional(),
});

export const dynamic = "force-dynamic";

/** GET /api/admin/cms — baca konten CMS beranda lengkap (PUBLIK). */
export async function GET(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cms-get:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  try {
    const content = await getHeroContent();
    return NextResponse.json(
      { success: true, ...content },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ success: false, error: "Gagal memuat konten CMS" });
  }
}

/** POST /api/admin/cms — simpan seluruh konten beranda ke R2 (admin only). */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimitAsync(`admin-cms-post:ip:${getClientIp(req)}`, 10, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 10) });
  try {
    const { auth } = await import("@/lib/auth");
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs as any });
    const role = (session?.user as any)?.role;
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: khusus admin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CmsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Format input tidak valid", details: parsed.error.issues }, { status: 400 });

  const payload: HomeContent = {
    heroTitle: parsed.data.heroTitle,
    heroSubtitle: parsed.data.heroSubtitle || DEFAULT_HERO.heroSubtitle,
    specsTitle: parsed.data.specsTitle || DEFAULT_HERO.specsTitle,
    specsSubtitle: parsed.data.specsSubtitle || DEFAULT_HERO.specsSubtitle,
    backGraphicTitle: parsed.data.backGraphicTitle || DEFAULT_HERO.backGraphicTitle,
    backGraphicSubtitle: parsed.data.backGraphicSubtitle || DEFAULT_HERO.backGraphicSubtitle,
    showcaseBadge: parsed.data.showcaseBadge || DEFAULT_HERO.showcaseBadge,
    showcaseTitle: parsed.data.showcaseTitle || DEFAULT_HERO.showcaseTitle,
    showcaseSubtitle: parsed.data.showcaseSubtitle || DEFAULT_HERO.showcaseSubtitle,
    aboutBadge: parsed.data.aboutBadge || DEFAULT_HERO.aboutBadge,
    aboutTitle: parsed.data.aboutTitle || DEFAULT_HERO.aboutTitle,
    aboutStory: parsed.data.aboutStory || DEFAULT_HERO.aboutStory,
    instagramUrl: parsed.data.instagramUrl || DEFAULT_HERO.instagramUrl,
    tiktokUrl: parsed.data.tiktokUrl || DEFAULT_HERO.tiktokUrl,
    facebookUrl: parsed.data.facebookUrl || DEFAULT_HERO.facebookUrl,
    whatsappNumber: parsed.data.whatsappNumber || DEFAULT_HERO.whatsappNumber,
    workshopAddress: parsed.data.workshopAddress || DEFAULT_HERO.workshopAddress,
    workshopHours: parsed.data.workshopHours || DEFAULT_HERO.workshopHours,
    workshopMapsUrl: parsed.data.workshopMapsUrl || DEFAULT_HERO.workshopMapsUrl,
    updatedAt: new Date().toISOString(),
  };

  try {
    const old = await getHeroContent();
    if (old && old.updatedAt) {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
      await uploadToR2(`cms/hero-${stamp}.json`, JSON.stringify(old, null, 2), "application/json");
      try {
        const listed = await listR2Objects("cms/hero-");
        if (listed.success && listed.keys.length > 10) {
          const excess = [...listed.keys].sort().slice(0, listed.keys.length - 10);
          for (const k of excess) {
            try {
              await deleteFromR2(k);
            } catch (e) {
              console.error("CMS retensi: gagal hapus arsip lama", k, (e as Error)?.message || e);
            }
          }
        }
      } catch {}
    }
  } catch {}

  const up = await uploadToR2("cms/hero.json", JSON.stringify(payload, null, 2), "application/json");
  if (!up.success) {
    return NextResponse.json({ error: up.error || "Gagal mengunggah ke Cloudflare R2" }, { status: 502 });
  }
  invalidateHeroCache(payload);
  return NextResponse.json({ success: true, ...payload });
}
