import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Printer, ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/PrintButton";

interface JobTicketPageProps {
  params: { id: string };
}

export const revalidate = 0;

export default async function JobTicketPage({ params }: JobTicketPageProps) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: true,
      shippingAddress: true,
      productionTasks: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-black p-8 font-mono text-xs max-w-3xl mx-auto print:p-0 print:max-w-full">
      {/* Print Controls (Hidden when printing) */}
      <div className="mb-6 flex justify-between items-center print:hidden border-b pb-4">
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-gray-600 hover:text-black flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Detail Order</span>
        </Link>
        <PrintButton />
      </div>

      {/* Printable Job Ticket Sheet */}
      <div className="border-4 border-black p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              KAOS KAMI — PRODUCTION JOB TICKET
            </h1>
            <p className="text-sm font-bold text-gray-700">WORKSHOP SABLON DTF MAKASSAR</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-black block">{order.orderNumber}</span>
            <span className="text-[11px] text-gray-600 block">
              {new Date(order.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Priority & Turnaround Banner */}
        <div className="p-2 border-2 border-black bg-gray-100 flex justify-between items-center font-bold">
          <span>
            PRIORITAS: {order.courierNotes?.includes("EXPRESS") ? "⚡ EXPRESS 24 JAM" : "REGULER"}
          </span>
          <span>PENGIRIMAN: {order.deliveryMethod}</span>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-4 border-b pb-4">
          <div>
            <span className="block text-gray-500 text-[10px]">NAMA PEMESAN:</span>
            <strong className="text-sm">{order.shippingAddress?.recipientName || order.user.name}</strong>
          </div>
          <div>
            <span className="block text-gray-500 text-[10px]">NO. WHATSAPP:</span>
            <strong className="text-sm">{order.user.phoneNumber || "-"}</strong>
          </div>
        </div>

        {/* Technical DTF Specifications Table */}
        <div className="space-y-2">
          <h3 className="font-black text-sm uppercase tracking-wider">
            SPESIFIKASI OPERATOR PRESS & CETAK:
          </h3>
          <table className="w-full border-collapse border border-black text-left">
            <thead>
              <tr className="bg-gray-200 border-b border-black">
                <th className="p-2 border border-black">ITEM & WARNA</th>
                <th className="p-2 border border-black">UKURAN</th>
                <th className="p-2 border border-black">QTY</th>
                <th className="p-2 border border-black">BATAS LEBAR DTF</th>
                <th className="p-2 border border-black">POSISI & JARAK KERAH</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => {
                const task = (order.productionTasks as any[]).find((t) => t.orderItemId === item.id) || (order.productionTasks as any[])[idx];
                return (
                  <tr key={item.id} className="border-b border-black">
                    <td className="p-2 border border-black font-bold">
                      #{idx + 1}. {item.snapshotName} ({item.snapshotColorName})
                    </td>
                    <td className="p-2 border border-black font-bold text-center">{item.snapshotSize}</td>
                    <td className="p-2 border border-black font-bold text-center">{item.quantity} pcs</td>
                    <td className="p-2 border border-black font-bold">
                      {(task?.printWidthCm || 28.5).toFixed(1)} × {(task?.printHeightCm || 16).toFixed(1)} cm (Maks 30cm)
                    </td>
                    <td className="p-2 border border-black">
                      {(task?.placementSide || "front") === "back" ? "Punggung" : "Dada Depan"} (~{(task?.offsetFromCollarCm || 7.5).toFixed(1)} cm dari rib)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Operator Quality Checklist */}
        <div className="border-2 border-black p-4 space-y-2">
          <h4 className="font-bold text-xs uppercase">CHECKLIST WORKSHOP OPERATOR:</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>File 300 DPI siap cetak (No background)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Oven Powder Curing 160°C (120 detik)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Heat Press ke Kain 165°C (15 detik)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Cold Peel + Finishing Press (5 detik)</span>
            </label>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[10px]">
          <div>
            <div className="border-b border-black h-12 mb-1" />
            <span>Operator Desain / RIP</span>
          </div>
          <div>
            <div className="border-b border-black h-12 mb-1" />
            <span>Operator Press & Sablon</span>
          </div>
          <div>
            <div className="border-b border-black h-12 mb-1" />
            <span>Staff QC & Packaging</span>
          </div>
        </div>
      </div>
    </div>
  );
}
