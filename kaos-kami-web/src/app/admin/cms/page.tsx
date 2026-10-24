import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CmsPageTabs } from "@/components/admin/CmsPageTabs";
import { FileText } from "lucide-react";
import { isDevOrTest } from "@/lib/envMode";

export const dynamic = "force-dynamic";

export default async function AdminCMSPage() {
  let myRole: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
  }

  if (isDevOrTest() && myRole !== "CUSTOMER") {
    myRole = "SUPER_ADMIN";
  }

  if (myRole === "PRODUCTION_STAFF") {
    redirect("/admin/production");
  }
  if (myRole === "COURIER") {
    redirect("/admin/deliveries");
  }
  if (!myRole || !["ADMIN", "SUPER_ADMIN"].includes(myRole)) {
    redirect("/?denied=admin");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto font-sans text-xs">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <FileText size={15} />
            <span>Pusat Manajemen Konten</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary uppercase">
            CMS & Konten Website
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            Hero banner, pengumuman promo, lookbook portofolio, dan SEO — tersinkron otomatis ke Turso DB & Cloudflare R2
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated text-text-primary font-semibold text-xs transition"
          >
            Kembali ke Pusat Pesanan
          </Link>
        </div>
      </div>

      {/* TABULATED CMS SUITE */}
      <CmsPageTabs />
    </div>
  );
}
