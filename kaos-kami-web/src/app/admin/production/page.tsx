"use client";

import React, { useState } from "react";
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
  Clock,
  Printer,
  Flame,
  CheckCircle2,
  Package,
  FileText,
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

export default function ProductionKanbanPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<ProductionTaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data, isLoading, refetch } = useQuery<{ success: boolean; tasks: ProductionTaskItem[] }>({
    queryKey: ["production-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/production-tasks");
      return res.json();
    },
    refetchInterval: 10000,
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

  const handleDragStart = (event: DragStartEvent) => {
    const task = (event.active.data.current as any)?.task as ProductionTaskItem;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    // over could be column id or task id; determine target stage
    let targetStage = overId;
    // If over is a task, find its stage
    const overTask = (over.data.current as any)?.task as ProductionTaskItem | undefined;
    if (overTask) targetStage = overTask.stage;
    // Validate stage exists
    if (!STAGES.find((s) => s.id === targetStage)) {
      // Check if overId is column id
      const col = STAGES.find((s) => s.id === overId);
      if (col) targetStage = col.id;
      else return;
    }
    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!activeTaskData || activeTaskData.stage === targetStage) return;
    moveTaskMutation.mutate({ taskId: activeId, stage: targetStage });
  };

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

      {/* Kanban Board Horizontal Columns — Drag & Drop via @dnd-kit (BLUEPRINT-03 §3) */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
          {STAGES.map((col, colIdx) => {
            const colTasks = filteredTasks.filter((t) => t.stage === col.id);
            const Icon = col.icon;

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
                    {colTasks.map((task) => (
                      <SortableTaskCard key={task.id} task={task}>
                        <div className="p-3.5 rounded-xl bg-surface border border-white/10 hover:border-brand-accent/50 transition-all space-y-2.5 font-mono text-xs shadow-md cursor-grab active:cursor-grabbing">
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
                              {task.order.items?.[0]?.snapshotSize || "L"} · {task.order.items?.[0]?.snapshotColorName || "Hitam"} ·{" "}
                              {task.order.items?.[0]?.quantity || 1} pcs
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
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>INSPEKSI</span>
                              <ExternalLink size={10} />
                            </a>

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
                      </SortableTaskCard>
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
    </div>
  );
}

export const dynamic = 'force-dynamic';

