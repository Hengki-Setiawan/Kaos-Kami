import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  Printer,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  Package,
  MessageCircle,
  ArrowLeft,
  Ruler,
  Eye,
  Layers,
} from "lucide-react";
import OrderInspector3D from "@/components/admin/OrderInspector3D";
import { OrderAdminActions } from "@/components/admin/OrderAdminActions";
import { AdminWhatsAppDispatch } from "@/components/admin/AdminWhatsAppDispatch";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const order = await db.query.Order.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      items: { with: { design: { with: { category: true } } } },
      productionTasks: true,
      user: true,
      shippingAddress: true,
      payment: true,
      statusHistory: {
        orderBy: (t, { asc }) => asc(t.createdAt),
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Seed inspector: desain asli item pertama (decals + warna + ukuran).
  // Parse defensif: JSON rusak = inspector generik, bukan crash.
  let inspectorSeed: {
    decals: any[];
    colorHex: string;
    colorName: string;
    size: string;
    apparel: "tshirt" | "longsleeve" | "crewneck" | "hoodie" | "shirt";
  } | null = null;
  try {
    const first = order.items[0];
    const d: any = (first as any)?.design;
    if (d?.decals) {
      const decals = JSON.parse(d.decals);
      if (Array.isArray(decals)) {
        const slug = String((d as any)?.category?.slug || "").toLowerCase();
        inspectorSeed = {
          decals,
          colorHex: String((first as any)?.snapshotColorHex || d.colorHex || "#121214"),
          colorName: String((first as any)?.snapshotColorName || d.colorName || "Custom"),
          size: String((first as any)?.snapshotSize || "L"),
          apparel: (["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"].includes(slug) ? slug : "tshirt") as any,
        };
      }
    }
  } catch {}

  // Mask WA konsisten dengan daftar (/admin/orders + /admin/customers, UU PDP).
  function maskPhone(p?: string | null) {
    if (!p) return "-";
    return `${p.slice(0, 4)}****${p.slice(-2)}`;
  }

  // wa.me guard + normalisasi prefix Indonesia 62: 08… → 628…, 8… → 628…,
  // 62… tetap. Nomor kosong/invalid = tanpa link WA.
  const rawWa = order.user?.phoneNumber || order.shippingAddress?.phoneNumber || "";
  const waDigits = rawWa.replace(/[^0-9]/g, "");
  const waNormalized = waDigits.startsWith("62")
    ? waDigits
    : waDigits.startsWith("0")
      ? `62${waDigits.slice(1)}`
      : waDigits.length >= 9
        ? `62${waDigits}`
        : waDigits;
  const waMessage = encodeURIComponent(
    `*Halo ${order.user?.name || "Pelanggan"}*, update dari Workshop Kaos Kami mengenai pesanan Anda *${order.orderNumber}*:`
  );
  const waLink = waNormalized.length >= 11 ? `https://wa.me/${waNormalized}?text=${waMessage}` : null;

  // Rekap kebutuhan bahan polos (Blank Garment Pull Matrix) untuk tim workshop
  const blankSummary = order.items.reduce<Record<string, number>>((acc, it) => {
    const key = `${it.snapshotColorName || "Warna"} - Size ${it.snapshotSize || "Std"}`;
    acc[key] = (acc[key] || 0) + it.quantity;
    return acc;
  }, {});
  const totalBlanks = order.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Back Link */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-text-muted hover:text-brand-accent transition-colors"
      >
        <ArrowLeft size={14} />
        <span>KEMBALI KE DAFTAR PESANAN</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              ORDER #{order.orderNumber}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
              {order.status}
            </span>
          </div>
          <p className="text-text-muted mt-0.5">
            Dibuat pada {new Date(order.createdAt).toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-white font-bold transition-all flex items-center gap-1.5"
            >
              <MessageCircle size={14} />
              <span>CHAT WA CUSTOMER</span>
            </a>
          ) : (
            <span className="py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 text-text-muted font-bold">
              NO. WA TIDAK TERSEDIA
            </span>
          )}

          <a
            href={`/admin/orders/${order.id}/job-ticket`}
            target="_blank"
            className="py-2.5 px-3.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold transition-all flex items-center gap-1.5"
          >
            <Printer size={14} className="text-brand-accent" />
            <span>CETAK JOB TICKET (PDF)</span>
          </a>
          <a
            href={`/admin/orders/${order.id}/gang-sheet`}
            target="_blank"
            className="py-2.5 px-3.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold transition-all flex items-center gap-1.5"
          >
            <Layers size={14} className="text-brand-accent" />
            <span>GANG SHEET A3</span>
          </a>
          <Link
            href="/admin/gang-sheet"
            className="py-2.5 px-3.5 rounded-xl bg-amber-400 text-black font-black transition-all flex items-center gap-1.5 hover:brightness-110 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          >
            <Layers size={14} />
            <span>BUILDER GANG SHEET 100×58</span>
          </Link>
        </div>
        <OrderAdminActions
          orderId={order.id}
          currentTracking={order.trackingNumber}
          orderStatus={order.status}
          deliveryMethod={order.deliveryMethod}
        />
      </div>

      {/* 360° 3D Inspector (BLUEPRINT-03 §5) — Orbit untuk verifikasi visual operator */}
      <div className="rounded-2xl bg-[#141416] border border-white/5 p-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Eye size={14} className="text-brand-accent" />
          <span>INSPEKSI VISUAL 360° — VERIFIKASI MODEL 3D PESANAN</span>
        </h2>
        <div className="h-[420px] rounded-xl overflow-hidden border border-white/10 bg-[#0E0E10] relative">
          <OrderInspector3D seed={inspectorSeed} />
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-[10px] font-mono text-white border border-white/10">
            Drag untuk rotasi 360° • Scroll untuk zoom • Cocokkan dengan Job Ticket dimensi
          </div>
        </div>
        <p className="text-[11px] font-mono text-text-muted">
          {inspectorSeed
            ? "Menampilkan desain asli pesanan (warna, ukuran & sablon item pertama). Cocokkan dengan Job Ticket sebelum film DTF dicetak."
            : "Desain kustom tidak tersimpan — tampil model generik. Cocokkan manual dengan Job Ticket."}
        </p>
      </div>

      {/* Main Grid: Workshop Specs & Customer Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Production Specs & High-Res Vault */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Ticket / Physical Dimension Card */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Ruler size={14} className="text-brand-accent" />
              <span>SPESIFIKASI TEKNIS CETAK SABLON (JOB TICKET)</span>
            </h2>

            {/* Rekap Blank Garment Warehouse Pull Matrix */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-amber-400 shrink-0" />
                <span className="font-bold text-white uppercase text-[11px]">
                  Bahan Kaos Polos Gudang ({totalBlanks} pcs):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(blankSummary).map(([spec, count]) => (
                  <span
                    key={spec}
                    className="px-2 py-0.5 rounded-md bg-white/10 text-white font-bold text-[10px]"
                  >
                    {spec}: <strong className="text-amber-400">{count} pcs</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface/60 border border-white/5 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white text-sm block">
                        #{idx + 1}. {item.snapshotName}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Ukuran: <strong className="text-white">{item.snapshotSize}</strong> · Warna:{" "}
                        <strong className="text-white">{item.snapshotColorName}</strong> · Qty:{" "}
                        <strong className="text-brand-accent">{item.quantity} pcs</strong>
                      </span>
                    </div>

                    <span className="font-bold text-white">
                      Rp {item.lineTotalIdr.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Physical DTF Calibration Limits — now from ProductionTask real dims */}
                  {(() => {
                    // Join eksplisit per item; TANPA fallback idx (audit H12/H14 —
                    // fallback bisa pasang dimensi item lain ke baris ini).
                    const task = order.productionTasks.find((t: any) => t.orderItemId === item.id);
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-black/50 border border-white/5 text-[11px]">
                        <div>
                          <span className="block text-text-muted">LEBAR CETAK (MAX 30CM):</span>
                          {task?.printWidthCm ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-bold text-emerald-400">
                                📏 {task.printWidthCm.toFixed(1)} cm
                              </span>
                              {task.printWidthCm <= 30.0 ? (
                                <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                  ✓ Aman DTF
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 text-[9px] rounded bg-rose-500/20 text-rose-300 font-bold">
                                  ⚠ Over 30cm
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-bold text-amber-400">⚠ Belum terukur — hitung di Studio</span>
                          )}
                        </div>
                        <div>
                          <span className="block text-text-muted">TINGGI CETAK:</span>
                          {task?.printHeightCm ? (
                            <span className="font-bold text-emerald-400 mt-0.5 block">📏 {task.printHeightCm.toFixed(1)} cm</span>
                          ) : (
                            <span className="font-bold text-amber-400">⚠ Belum terukur</span>
                          )}
                        </div>
                        <div>
                          <span className="block text-text-muted">JARAK DARI KERAH:</span>
                          {task?.offsetFromCollarCm ? (
                            <span className="font-bold text-white mt-0.5 block">~{task.offsetFromCollarCm.toFixed(1)} cm di bawah rib</span>
                          ) : (
                            <span className="font-bold text-amber-400">⚠ Belum terukur</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* High-Res Asset Download for AcroRIP — R2 rawAssetUrl or 3D snapshot */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {(() => {
                      const task = order.productionTasks.find((t: any) => t.orderItemId === item.id);
                      const rawUrl = (task as any)?.rawAssetUrl || (task as any)?.mockupPreviewUrl || (task as any)?.printFileUrl;
                      return rawUrl ? (
                        <a
                          href={rawUrl}
                          target="_blank"
                          download={`master-${order.orderNumber}-${idx + 1}.png`}
                          className="py-2 px-3 rounded-lg bg-brand-accent/20 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent hover:text-canvas transition-all font-bold text-[11px] flex items-center gap-1.5"
                        >
                          <Download size={13} />
                          <span>DOWNLOAD ASET MASTER RAW (300 DPI)</span>
                        </a>
                      ) : (
                        <span className="py-2 px-3 rounded-lg bg-surface border border-white/10 text-text-muted text-[11px] flex items-center gap-1.5">
                          <Download size={13} />
                          <span>Master 300 DPI: Menunggu upload operator (R2)</span>
                        </span>
                      );
                    })()}
                    <a
                      href={`/admin/orders/${order.id}/job-ticket`}
                      target="_blank"
                      className="py-2 px-3 rounded-lg bg-surface border border-white/10 hover:border-brand-accent text-white font-bold text-[11px] flex items-center gap-1.5"
                    >
                      <FileText size={13} className="text-brand-accent" />
                      <span>JOB TICKET PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Clock size={14} className="text-brand-accent" />
              <span>RIWAYAT STATUS & AUDIT LOG PRODUKSI</span>
            </h2>

            <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-surface/30">
              {order.statusHistory.map((hist) => (
                <div key={hist.id} className="p-3 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="font-bold text-white block">{hist.status}</span>
                    <span className="text-text-muted">{hist.note || "Perubahan status sistem"}</span>
                  </div>
                  <span className="text-text-muted whitespace-nowrap">
                    {new Date(hist.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Komplain customer (event bertanda [KOMPLAIN:KATEGORI] — POST /api/complaints) */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <MessageCircle size={14} className="text-amber-400" />
              <span>KOMPLAIN CUSTOMER</span>
            </h2>

            {(() => {
              const complaints = order.statusHistory.filter((h: any) =>
                typeof h.note === "string" && h.note.startsWith("[KOMPLAIN")
              );
              if (complaints.length === 0) {
                return (
                  <p className="text-[11px] font-mono text-text-muted">
                    Belum ada komplain untuk order ini.
                  </p>
                );
              }
              return (
                <div className="divide-y divide-white/5 border border-amber-500/20 rounded-xl bg-amber-500/[0.04]">
                  {complaints.map((c: any) => {
                    const m = String(c.note || "").match(/^\[KOMPLAIN:?([^\]]*)\]\s*([\s\S]*)$/);
                    const category = (m?.[1] || "LAINNYA").trim() || "LAINNYA";
                    const rest = (m?.[2] || String(c.note || "")).trim();
                    const photoIdx = rest.indexOf("| Foto: ");
                    const message = photoIdx >= 0 ? rest.slice(0, photoIdx).trim() : rest;
                    const photo = photoIdx >= 0 ? rest.slice(photoIdx + "| Foto: ".length).trim() : null;
                    return (
                      <div key={c.id} className="p-3 space-y-1.5 text-[11px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {category}
                          </span>
                          <span className="text-text-muted">
                            status saat lapor: <strong className="text-white">{c.status}</strong>
                          </span>
                          <span className="text-text-muted ml-auto whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-white leading-relaxed">{message || "(tanpa pesan)"}</p>
                        {photo && (
                          <a
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-accent hover:underline font-bold"
                          >
                            <Eye size={12} />
                            <span>LIHAT FOTO BUKTI</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Catatan review desain (marker [REVIEW...]/[DITOLAK...] dari /api/admin/orders/[id]/review) */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <FileText size={14} className="text-brand-accent" />
              <span>CATATAN REVIEW DESAIN</span>
            </h2>

            {(() => {
              const RE_REVIEW_NOTE = /(\[REVIEW|REVIEW:|DITOLAK|DISETUJUI|ditolak|disetujui|REJECT|templateId|resolusi-kurang|luar-area-cetak|warna-tak-cetak|font-tipis)/i;
              const notes = order.statusHistory.filter(
                (h: any) =>
                  !String(h.note || "").startsWith("[KOMPLAIN") && RE_REVIEW_NOTE.test(String(h.note || ""))
              );
              if (notes.length === 0) {
                return (
                  <p className="text-[11px] font-mono text-text-muted">
                    Belum ada catatan review — putuskan via{" "}
                    <Link href="/admin/review" className="text-brand-accent hover:underline font-bold">
                      ANTREAN REVIEW
                    </Link>
                    .
                  </p>
                );
              }
              return (
                <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-surface/30">
                  {notes.map((h: any) => (
                    <div key={h.id} className="p-3 flex justify-between items-start gap-3 text-[11px]">
                      <div className="min-w-0">
                        <span className="font-bold text-white block">{h.status}</span>
                        <span className="text-text-muted break-words">{h.note || "Catatan review"}</span>
                      </div>
                      <span className="text-text-muted whitespace-nowrap shrink-0">
                        {new Date(h.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="space-y-6">
          {/* Quick WhatsApp Dispatch Module */}
          <AdminWhatsAppDispatch
            recipientName={order.shippingAddress?.recipientName || order.user?.name || "Pelanggan"}
            phoneNumber={order.user?.phoneNumber || order.shippingAddress?.phoneNumber}
            orderNumber={order.orderNumber}
            orderStatus={order.status}
            deliveryMethod={order.deliveryMethod}
            trackingNumber={order.trackingNumber}
          />

          {/* Customer & Shipping Card */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Package size={14} className="text-brand-accent" />
              <span>INFO PELANGGAN & PENGIRIMAN</span>
            </h2>

            <div className="space-y-2">
              <div>
                <span className="block text-text-muted text-[10px]">NAMA PEMESAN:</span>
                <span className="font-bold text-white text-sm">
                <span className="font-bold text-white text-sm">
                  {order.shippingAddress?.recipientName || order.user?.name || "Pelanggan"}
                </span>
                </span>
              </div>
              <div>
                <span className="block text-text-muted text-[10px]">WHATSAPP:</span>
                <span className="font-bold text-brand-accent">
                  {maskPhone(order.user?.phoneNumber || order.shippingAddress?.phoneNumber)}
                </span>
              </div>
              <div>
                <span className="block text-text-muted text-[10px]">METODE PENGIRIMAN:</span>
                <span className="font-bold text-white">{order.deliveryMethod}</span>
              </div>
              <div>
                <span className="block text-text-muted text-[10px]">ALAMAT LENGKAP:</span>
                <p className="text-text-muted leading-relaxed">
                  {order.shippingAddress?.fullAddress || "Ambil di Workshop Kaos Kami (Self Pick-up)"}
                </p>
              </div>
              {order.courierNotes && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px]">
                  <strong>Catatan:</strong> {order.courierNotes}
                </div>
              )}
            </div>
          </div>

          {/* Payment Card */}
          <div className="p-5 rounded-2xl bg-[#141416] border border-white/5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-accent" />
              <span>RINGKASAN PEMBAYARAN</span>
            </h2>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal Kaos</span>
                <span>Rp {order.subtotalIdr.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Ongkos Kirim</span>
                <span>Rp {order.shippingCostIdr.toLocaleString("id-ID")}</span>
              </div>
              {order.discountIdr > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Diskon kupon</span>
                  <span>−Rp {order.discountIdr.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-sm font-bold text-white">
                <span>TOTAL:</span>
                <span className="text-brand-accent text-base">
                  Rp {order.totalIdr.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="pt-2 space-y-1 border-t border-white/5">
                <div className="flex justify-between text-text-muted">
                  <span>Metode</span>
                  <span className="text-white font-bold">{order.payment?.method || "—"}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Status bayar</span>
                  <span className="text-white font-bold">{order.payment?.status || "—"}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Referensi</span>
                  <span className="text-white font-bold break-all text-right max-w-[60%]">{order.payment?.providerRef || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
