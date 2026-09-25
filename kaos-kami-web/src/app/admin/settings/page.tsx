import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SHOP_CONTACT_WHATSAPP, SHOP_LAT, SHOP_LON, SHOP_POSTAL_CODE, SHOP_WORKSHOP_ADDRESS } from "@/lib/shop";

export const dynamic = "force-dynamic";
// Halaman INFO SISTEM (read-only, audit H19): nilai operasional non-rahasia.
// Secret (API key/token) TIDAK PERNAH ditampilkan di sini — hanya status ada/tidak.

// Helper: tandai nilai fallback agar tak dikira konfigurasi asli.
function withDefault(value: string | undefined, fallback: string) {
  if (value && value.trim()) return { text: value, isDefault: false };
  return { text: `${fallback} (default)`, isDefault: true };
}

function Row({ label, value, isDefault, hideWhenDefault }: { label: string; value: string; isDefault?: boolean; hideWhenDefault?: boolean }) {
  if (hideWhenDefault && isDefault) {
    return (
      <div><span className="block text-text-muted">{label}</span><span className="text-text-muted italic">belum dipasang (default disembunyikan)</span></div>
    );
  }
  return (
    <div>
      <span className="block text-text-muted">{label}</span>
      <span className={isDefault ? "text-text-muted" : "text-text-primary font-bold"}>
        {value}
      </span>
      {isDefault && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold">default</span>}
    </div>
  );
}

export default async function AdminSettingsPage() {
  let myRole: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: (await headers()) as any });
    myRole = ((session?.user as any)?.role as string) || null;
  } catch {
    myRole = null;
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
  const shopAddress = withDefault(process.env.SHOP_WORKSHOP_ADDRESS, SHOP_WORKSHOP_ADDRESS);
  const shopWa = withDefault(process.env.SHOP_CONTACT_WHATSAPP, SHOP_CONTACT_WHATSAPP);
  const shopPostal = withDefault(process.env.SHOP_POSTAL_CODE, SHOP_POSTAL_CODE);
  const siteUrl = withDefault(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000");
  // URL placeholder (pub-...r2.dev) disembunyikan — tampil hanya bila env asli dipasang.
  const r2Bucket = withDefault(process.env.R2_BUCKET_NAME, "kaos-kami-assets");
  const r2UrlRaw = (process.env.R2_PUBLIC_URL || "").trim();
  // Presence boolean saja — bukan secret/nilai kunci.
  const r2Present = Boolean((process.env.R2_BUCKET_NAME || "").trim() && r2UrlRaw);
  const duitkuPresent = Boolean((process.env.DUITKU_MERCHANT_CODE || "").trim() && (process.env.DUITKU_API_KEY || "").trim());
  const duitkuEnv = (process.env.DUITKU_ENV || "sandbox").trim() || "sandbox";

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-5xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-border-subtle">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-text-primary">INFO SISTEM</h1>
        <p className="text-text-muted">Konfigurasi aktif (read-only) • template WhatsApp • R2 • Duitku</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-text-primary">INFO TOKO</h3>
          <div className="space-y-2 text-[11px]">
            <Row label="ALAMAT WORKSHOP" value={shopAddress.text} isDefault={shopAddress.isDefault} />
            <Row label="KODE POS ASAL (ONGKIR)" value={shopPostal.text} isDefault={shopPostal.isDefault} />
            <Row label="WHATSAPP" value={shopWa.text} isDefault={shopWa.isDefault} />
            <Row label="SITE URL" value={siteUrl.text} isDefault={siteUrl.isDefault} />
            <Row label="R2 BUCKET" value={r2Bucket.text} isDefault={r2Bucket.isDefault} />
            <Row label="R2 PUBLIC URL" value={r2UrlRaw} isDefault={!r2UrlRaw} hideWhenDefault />
            <div>
              <span className="block text-text-muted">KOORDINAT WORKSHOP (LAT, LON)</span>
              <span className="text-text-primary font-bold">{SHOP_LAT}, {SHOP_LON}</span>
              <span className="block text-[10px] text-text-muted mt-0.5">Override via env SHOP_LAT / SHOP_LON (lihat lib/shop.ts) — tanpa ubah kode.</span>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-text-primary">STATUS INTEGRASI (presence, bukan secret)</h3>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle">
              <span className="font-bold text-text-primary">R2 Object Storage</span>
              <span className={`px-2 py-1 rounded-lg font-bold ${r2Present ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                {r2Present ? "● TERPASANG" : "○ BELUM DIPASANG"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle">
              <span className="font-bold text-text-primary">Duitku ({duitkuEnv})</span>
              <span className={`px-2 py-1 rounded-lg font-bold ${duitkuPresent ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                {duitkuPresent ? "● TERPASANG" : "○ BELUM DIPASANG"}
              </span>
            </div>
            <p className="text-[10px] text-text-muted">Hanya status ada/tidak dari env (R2_BUCKET_NAME+R2_PUBLIC_URL, DUITKU_MERCHANT_CODE+DUITKU_API_KEY). Nilai kunci tak pernah ditampilkan.</p>
          </div>
        </div>
        <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 md:col-span-2">
          <h3 className="font-bold text-text-primary">TEMPLATE WHATSAPP (BLUEPRINT-03 §9)</h3>
          <div className="grid md:grid-cols-3 gap-3 text-[11px]">
            {[
              { key: "order_confirmed", label: "Pesanan Dikonfirmasi", tpl: "Halo {{customerName}}, pesanan {{orderNumber}} total Rp {{totalIdr}} telah dikonfirmasi. Cek {{invoiceUrl}}" },
              { key: "printing_started", label: "Sedang Dicetak", tpl: "Pesanan {{orderNumber}} sedang dicetak DTF ({{stageName}}). Pantau {{invoiceUrl}}" },
              { key: "shipped", label: "Dikirim/Siap Ambil", tpl: "Pesanan {{orderNumber}} {{stageName}}. Resi {{trackingNumber}} • {{invoiceUrl}}" },
            ].map(t=>(
              <div key={t.key} className="p-3 rounded-xl bg-surface border border-border-subtle">
                <span className="font-bold text-brand-accent block">{t.key} — {t.label}</span>
                <span className="text-text-muted">{t.tpl}</span>
                <span className="block text-[10px] text-text-muted mt-1">Tokens: {"{{orderNumber}} {{customerName}} {{totalIdr}} {{trackingNumber}} {{invoiceUrl}}"}</span>
              </div>
            ))}
            <p className="text-[10px] text-text-muted md:col-span-3">Edit template via code/src/lib/notifications/whatsapp.ts atau tambahkan tabel NotificationTemplate (id, key, bodyTemplate) untuk edit tanpa deploy — sesuai blueprint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
