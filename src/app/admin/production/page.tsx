"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Clock,
  Printer,
  Flame,
  CheckCircle2,
  Package,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";

interface ProductionTaskItem {
  id: string;
  orderId: string;
  stage: string;
  priority: number;
  notes: string | null;
  printWidthCm: number | null;
  printHeightCm: number | null;
  placementSide: string | null;
  order: {
    orderNumber: string;
    deliveryMethod: string;
    courierNotes: string | null;
    user: {
      name: string;
      phoneNumber: string | null;
    };
    items: {
      snapshotName: string;
      snapshotSize: string;
      snapshotColorName: string;
      quantity: number;
    }[];
  };
}

const STAGES = [
  { id: "DESIGN_PREP", label: "Persiapan File", icon: Sparkles, color: "border-blue-500/40 text-blue-400" },
  { id: "PRINTING", label: "Sedang Dicetak DTF", icon: Printer, color: "border-brand-accent/40 text-brand-accent" },
  { id: "PRESSING", label: "Heat Press Kaos", icon: Flame, color: "border-amber-500/40 text-amber-400" },
  { id: "QUALITY_CHECK", label: "Quality Check", icon: CheckCircle2, color: "border-purple-500/40 text-purple-400" },
  { id: "PACKAGING", label: "Packing & Siap", icon: Package, color: "border-emerald-500/40 text-emerald-400" },
];

export default function ProductionKanbanPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, refetch } = useQuery<{ success: boolean; tasks: ProductionTaskItem[] }>({
    queryKey: ["production-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/production-tasks");
      return res.json();
    },
    refetchInterval: 10000, // Background auto-poll every 10s
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, stage }: { taskId: string; stage: string }) => {
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, stage }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
    },
  });

  const tasks = data?.tasks || [];

  const filteredTasks = tasks.filter((t) => {
    const q = searchTerm.toLowerCase();
    const firstItemName = t.order?.items?.[0]?.snapshotName || "";
    return (
      t.order.orderNumber.toLowerCase().includes(q) ||
      t.order.user.name.toLowerCase().includes(q) ||
      firstItemName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <Layers size={24} className="text-brand-accent" />
            <span>KANBAN PRODUKSI SABLON DTF</span>
          </h1>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            Manajemen alur cetak fisik workshop: File Prep $\rightarrow$ DTF Printhead $\rightarrow$ Heat Press $\rightarrow$ QC $\rightarrow$ Packing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pesanan / nama..."
              className="pl-9 pr-3.5 py-2 rounded-xl bg-surface border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-brand-accent"
            />
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-surface border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Refresh Antrean"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Kanban Board Horizontal Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
        {STAGES.map((col, colIdx) => {
          const colTasks = filteredTasks.filter((t) => t.stage === col.id);
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              className="bg-[#141416] border border-white/5 rounded-2xl p-4 flex flex-col space-y-3 min-w-[260px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <Icon size={14} className={col.color} />
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    {col.label}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full border border-white/5">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3 flex-1">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent/50 transition-all space-y-2.5 font-mono text-xs shadow-md"
                  >
                    {/* Top Row: Order ID & Priority */}
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-brand-accent">{task.order.orderNumber}</span>
                      {task.priority > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          ⚡ EXPRESS
                        </span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div>
                      <p className="font-bold text-white leading-tight">
                        {task.order.items?.[0]?.snapshotName || "Sablon DTF Apparel"}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {task.order.items?.[0]?.snapshotSize || "L"} · {task.order.items?.[0]?.snapshotColorName || "Hitam"} · {task.order.items?.[0]?.quantity || 1} pcs
                      </p>
                    </div>

                    {/* DTF Print Dimensions */}
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] space-y-0.5">
                      <span className="block text-text-muted">UKURAN CETAK (DTF):</span>
                      <span className="font-bold text-white block">
                        📏 {task.printWidthCm || 28.5} cm × {task.printHeightCm || 16.0} cm (Maks 30cm)
                      </span>
                    </div>

                    {/* Customer & Courier */}
                    <div className="text-[10px] text-text-muted flex justify-between border-t border-white/5 pt-2">
                      <span>{task.order.user.name}</span>
                      <span className="text-white font-bold">{task.order.deliveryMethod}</span>
                    </div>

                    {/* Move Stage Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-white/5">
                      <a
                        href={`/admin/orders/${task.orderId}`}
                        className="text-[10px] text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <span>INSPEKSI</span>
                        <ExternalLink size={10} />
                      </a>

                      {colIdx < STAGES.length - 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            moveTaskMutation.mutate({
                              taskId: task.id,
                              stage: STAGES[colIdx + 1]?.id ?? "PACKAGING",
                            })
                          }
                          className="px-2.5 py-1 rounded bg-brand-accent text-canvas font-bold text-[10px] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <span>LANJUT</span>
                          <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="p-6 text-center text-text-muted/60 text-[11px] font-mono border border-dashed border-white/5 rounded-xl">
                    Kosong
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

