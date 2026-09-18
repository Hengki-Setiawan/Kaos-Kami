import React from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { CustomerDashboardView } from "@/components/commerce/CustomerDashboardView";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  // PII hardened: session-based scoping — PRODUCTION_STAFF/ADMIN see all, CUSTOMER see own only
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
    redirect("/track");
  }
  const canSeeAll = sessionRole === "ADMIN" || sessionRole === "SUPER_ADMIN" || sessionRole === "PRODUCTION_STAFF";
  const orderWhere = sessionUserId && !canSeeAll ? { userId: sessionUserId } : undefined;
  const designWhere = sessionUserId && !canSeeAll ? { userId: sessionUserId } : undefined;

  const [recentOrders, savedDesigns, userProfile] = await Promise.all([
    db.query.Order.findMany({
      where: orderWhere ? (t, { eq }) => eq(t.userId, orderWhere.userId) : undefined,
      limit: 25,
      orderBy: (t, { desc }) => desc(t.createdAt),
      with: {
        items: true,
        shippingAddress: true,
        payment: true,
      },
    }),
    db.query.Design.findMany({
      where: designWhere ? (t, { eq }) => eq(t.userId, designWhere.userId) : undefined,
      limit: 10,
      orderBy: (t, { desc }) => desc(t.createdAt),
      with: { category: true },
    }),
    db.query.User.findFirst({
      where: (t, { eq }) => eq(t.id, sessionUserId),
      columns: { id: true, name: true, email: true, phoneNumber: true, role: true },
    }),
  ]);

  const addresses =
    sessionUserId && !canSeeAll
      ? await db.query.Address.findMany({
          where: (t, { eq }) => eq(t.userId, sessionUserId),
          orderBy: (t, { desc }) => desc(t.createdAt),
          limit: 20,
        })
      : [];

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12">
        <CustomerDashboardView
          orders={recentOrders as any}
          designs={savedDesigns as any}
          addresses={addresses}
          user={userProfile as any}
        />
      </main>

      <Footer />
    </div>
  );
}

