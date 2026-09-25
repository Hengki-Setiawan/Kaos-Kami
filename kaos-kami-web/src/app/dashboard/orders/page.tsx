import React from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { CustomerDashboardView } from "@/components/commerce/CustomerDashboardView";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type PageCursor = { createdAt: Date; id: string } | null;

function firstParam(v: string | string[] | undefined): string | null {
  if (typeof v === "string") return v || null;
  if (Array.isArray(v) && v.length > 0) return v[0] || null;
  return null;
}

function parseCursor(raw: string | null): PageCursor {
  if (!raw) return null;
  const sep = raw.lastIndexOf("__");
  if (sep <= 0) return null;
  const datePart = raw.slice(0, sep);
  const idPart = raw.slice(sep + 2);
  if (!idPart) return null;
  try {
    const d = new Date(decodeURIComponent(datePart));
    if (Number.isNaN(d.getTime())) return null;
    return { createdAt: d, id: idPart };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: string | Date, id: string): string {
  const iso = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  return `${encodeURIComponent(iso)}__${id}`;
}

const ORD_LIMIT = 25;
const DES_LIMIT = 5;
const ADDR_LIMIT = 20;

export default async function CustomerDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // PII hardened: session-based scoping — ADMIN/SUPER_ADMIN lihat semua,
  // CUSTOMER dan PRODUCTION_STAFF hanya lihat miliknya (samakan authGuard
  // yang sengaja mengecualikan staff dari bypass owner).
  let sessionUserId: string | null = null;
  let sessionRole: string | null = null;
  try {
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    sessionUserId = (session?.user as any)?.id || null;
    sessionRole = (session?.user as any)?.role || null;
  } catch {}

  if (!sessionUserId) {
    redirect("/track?needLogin=1");
  }
  const canSeeAll = sessionRole === "ADMIN" || sessionRole === "SUPER_ADMIN";
  const orderWhere = sessionUserId && !canSeeAll ? { userId: sessionUserId } : undefined;
  const designWhere = sessionUserId && !canSeeAll ? { userId: sessionUserId } : undefined;

  // Paginasi cursor (createdAt+id) via searchParams — tanpa API baru.
  // Tombol "Muat lagi" di view mengirim cursor halaman berikutnya sebagai link.
  const sp = searchParams ? await searchParams : {};
  const rawOrdersCursor = firstParam(sp?.ordersCursor);
  const rawDesignsCursor = firstParam(sp?.designsCursor);
  const rawAddressesCursor = firstParam(sp?.addressesCursor);
  const oCursor = parseCursor(rawOrdersCursor);
  const dCursor = parseCursor(rawDesignsCursor);
  const aCursor = parseCursor(rawAddressesCursor);

  const [recentOrdersRaw, savedDesignsRaw, userProfile] = await Promise.all([
    db.query.Order.findMany({
      where: (t, { eq, lt, and, or }: any) => {
        const conds: any[] = [];
        if (orderWhere) conds.push(eq(t.userId, orderWhere.userId));
        if (oCursor)
          conds.push(
            or(lt(t.createdAt, oCursor.createdAt), and(eq(t.createdAt, oCursor.createdAt), lt(t.id, oCursor.id)))
          );
        if (conds.length === 0) return undefined;
        if (conds.length === 1) return conds[0];
        return and(conds[0], conds[1]);
      },
      limit: ORD_LIMIT + 1,
      orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)],
      with: {
        items: true,
        shippingAddress: true,
        payment: true,
      },
    }),
    db.query.Design.findMany({
      where: (t, { eq, lt, and, or }: any) => {
        const conds: any[] = [];
        if (designWhere) conds.push(eq(t.userId, designWhere.userId));
        if (dCursor)
          conds.push(
            or(lt(t.createdAt, dCursor.createdAt), and(eq(t.createdAt, dCursor.createdAt), lt(t.id, dCursor.id)))
          );
        if (conds.length === 0) return undefined;
        if (conds.length === 1) return conds[0];
        return and(conds[0], conds[1]);
      },
      limit: DES_LIMIT + 1,
      orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)],
      with: { category: true },
    }),
    db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, sessionUserId),
      columns: { id: true, name: true, email: true, phoneNumber: true, role: true },
    }),
  ]);

  const addressesRaw =
    sessionUserId && !canSeeAll
      ? await db.query.Address.findMany({
          where: (t, { eq, lt, and, or }: any) => {
            const base = eq(t.userId, sessionUserId as string);
            if (!aCursor) return base;
            return and(
              base,
              or(lt(t.createdAt, aCursor.createdAt), and(eq(t.createdAt, aCursor.createdAt), lt(t.id, aCursor.id)))
            );
          },
          orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)],
          limit: ADDR_LIMIT + 1,
        })
      : [];

  const hasMoreOrders = recentOrdersRaw.length > ORD_LIMIT;
  const hasMoreDesigns = savedDesignsRaw.length > DES_LIMIT;
  const hasMoreAddresses = addressesRaw.length > ADDR_LIMIT;
  const recentOrders = recentOrdersRaw.slice(0, ORD_LIMIT);
  const savedDesigns = savedDesignsRaw.slice(0, DES_LIMIT);
  const addresses = addressesRaw.slice(0, ADDR_LIMIT);
  const ordersNextCursor =
    hasMoreOrders && recentOrders.length > 0
      ? encodeCursor(
          (recentOrders[recentOrders.length - 1] as any).createdAt,
          (recentOrders[recentOrders.length - 1] as any).id
        )
      : null;
  const designsNextCursor =
    hasMoreDesigns && savedDesigns.length > 0
      ? encodeCursor(
          (savedDesigns[savedDesigns.length - 1] as any).createdAt,
          (savedDesigns[savedDesigns.length - 1] as any).id
        )
      : null;
  const addressesNextCursor =
    hasMoreAddresses && addresses.length > 0
      ? encodeCursor((addresses[addresses.length - 1] as any).createdAt, (addresses[addresses.length - 1] as any).id)
      : null;

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12">
        <CustomerDashboardView
          orders={recentOrders as any}
          designs={savedDesigns as any}
          addresses={addresses}
          user={userProfile as any}
          ordersNextCursor={ordersNextCursor}
          designsNextCursor={designsNextCursor}
          addressesNextCursor={addressesNextCursor}
          currentCursors={{
            ordersCursor: rawOrdersCursor,
            designsCursor: rawDesignsCursor,
            addressesCursor: rawAddressesCursor,
          }}
        />
      </main>

      <Footer />
    </div>
  );
}

