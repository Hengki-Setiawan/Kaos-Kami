import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { and, eq, count, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { Design } from "@/lib/drizzle-schema";
import { SaveDesignSchema } from "@/lib/schemas/design";
import { uploadBase64ToR2 } from "@/lib/r2";
import { getAuthenticatedUser } from "@/lib/security/authGuard";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    // Cap body mentah dulu (audit: base64 500k×10 + preview bisa OOM
    // sebelum Zod sempat menolak). 8MB > kebutuhan wajar.
    const raw = await req.text();
    if (raw.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload terlalu besar (maks 8MB)" }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
    }
    // Guest boleh simpan (fitur), tapi dibatasi ketat anti-spam/DoS.
    const rl = await checkRateLimitAsync(`designs:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak menyimpan desain." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const len = Number(req.headers.get("content-length") || 0);
    if (len > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload desain >3MB" }, { status: 413 });
    }
    // Header bisa dipalsu/hilang (chunked) — ukur body asli (audit).
    const validation = SaveDesignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message }, { status: 400 });
    }

    const {
      title,
      apparelSlug,
      colorHex,
      colorName,
      size,
      materialFinishSlug,
      sablonMethodSlug,
      decals,
      studioTheme,
      calculatedPriceIdr,
      priceBreakdown,
      previewImageFrontUrl,
      previewImageBackUrl,
      masterAssetUrl,
    } = validation.data;

    // Guest boleh simpan (fitur), tapi base64 WAJIB login — samakan dengan
    // POST /api/upload/r2 yang wajib auth (anti penimbunan bucket oleh asing).
    // Guest hanya boleh simpan URL https (tanpa upload server-side).
    const needsUpload =
      (Array.isArray(decals) && decals.some((d: any) => typeof d?.url === "string" && d.url.startsWith("data:image"))) ||
      (typeof previewImageFrontUrl === "string" && previewImageFrontUrl.startsWith("data:image")) ||
      (typeof previewImageBackUrl === "string" && previewImageBackUrl.startsWith("data:image")) ||
      (typeof masterAssetUrl === "string" && masterAssetUrl.includes("data:image"));
    const viewer = await getAuthenticatedUser().catch(() => null);
    if (needsUpload && !viewer) {
      return NextResponse.json({ error: "Login diperlukan untuk upload gambar. Silakan login dulu." }, { status: 401 });
    }

    // Pembatasan Kuota 5 Desain per Akun User (Kebijakan Storage UMKM Sep 2026):
    // Melindungi kuota R2 dari penumpukan draft & menjaga dashboard user tetap rapi.
    // KEPUTUSAN OWNER 2026-09-24 (P0-1 E2E): arsip ORDERED DIKECUALIKAN — arsip adalah
    // riwayat order (dilindungi!), bukan draft. Tanpa ini user lama terkunci selamanya.
    if (viewer) {
      const isStaffOrAdmin = ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(viewer.role);
      if (!isStaffOrAdmin) {
        const existingCount = (
          await db
            .select({ n: count() })
            .from(Design)
            .where(and(eq(Design.userId, viewer.id), ne(Design.status, "ORDERED")))
        )[0]?.n ?? 0;

        if (existingCount >= 5) {
          return NextResponse.json(
            {
              error: "Batas kuota tercapai: Akun Anda telah menyimpan maksimal 5 desain. Silakan hapus desain lama di dashboard untuk menyimpan desain baru.",
              quotaExceeded: true,
              maxQuota: 5,
              currentDesigns: existingCount,
            },
            { status: 400 }
          );
        }
      }
    }

    // Find category
    const category = await db.query.ApparelCategory.findFirst({
      where: (t, { eq }) => eq(t.slug, apparelSlug),
    });
    if (!category) {
      return NextResponse.json({ error: "Apparel category not found" }, { status: 404 });
    }

    // Upload decal base64 to R2 (zero egress, hindari DB bengkak 90%)
    const processedDecals = await Promise.all(
      (decals as any[]).map(async (d: any, idx: number) => {
        if (typeof d.url === "string" && d.url.startsWith("data:image")) {
          const r2Key = `decals/${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}.png`;
          const uploaded = await uploadBase64ToR2(d.url, r2Key);
          if (uploaded.success) {
            return { ...d, url: uploaded.url, r2Key: uploaded.key };
          }
        }
        return d;
      })
    );

    // Upload preview images if base64
    let finalFrontUrl = previewImageFrontUrl;
    let finalBackUrl = previewImageBackUrl;
    if (finalFrontUrl && finalFrontUrl.startsWith("data:image")) {
      const up = await uploadBase64ToR2(finalFrontUrl, `previews/${Date.now()}-front.png`);
      if (up.success) finalFrontUrl = up.url;
    }
    if (finalBackUrl && finalBackUrl.startsWith("data:image")) {
      const up = await uploadBase64ToR2(finalBackUrl, `previews/${Date.now()}-back.png`);
      if (up.success) finalBackUrl = up.url;
    }

    // K2 guest path: master base64 (drawer tanpa login tak bisa pakai
    // /api/upload/r2 yang wajib auth) di-hosting-kan server ke R2 di sini
    // agar arsip selalu https. Best-effort: gagal → simpan apa adanya
    // (confirmOrder fallback ke preview, tak gagalkan save).
    let finalMasterUrl: string | null = masterAssetUrl || null;
    if (finalMasterUrl) {
      try {
        if (finalMasterUrl.startsWith("data:image")) {
          const up = await uploadBase64ToR2(finalMasterUrl, `masters/${Date.now()}.png`);
          if (up.success && up.url) finalMasterUrl = up.url;
        } else {
          try {
            const parsed = JSON.parse(finalMasterUrl);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              let changed = false;
              for (const [k, v] of Object.entries(parsed).slice(0, 20)) {
                const u = typeof v === "string" ? v : (v as any)?.url;
                if (typeof u === "string" && u.startsWith("data:image")) {
                  try {
                    const up = await uploadBase64ToR2(
                      u,
                      `masters/${Date.now()}-${String(k).replace(/[^a-z0-9_-]/gi, "").slice(0, 24)}.png`
                    );
                    if (up.success && up.url) {
                      (parsed as any)[k] = { url: up.url, at: new Date().toISOString() };
                      changed = true;
                    }
                  } catch {}
                }
              }
              if (changed) finalMasterUrl = JSON.stringify(parsed);
            }
          } catch {
            // Bukan JSON — simpan mentah (legacy url tunggal).
          }
        }
      } catch {}
    }

    // Harga dihitung ULANG di server (audit: calculatedPriceIdr client bisa
    // diedit → simpan harga murah lalu checkout/reorder pakai harga itu).
    const { calculate6VariablePrice } = await import("@/lib/pricingEngine");
    const { PRODUCT_COLORS } = await import("@/lib/constants");
    let serverPrice = 149000;
    try {
      const matched = PRODUCT_COLORS.find(
        (c: any) => String(c.hex).toLowerCase() === String(colorHex).toLowerCase()
      );
      const pricing = calculate6VariablePrice({
        apparelSlug: apparelSlug as any,
        size,
        colorHex,
        isSpecialPigment: !!matched?.isSpecialPigment,
        decals: (decals as any[]) || [],
        quantity: 1,
      });
      serverPrice = pricing.totalPriceIdr;
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "Desain tidak valid" }, { status: 400 });
    }

    const [design] = await db
      .insert(Design)
      .values({
        id: nanoid(),
        title,
        userId: viewer?.id ?? null,
        categoryId: category.id,
        colorHex,
        colorName,
        size,
        materialFinishSlug: materialFinishSlug || "combed-cotton",
        sablonMethodSlug: sablonMethodSlug || "dtf",
        decals: JSON.stringify(processedDecals),
        studioTheme: studioTheme || "obsidian",
        calculatedPriceIdr: serverPrice,
        priceBreakdown: JSON.stringify({ ...(typeof priceBreakdown === "object" ? priceBreakdown : {}), serverPriced: true }),
        previewImageFrontUrl: finalFrontUrl,
        previewImageBackUrl: finalBackUrl,
        masterAssetUrl: finalMasterUrl,
        status: "SAVED",
      })
      .returning();

    return NextResponse.json({ success: true, design });
  } catch (error: any) {
    console.error("Save design error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

const DesignMutationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60).optional(),
  colorHex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/).optional(),
  colorName: z.string().max(40).optional(),
  size: z.string().max(10).optional(),
  materialFinishSlug: z.string().max(40).optional(),
  sablonMethodSlug: z.string().max(40).optional(),
  decals: z.array(z.any()).max(10).optional(),
  studioTheme: z.string().max(40).optional(),
  previewImageFrontUrl: z.string().optional(),
  previewImageBackUrl: z.string().optional(),
  masterAssetUrl: z.string().optional(),
});

async function ownDesignOr403(id: string) {
  const design = await db.query.Design.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: { category: true },
  });
  if (!design) return { error: NextResponse.json({ error: "Desain tidak ditemukan" }, { status: 404 }) };
  const viewer = await getAuthenticatedUser().catch(() => null);
  const isStaff = !!viewer && ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(viewer.role);
  // Desain tamu (userId null) boleh dikelola pemegang ID tak-tertebak;
  // desain ber-pemilik wajib pemilik/admin.
  if (design.userId && (!viewer || (!isStaff && viewer.id !== design.userId))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { design, viewer };
}

/** PATCH /api/designs — perbarui desain milik sendiri (judul, sablon, warna, preview). */
export async function PATCH(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`designs-patch:ip:${getClientIp(req)}`, 20, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak mengubah desain." }, { status: 429, headers: rateLimitHeaders(rl, 20) });
    }
    const rawBody = await req.json().catch(() => ({}));
    const parsed = DesignMutationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload tidak valid" }, { status: 400 });
    }
    const gate = await ownDesignOr403(parsed.data.id);
    if (gate.error) return gate.error;

    const existing = gate.design!;
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title) updateData.title = parsed.data.title;
    if (parsed.data.colorHex) updateData.colorHex = parsed.data.colorHex;
    if (parsed.data.colorName) updateData.colorName = parsed.data.colorName;
    if (parsed.data.size) updateData.size = parsed.data.size;
    if (parsed.data.materialFinishSlug) updateData.materialFinishSlug = parsed.data.materialFinishSlug;
    if (parsed.data.sablonMethodSlug) updateData.sablonMethodSlug = parsed.data.sablonMethodSlug;
    if (parsed.data.studioTheme) updateData.studioTheme = parsed.data.studioTheme;

    // Handle preview images (upload base64 to R2 if provided)
    if (parsed.data.previewImageFrontUrl) {
      let front = parsed.data.previewImageFrontUrl;
      if (front.startsWith("data:image")) {
        const up = await uploadBase64ToR2(front, `previews/${Date.now()}-front.png`);
        if (up.success && up.url) front = up.url;
      }
      updateData.previewImageFrontUrl = front;
    }

    if (parsed.data.previewImageBackUrl) {
      let back = parsed.data.previewImageBackUrl;
      if (back.startsWith("data:image")) {
        const up = await uploadBase64ToR2(back, `previews/${Date.now()}-back.png`);
        if (up.success && up.url) back = up.url;
      }
      updateData.previewImageBackUrl = back;
    }

    // Handle decals
    if (parsed.data.decals) {
      const processedDecals = await Promise.all(
        parsed.data.decals.map(async (d: any) => {
          if (typeof d?.url === "string" && d.url.startsWith("data:image")) {
            const uploaded = await uploadBase64ToR2(d.url, `decals/${Date.now()}-${d.id || "decal"}.png`);
            if (uploaded.success && uploaded.url) {
              return { ...d, url: uploaded.url, r2Key: uploaded.key };
            }
          }
          return d;
        })
      );
      updateData.decals = JSON.stringify(processedDecals);

      // Recalculate price if decals or color changed
      try {
        const { calculate6VariablePrice } = await import("@/lib/pricingEngine");
        const { PRODUCT_COLORS } = await import("@/lib/constants");
        const activeColorHex = parsed.data.colorHex || existing.colorHex;
        const matched = PRODUCT_COLORS.find(
          (c: any) => String(c.hex).toLowerCase() === String(activeColorHex).toLowerCase()
        );
        const pricing = calculate6VariablePrice({
          apparelSlug: (existing.category?.slug as any) || "tshirt",
          size: parsed.data.size || existing.size,
          colorHex: activeColorHex,
          isSpecialPigment: !!matched?.isSpecialPigment,
          decals: processedDecals,
          quantity: 1,
        });
        updateData.calculatedPriceIdr = pricing.totalPriceIdr;
        updateData.priceBreakdown = JSON.stringify({ ...pricing, serverPriced: true });
      } catch {}
    }

    if (parsed.data.masterAssetUrl) {
      updateData.masterAssetUrl = parsed.data.masterAssetUrl;
    }

    await db.update(Design).set(updateData).where(eq(Design.id, parsed.data.id));

    const updated = await db.query.Design.findFirst({
      where: (t, { eq }) => eq(t.id, parsed.data.id),
      with: { category: true },
    });

    return NextResponse.json({
      success: true,
      design: updated ? {
        ...updated,
        decals: JSON.parse(updated.decals || "[]"),
        priceBreakdown: JSON.parse(updated.priceBreakdown || "{}"),
      } : undefined,
    });
  } catch (e: any) {
    console.error("PATCH design error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/designs — hapus milik sendiri. */
export async function DELETE(req: NextRequest) {
  try {
    // Limiter hapus (destruktif — sejajar POST 10/mnt). Key IP dengan alasan
    // yang sama seperti PATCH (jalur tamu userId null).
    const rl = await checkRateLimitAsync(`designs-delete:ip:${getClientIp(req)}`, 10, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu banyak menghapus desain." }, { status: 429, headers: rateLimitHeaders(rl, 10) });
    }
    const parsed = DesignMutationSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const gate = await ownDesignOr403(parsed.data.id);
    if (gate.error) return gate.error;
    await db.delete(Design).where(eq(Design.id, parsed.data.id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Anti-IDOR: non-admin hanya melihat desain miliknya sendiri.
    const viewer = await getAuthenticatedUser().catch(() => null);
    const isAdmin =
      !!viewer && ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(viewer.role);
    if (!viewer) {
      // Tamu tak punya desain milik sendiri — kembalikan list kosong (200),
      // bukan 401, agar hydrate studio tak menulis console error untuk tamu.
      return NextResponse.json({ success: true, designs: [], guest: true });
    }
    const designs = await db.query.Design.findMany({
      where: isAdmin ? undefined : (t, { eq }) => eq(t.userId, viewer.id),
      limit: 20,
      orderBy: (t, { desc }) => desc(t.createdAt),
      with: { category: true },
    });

    const parsedDesigns = designs.map((d) => ({
      ...d,
      decals: JSON.parse(d.decals || "[]"),
      priceBreakdown: JSON.parse(d.priceBreakdown || "{}"),
    }));

    return NextResponse.json({ success: true, designs: parsedDesigns });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
