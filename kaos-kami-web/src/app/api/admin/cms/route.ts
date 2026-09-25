import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteFromR2, listR2Objects, uploadToR2 } from "@/lib/r2";
import { getHeroContent, invalidateHeroCache, type HeroContent } from "@/lib/cms";
import { headers } from "next/headers";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

const CmsSchema = z.object({
  heroTitle: z.string().min(2).max(80),
  heroSubtitle: z.string().max(200).optional().default(""),
});

/** GET /api/admin/cms — baca konten hero (PUBLIK, fail-soft ke default). */
export async function GET(req: NextRequest) {
  // Bucket rate-limit sendiri (terpisah dari POST hero & lookbook).
  const rl = await checkRateLimitAsync(`admin-cms-get:ip:${getClientIp(req)}`, 30, 60);
  if (rl.isLimited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: rateLimitHeaders(rl, 30) });
  try {
    const hero = await getHeroContent();
    return NextResponse.json(
      { success: true, ...hero },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ success: true, heroTitle: "", heroSubtitle: "" });
  }
}

/** POST /api/admin/cms — simpan konten hero ke R2 (admin only). */
export async function POST(req: NextRequest) {
  // Bucket rate-limit sendiri (terpisah dari GET hero & lookbook).
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const payload: HeroContent = {
    heroTitle: parsed.data.heroTitle,
    heroSubtitle: parsed.data.heroSubtitle,
    updatedAt: new Date().toISOString(),
  };
  // Arsip hero lama best-effort (gagal arsip tak gagalkan POST) + retensi maks 10.
  // Kegagalan dicatat via console.error agar terlihat di log server.
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
              console.error("CMS retensi: gagal hapus arsip hero", k, (e as Error)?.message || e);
            }
          }
        }
      } catch (e) {
        console.error("CMS retensi: gagal list arsip hero", (e as Error)?.message || e);
      }
    }
  } catch (e) {
    console.error("CMS arsip: gagal arsipkan hero lama (best-effort)", (e as Error)?.message || e);
  }
  const up = await uploadToR2("cms/hero.json", JSON.stringify(payload, null, 2), "application/json");
  if (!up.success) return NextResponse.json({ error: up.error || "Upload gagal" }, { status: 500 });
  invalidateHeroCache(payload);
  return NextResponse.json({ success: true, url: up.url });
}
