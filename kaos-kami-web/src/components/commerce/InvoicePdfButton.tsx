"use client";

import React, { useState } from "react";
import { FileDown } from "lucide-react";

interface PdfOrderItem {
  snapshotName?: string | null;
  snapshotSize?: string | null;
  snapshotColorName?: string | null;
  quantity?: number | null;
  lineTotalIdr?: number | null;
}

interface PdfOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalIdr: number;
  subtotalIdr?: number | null;
  shippingCostIdr?: number | null;
  discountIdr?: number | null;
  trackingNumber?: string | null;
  deliveryMethod?: string | null;
  createdAt: string | Date;
  items?: PdfOrderItem[] | null;
}

/**
 * U13: unduh invoice PDF satu-klik (client-side jspdf, tanpa server render).
 * Props fleksibel: terima `order` (dipakai invoice page) ATAU fetch ringan
 * `/api/mobile/orders/[id]/status` + item ringkas bila hanya orderId.
 */
export function InvoicePdfButton({ order, orderId }: { order?: PdfOrder; orderId?: string }) {
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true);
    try {
      let o = order;
      if (!o && orderId) {
        const res = await fetch(`/api/mobile/orders/${orderId}/status`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error("Gagal memuat data invoice");
        o = {
          id: orderId,
          orderNumber: String(data.orderNumber || orderId.slice(0, 8)),
          status: String(data.status || ""),
          totalIdr: Number(data.totalIdr || 0),
          trackingNumber: data.trackingNumber,
          deliveryMethod: data.deliveryMethod,
          createdAt: data.createdAt || new Date().toISOString(),
          items: Array.isArray(data.items)
            ? data.items.map((it: any) => ({
                snapshotName: it.snapshotName,
                snapshotSize: it.snapshotSize,
                snapshotColorName: it.snapshotColorName,
                quantity: it.quantity,
                lineTotalIdr: it.lineTotalIdr,
              }))
            : [],
        };
      }
      if (!o) throw new Error("Data invoice kosong");
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a5" });
      const idr = (n: number | null | undefined) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;
      let y = 14;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("KAOS KAMI MAKASSAR — INVOICE", 10, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Spesialis Sablon DTF & 3D Customizer · Tallo, Makassar 90211", 10, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`No: ${o.orderNumber}`, 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`Status: ${String(o.status).replace(/_/g, " ")}`, 10, y);
      y += 5;
      doc.text(`Tanggal: ${new Date(o.createdAt).toLocaleString("id-ID")}`, 10, y);
      y += 5;
      if (o.trackingNumber) {
        doc.text(`Resi: ${o.trackingNumber}`, 10, y);
        y += 5;
      }
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.text("RINCIAN:", 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      for (const it of o.items || []) {
        const line = `• ${it.snapshotName || "Item"} (${it.snapshotSize || "-"}/${it.snapshotColorName || "-"}) x${it.quantity || 1} — ${idr(it.lineTotalIdr)}`;
        const wrapped = doc.splitTextToSize(line.slice(0, 200), 128);
        doc.text(wrapped, 10, y);
        y += wrapped.length * 4.5;
        if (y > 185) {
          doc.addPage();
          y = 14;
        }
      }
      y += 3;
      if (o.subtotalIdr != null) {
        doc.text(`Subtotal: ${idr(o.subtotalIdr)}`, 10, y);
        y += 5;
      }
      if (o.shippingCostIdr != null) {
        doc.text(`Ongkir: ${idr(o.shippingCostIdr)}`, 10, y);
        y += 5;
      }
      if ((o.discountIdr || 0) > 0) {
        doc.text(`Diskon: -${idr(o.discountIdr)}`, 10, y);
        y += 5;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`TOTAL: ${idr(o.totalIdr)}`, 10, y + 2);
      doc.save(`KK-${o.orderNumber}.pdf`);
    } catch (e: any) {
      try {
        alert(e?.message || "Gagal membuat PDF");
      } catch {}
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void build()}
      disabled={busy}
      className="px-3.5 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary font-bold hover:text-brand-accent transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
    >
      <FileDown size={13} className="text-brand-accent" />
      <span>{busy ? "MEMBUAT PDF…" : "UNDUH PDF"}</span>
    </button>
  );
}
