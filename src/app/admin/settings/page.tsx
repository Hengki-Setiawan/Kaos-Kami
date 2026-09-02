export const dynamic = "force-dynamic";
export default function AdminSettingsPage() {
  const shopAddress = process.env.SHOP_WORKSHOP_ADDRESS || "Workshop Kaos Kami, Makassar";
  const shopWa = process.env.SHOP_CONTACT_WHATSAPP || "6281244002026";
  const r2Bucket = process.env.R2_BUCKET_NAME || "kaos-kami-assets";
  const r2Url = process.env.R2_PUBLIC_URL || "https://pub-...r2.dev";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-5xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">WORKSHOP SETTINGS</h1>
        <p className="text-text-muted">Konfigurasi toko • template WhatsApp • R2 • Midtrans</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white">INFO TOKO</h3>
          <div className="space-y-2 text-[11px]">
            <div><span className="block text-text-muted">ALAMAT WORKSHOP</span><span className="text-white font-bold">{shopAddress}</span></div>
            <div><span className="block text-text-muted">WHATSAPP</span><span className="text-brand-accent font-bold">{shopWa}</span></div>
            <div><span className="block text-text-muted">SITE URL</span><span className="text-white">{siteUrl}</span></div>
            <div><span className="block text-text-muted">R2 BUCKET</span><span className="text-white">{r2Bucket} → {r2Url}</span></div>
          </div>
        </div>
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white">TEMPLATE WHATSAPP (BLUEPRINT-03 §9)</h3>
          <div className="space-y-3 text-[11px]">
            {[
              { key: "order_confirmed", label: "Pesanan Dikonfirmasi", tpl: "Halo {{customerName}}, pesanan {{orderNumber}} total Rp {{totalIdr}} telah dikonfirmasi. Cek {{invoiceUrl}}" },
              { key: "printing_started", label: "Sedang Dicetak", tpl: "Pesanan {{orderNumber}} sedang dicetak DTF ({{stageName}}). Pantau {{invoiceUrl}}" },
              { key: "shipped", label: "Dikirim/Siap Ambil", tpl: "Pesanan {{orderNumber}} {{stageName}}. Resi {{trackingNumber}} • {{invoiceUrl}}" },
            ].map(t=>(
              <div key={t.key} className="p-3 rounded-xl bg-surface border border-white/5">
                <span className="font-bold text-brand-accent block">{t.key} — {t.label}</span>
                <span className="text-text-muted">{t.tpl}</span>
                <span className="block text-[10px] text-text-muted mt-1">Tokens: {"{{orderNumber}} {{customerName}} {{totalIdr}} {{trackingNumber}} {{invoiceUrl}}"}</span>
              </div>
            ))}
            <p className="text-[10px] text-text-muted">Edit template via code/src/lib/notifications/whatsapp.ts atau tambahkan tabel NotificationTemplate (id, key, bodyTemplate) untuk edit tanpa deploy — sesuai blueprint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
