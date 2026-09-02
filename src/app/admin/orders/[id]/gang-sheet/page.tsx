import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";

// Gang Sheet A3 30cm — susun semua decal order jadi 1 lembar film DTF siap print (Cethak workflow)
export default async function GangSheetPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, productionTasks: true },
  });
  if (!order) notFound();
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white p-6 font-mono text-xs max-w-6xl mx-auto space-y-4">
      <Link href={`/admin/orders/${params.id}`} className="text-text-muted hover:text-white">← Kembali Detail</Link>
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl font-black uppercase">GANG SHEET A3 — {order.orderNumber}</h1>
        <span className="px-3 py-1 rounded-full bg-brand-accent text-canvas font-bold">30cm ROLL</span>
      </div>
      <div className="bg-white text-black p-4 rounded-2xl" style={{ width: "30cm", minHeight: "42cm", margin: "0 auto" }}>
        <div className="border-2 border-dashed border-black/20 p-4 grid grid-cols-2 gap-4">
          {order.productionTasks.map((t: any, idx: number) => (
            <div key={t.id} className="border border-black p-3 text-center">
              <div className="text-[10px] text-zinc-500">#{idx+1} {t.placementSide} — {t.printWidthCm?.toFixed(1)}×{t.printHeightCm?.toFixed(1)}cm offset {t.offsetFromCollarCm?.toFixed(1)}cm</div>
              <div className="mt-2 h-32 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.mockupPreviewUrl ? <img src={t.mockupPreviewUrl} alt="preview" className="max-h-32" /> : "Preview 300 DPI"}
              </div>
              <div className="text-[9px] mt-1">{t.notes || order.items[idx]?.snapshotName}</div>
            </div>
          ))}
          {order.productionTasks.length===0 && <div className="col-span-2 text-center py-12 text-zinc-400">Belum ada task — tunggu settlement</div>}
        </div>
        <p className="text-[9px] text-zinc-500 mt-2 text-center">Cetak: Film PET 30cm → tabur powder → oven 160°C 120s → press 165°C 15s — via R2 `printFileUrl`</p>
      </div>
      <div className="flex gap-2 justify-center print:hidden">
        <button onClick={()=>window.print()} className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold">CETAK GANG SHEET PDF</button>
        <a href={`/admin/orders/${params.id}/job-ticket`} className="px-4 py-2 rounded-xl bg-surface border border-white/10 text-white font-bold">JOB TICKET</a>
      </div>
    </div>
  );
}
