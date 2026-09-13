"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Layers,
  Printer,
  Flame,
  CheckCircle2,
  Package,
  FileText,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Search,
  ChevronDown,
  Users,
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
  printFileUrl: string | null;
  dueDate: string | null;
  assignedToUserId: string | null;
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
  { id: "DESIGN_PREP", label: "Persiapan File", icon: FileText, color: "border-blue-500/40 text-blue-400" },
  { id: "SCREEN_PRINT_SETUP", label: "Setup DTF Film", icon: Layers, color: "border-cyan-500/40 text-cyan-400" },
  { id: "PRINTING", label: "Sedang Dicetak DTF", icon: Printer, color: "border-brand-accent/40 text-brand-accent" },
  { id: "PRESSING", label: "Heat Press Kaos", icon: Flame, color: "border-amber-500/40 text-amber-400" },
  { id: "QUALITY_CHECK", label: "Quality Check", icon: CheckCircle2, color: "border-purple-500/40 text-purple-400" },
  { id: "PACKAGING", label: "Packing & Siap", icon: Package, color: "border-emerald-500/40 text-emerald-400" },
  { id: "DONE", label: "Selesai", icon: CheckCircle2, color: "border-emerald-600/40 text-emerald-500" },
];

function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "ring-2 ring-brand-accent/50 bg-brand-accent/5" : ""}`}>
      {children}
    </div>
  );
}

function SortableTaskCard({ task, children }: { task: ProductionTaskItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { task } });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// M4.1 — GROUPING TEAMWEAR (presentasi saja, TANPA ubah aksi/API).
// Fakta struktur data (dipilih yang aman — badge + grup, bukan klaim "nama tim"):
// - ProductionTask lahir PER DECAL (confirmOrder spawnOne per decal), BUKAN per
//   jersey. Jadi "orderId dengan >1 task" versi spec = definisi UI untuk order
//   bulk/teamwear di papan ini (order custom 1-desain-3-decal pun ikut >1).
// - Tak ada kolom teamName/teamwearFlag di API (items hanya snapshotName/Size/
//   ColorName/qty; notes = "Item: <snapshotName> (...) — <label>"). Nama tim
//   tak bisa ditampilkan jujur → header grup pakai orderNumber + nama pemesan
//   (order.user.name) + total pcs + agregat stage, TANPA mengarang nama tim.
// - Heuristik jersey (badge TEAMWEAR vs BULK): snapshotName/notes cocok pola
//   "Jersey <nama> #<nomor>" (TeamwearPanel: `Jersey ${nama} #${nomor}`).
//   Tak cocok → label jujur "BULK". Filter ?teamwear=1 = orderId dengan >1 task.
// - Aksi claim/advance TETAP per-task (per task.id) di dalam grup — grup hanya
//   wadah visual expandable per (kolom stage × orderId) agar drag antar-kolom
//   @dnd-kit tak berubah (SortableContext tetap flat per kolom).
// ---------------------------------------------------------------------------
function orderTotalPcs(order: ProductionTaskItem["order"]): number {
  try {
    return (order?.items || []).reduce((a, it) => a + (it?.quantity || 0), 0) || 1;
  } catch {
    return 1;
  }
}

function taskLooksLikeJersey(t: ProductionTaskItem): boolean {
  try {
    const hay = [
      t?.notes || "",
      ...((t?.order?.items || []).map((it: any) => it?.snapshotName || "")),
    ].join(" ");
    return /^jersey\s/i.test(hay.trim()) || /jersey\s.+#\d/i.test(hay);
  } catch {
    return false;
  }
}

function teamwearBadgeFor(orderTasks: ProductionTaskItem[]): string | null {
  if (orderTasks.length <= 1) return null;
  // Semua task satu order membawa objek order yang sama → pcs dari task pertama.
  const orderPcs = orderTotalPcs(orderTasks[0]!.order);
  const jersey = orderTasks.some(taskLooksLikeJersey);
  return `${jersey ? "TEAMWEAR" : "BULK"} ${orderPcs} pcs · ${orderTasks.length} task`;
}

export default function ProductionKanbanPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<ProductionTaskItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; tasks: ProductionTaskItem[] }>({
    queryKey: ["production-tasks"],
    queryFn: async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch("/api/admin/production-tasks", { signal: ctrl.signal });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.error) {
          throw new Error(data?.error || `Server ${res.status}`);
        }
        return data;
      } finally {
        clearTimeout(t);
      }
    },
    refetchInterval: 10000,
  });

  const moveTaskMutation = useMutation({    mutationFn: async ({ taskId, stage }: { taskId: string; stage: string }) => {
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, stage }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Gagal pindah (${res.status})`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
    },
    onError: (e: any) => {
      setActionError(e?.message || "Gagal memindahkan task. Cek koneksi lalu coba lagi.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const claimTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, claim: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Gagal ambil (${res.status})`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
    },
    onError: (e: any) => {
      setActionError(e?.message || "Gagal mengambil task.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = (event.active.data.current as any)?.task as ProductionTaskItem;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActionError(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    // over bisa kolom ATAU task: baca stage dari over.data (audit H10 —
    // drop ke task tanpa ini gagal diam-diam).
    let targetStage = overId;
    const overTask = (over.data.current as any)?.task as ProductionTaskItem | undefined;
    if (overTask) targetStage = overTask.stage;
    if (!STAGES.find((s) => s.id === targetStage)) {
      setActionError("Drop di luar kolom stage — seret ke salah satu kolom tahapan.");
      return;
    }
    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!activeTaskData || activeTaskData.stage === targetStage) return;
    moveTaskMutation.mutate({ taskId: activeId, stage: targetStage });
  };

  const tasks = (data?.tasks || []).filter((t) => t && t.order);
  const filteredTasks = tasks.filter((t) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      t.order?.orderNumber || "",
      t.order?.user?.name || "",
      ...(t.order?.items || []).map((it: any) => it?.snapshotName || ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  // M4.1 — state grup teamwear (UI-only): orderId dengan >1 task di papan.
  // teamwearOnly diinisialisasi dari ?teamwear=1 (deep-link filter untuk mandor).
  const [teamwearOnly, setTeamwearOnly] = useState(false);
  // Grup default TERBUKA (expanded) agar alur claim/advance tak berubah —
  // collapse murni opsional per grup untuk merapikan kolom.
  const [collapsedOrders, setCollapsedOrders] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("teamwear") === "1") setTeamwearOnly(true);
    } catch {}
  }, []);
  // Hitung task per orderId dari SELURUH papan (bukan per kolom) — definisi
  // "order teamwear yang sama" versi spec: group by orderId dengan >1 task.
  const countByOrder = useMemo(() => {
    const m = new Map<string, ProductionTaskItem[]>();
    for (const t of tasks) {
      const arr = m.get(t.orderId) || [];
      arr.push(t);
      m.set(t.orderId, arr);
    }
    return m;
  }, [tasks]);
  const teamwearOrderCount = useMemo(
    () => [...countByOrder.values()].filter((a) => a.length > 1).length,
    [countByOrder]
  );
  // Agregat stage per orderId (status agregat header grup, lintas kolom).
  const stageAggByOrder = useMemo(() => {
    const m = new Map<string, string>();
    for (const [oid, arr] of countByOrder) {
      if (arr.length <= 1) continue;
      const per: Record<string, number> = {};
      for (const t of arr) per[t.stage] = (per[t.stage] || 0) + 1;
      m.set(oid, Object.entries(per).map(([s, n]) => `${s}×${n}`).join(" · "));
    }
    return m;
  }, [countByOrder]);
  const visibleTasks = teamwearOnly
    ? filteredTasks.filter((t) => (countByOrder.get(t.orderId) || []).length > 1)
    : filteredTasks;
  const toggleTeamwearFilter = () => {
    setTeamwearOnly((v) => {
      const next = !v;
      try {
        const url = new URL(window.location.href);
        if (next) url.searchParams.set("teamwear", "1");
        else url.searchParams.delete("teamwear");
        window.history.replaceState(null, "", url.toString());
      } catch {}
      return next;
    });
  };
  const toggleCollapse = (orderId: string) =>
    setCollapsedOrders((p) => ({ ...p, [orderId]: !p[orderId] }));

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

          {/* M4.1 — filter ?teamwear=1: hanya orderId dengan >1 task (bulk/teamwear).
              Toggle sinkron ke URL agar bisa dibagikan ke mandor. */}
          <button
            type="button"
            onClick={toggleTeamwearFilter}
            aria-pressed={teamwearOnly}
            title="Tampilkan hanya order teamwear/bulk (orderId dengan >1 task)"
            className={`px-3 py-2 rounded-xl border font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              teamwearOnly
                ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                : "bg-surface border-white/10 text-text-muted hover:text-white"
            }`}
          >
            <Users size={13} />
            <span>TEAMWEAR{teamwearOrderCount > 0 ? ` (${teamwearOrderCount})` : ""}</span>
          </button>
        </div>
      </div>
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 font-mono text-xs" role="alert">
          ⚠️ {actionError}
        </div>
      )}

      {/* Kanban Board Horizontal Columns — Drag & Drop via @dnd-kit (BLUEPRINT-03 §3) */}
      {isError && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 font-mono text-xs flex items-center justify-between" role="alert">
          <span>Gagal memuat antrean produksi. Periksa koneksi server.</span>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-lg bg-rose-500/20 font-bold">
            COBA LAGI
          </button>
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 pb-4 items-start" aria-busy="true" aria-label="Memuat antrean produksi">
          {STAGES.map((col) => (
            <div key={col.id} className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-3 min-w-[260px] animate-pulse">
              <div className="h-4 rounded bg-white/10 w-2/3" />
              <div className="h-24 rounded-xl bg-white/5" />
              <div className="h-24 rounded-xl bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
          {STAGES.map((col, colIdx) => {
            const colTasks = visibleTasks.filter((t) => t.stage === col.id);
            const Icon = col.icon;
            // M4.1 — partisi kolom: task yang order-nya multi-task (board-wide
            // countByOrder) masuk grup expandable per orderId di kolom ini.
            // Singleton (1 task) tetap kartu biasa. SortableContext di bawah
            // tetap flat (semua id) agar drag antar-kolom tak berubah.
            const colGroupMap = new Map<string, ProductionTaskItem[]>();
            for (const t of colTasks) {
              if ((countByOrder.get(t.orderId) || []).length > 1) {
                const arr = colGroupMap.get(t.orderId) || [];
                arr.push(t);
                colGroupMap.set(t.orderId, arr);
              }
            }
            const colGroups = [...colGroupMap.entries()].map(([orderId, tasksInCol]) => ({ orderId, tasksInCol }));

            return (
              <DroppableColumn
                key={col.id}
                id={col.id}
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

                {/* Task Cards — Sortable */}
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 flex-1 min-h-[100px]">
                    {/* M4.1 — header grup teamwear/bulk per orderId (expandable).
                        Kartu di bawah tetap per-task (claim/advance per task.id);
                        collapse hanya menyembunyikan kartu via CSS. */}
                    {colGroups.map((g) => {
                      const first = g.tasksInCol[0]!;
                      const boardTasks = countByOrder.get(g.orderId) || g.tasksInCol;
                      const badge = teamwearBadgeFor(boardTasks);
                      const pcs = orderTotalPcs(first.order);
                      const agg = stageAggByOrder.get(g.orderId);
                      const collapsed = !!collapsedOrders[g.orderId];
                      return (
                        <div key={`grp-${col.id}-${g.orderId}`} className="rounded-xl border border-brand-accent/30 bg-brand-accent/[0.05] p-2.5 space-y-1 font-mono">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(g.orderId)}
                            aria-expanded={!collapsed}
                            aria-label={`${collapsed ? "Buka" : "Tutup"} grup ${first.order.orderNumber}`}
                            className="w-full flex items-center justify-between gap-2 text-left"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-white min-w-0">
                              <Users size={12} className="text-brand-accent shrink-0" />
                              <span className="truncate">{first.order.orderNumber} · {first.order.user?.name || "Pelanggan"} · {pcs} pcs</span>
                            </span>
                            <ChevronDown size={13} className={`text-brand-accent shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                          </button>
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                            {badge && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-accent/20 border border-brand-accent/40 text-brand-accent font-bold">
                                {badge}
                              </span>
                            )}
                            {agg && <span className="text-text-muted">{agg}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {colTasks.map((task) => (
                      <div key={task.id} className={colGroupMap.has(task.orderId) && collapsedOrders[task.orderId] ? "hidden" : ""}>
                      <SortableTaskCard task={task}>
                        <div className="p-3.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent/50 transition-all space-y-2.5 font-mono text-xs shadow-md cursor-grab active:cursor-grabbing">
                          {/* Top Row: Order ID & Priority */}
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-brand-accent">{task.order.orderNumber}</span>
                            {/* M4.1 — badge per-task (aman): order multi-task → TEAMWEAR/BULK. */}
                            {(countByOrder.get(task.orderId) || []).length > 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/40">
                                {taskLooksLikeJersey(task) ? "TEAMWEAR" : "BULK"}
                              </span>
                            )}
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
                              {(task.order.items?.length || 0) > 1 && (
                                <span className="text-brand-accent"> +{(task.order.items?.length || 1) - 1} item</span>
                              )}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {task.order.items?.[0]?.snapshotSize || "L"} · {task.order.items?.[0]?.snapshotColorName || "Hitam"} ·{" "}
                              {task.order.items?.reduce((a, it) => a + (it.quantity || 0), 0) || 1} pcs
                            </p>
                          </div>

                          {/* DTF Print Dimensions */}
                          <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] space-y-0.5">
                            <span className="block text-text-muted">UKURAN CETAK (DTF):</span>
                            {task.printWidthCm && task.printHeightCm ? (
                              <span className="font-bold text-white block">
                                📏 {task.printWidthCm} cm × {task.printHeightCm} cm (Maks 30cm)
                              </span>
                            ) : (
                              <span className="font-bold text-amber-400 block">⚠ Belum terukur</span>
                            )}
                            {task.printFileUrl && (
                              <a
                                href={task.printFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500/25 transition-all"
                              >
                                <span>📄 FILE CETAK 300DPI</span>
                              </a>
                            )}
                            {task.dueDate && (
                              <span className="block text-text-muted mt-1">
                                🎯 Deadline: {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>

                          {/* Customer & Courier */}
                          <div className="text-[10px] text-text-muted flex justify-between border-t border-white/5 pt-2">
                            <span>{task.order.user?.name || "Pelanggan"}</span>
                            <span className="text-white font-bold">{task.order.deliveryMethod}</span>
                          </div>

                          {/* Move Stage Actions */}
                          <div className="pt-2 flex items-center justify-between border-t border-white/5">
                            <a
                              href={`/admin/orders/${task.orderId}`}
                              className="text-[10px] text-brand-accent hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>INSPEKSI</span>
                              <ExternalLink size={10} />
                            </a>

                            <div className="flex items-center gap-1.5">
                              {!task.assignedToUserId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    claimTaskMutation.mutate({ taskId: task.id });
                                  }}
                                  className="px-2.5 py-1 rounded bg-surface border border-white/15 text-white font-bold text-[10px] hover:border-brand-accent transition-all"
                                >
                                  <span>AMBIL</span>
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                                  DIPEGANG
                                </span>
                              )}
                              {colIdx < STAGES.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveTaskMutation.mutate({
                                      taskId: task.id,
                                      stage: STAGES[colIdx + 1]?.id ?? "DONE",
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded bg-brand-accent text-canvas font-bold text-[10px] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                                >
                                  <span>LANJUT</span>
                                  <ChevronRight size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </SortableTaskCard>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="p-6 text-center text-text-muted/60 text-[11px] font-mono border border-dashed border-white/5 rounded-xl">
                        Kosong — drag card ke sini
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="p-3.5 rounded-xl bg-surface border border-brand-accent shadow-2xl font-mono text-xs w-[260px] opacity-90">
              <span className="font-bold text-brand-accent">{activeTask.order.orderNumber}</span>
              <p className="font-bold text-white truncate">{activeTask.order.items?.[0]?.snapshotName}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';

