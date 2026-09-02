import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Printer,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  Package,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Ruler,
  AlertCircle,
  Eye,
  Layers,
} from "lucide-react";
import dynamic from "next/dynamic";

const OrderInspector3D = dynamic(() => import("@/components/admin/OrderInspector3D"), { ssr: false });

interface AdminOrderDetailPageProps {
  params: { id: string };
}

export const revalidate = 0;

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      productionTasks: true,
      user: true,
      shippingAddress: true,
      payment: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const waMessage = encodeURIComponent(
    `*Halo ${order.user.name || "Pelanggan"}*, update dari Workshop Kaos Kami mengenai pesanan Anda *${order.orderNumber}*:`
  );
  const waLink = `https://wa.me/${order.user.phoneNumber?.replace(/[^0-9]/g, "")}?text=${waMessage}`;

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Back Link */}
      <Link
        href="/admin/production"
        className="inline-flex items-center gap-2 text-text-muted hover:text-brand-accent transition-colors"
      >
        <ArrowLeft size={14} />
        <span>KEMBALI KE KANBAN PRODUKSI</span>
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
          {order.user.phoneNumber && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-white font-bold transition-all flex items-center gap-1.5"
            >
              <MessageCircle size={14} />
              <span>CHAT WA CUSTOMER</span>
            </a>
          )}

          <a
            href={`/admin/orders/${order.id}/job-ticket`}
            target="_blank"
            className="py-2.5 px-3.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent text-white font-bold transition-all flex items-center gap-1.5"
          >
            <Printer size={14} className="text-brand-accent" />
            <span>CETAK JOB TICKET (PDF)</span>
          </a>
        </div>
      </div>

      {/* 360° 3D Inspector (BLUEPRINT-03 §5) — Orbit untuk verifikasi visual operator */}
      <div className="rounded-2xl bg-[#141416] border border-white/5 p-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Eye size={14} className="text-brand-accent" />
          <span>INSPEKSI VISUAL 360° — VERIFIKASI MODEL 3D PESANAN</span>
        </h2>
        <div className="h-[420px] rounded-xl overflow-hidden border border-white/10 bg-[#0E0E10] relative">
          <OrderInspector3D />
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-[10px] font-mono text-white border border-white/10">
            Drag untuk rotasi 360° • Scroll untuk zoom • Cocokkan dengan Job Ticket dimensi
          </div>
        </div>
        <p className="text-[11px] font-mono text-text-muted">
          Menampilkan prediktif mockup 3D sesuai warna & ukuran pesanan. Gunakan untuk konfirmasi penempatan sablon sebelum film DTF dicetak.
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
                    const task = order.productionTasks.find((t: any) => t.orderItemId === item.id) || order.productionTasks[idx];
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-black/50 border border-white/5 text-[11px]">
                        <div>
                          <span className="block text-text-muted">LEBAR CETAK (MAX 30CM):</span>
                          <span className="font-bold text-emerald-400">
                            📏 {(task?.printWidthCm || 28.5).toFixed(1)} cm (A3 DTF)
                          </span>
                        </div>
                        <div>
                          <span className="block text-text-muted">TINGGI CETAK:</span>
                          <span className="font-bold text-emerald-400">📏 {(task?.printHeightCm || 16.0).toFixed(1)} cm</span>
                        </div>
                        <div>
                          <span className="block text-text-muted">JARAK DARI KERAH:</span>
                          <span className="font-bold text-white">~{(task?.offsetFromCollarCm || 7.5).toFixed(1)} cm di bawah rib</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* High-Res Asset Download for AcroRIP — R2 rawAssetUrl or 3D snapshot */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {(() => {
                      const task = order.productionTasks.find((t: any) => t.orderItemId === item.id) || order.productionTasks[idx];
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
                  <span className="text-text-muted">
                    {new Date(hist.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Customer & Payment Details */}
        <div className="space-y-6">
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
                  {order.shippingAddress?.recipientName || order.user.name}
                </span>
              </div>
              <div>
                <span className="block text-text-muted text-[10px]">WHATSAPP:</span>
                <span className="font-bold text-brand-accent">
                  {order.user.phoneNumber || order.shippingAddress?.phoneNumber}
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
              <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-sm font-bold text-white">
                <span>TOTAL:</span>
                <span className="text-brand-accent text-base">
                  Rp {order.totalIdr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
