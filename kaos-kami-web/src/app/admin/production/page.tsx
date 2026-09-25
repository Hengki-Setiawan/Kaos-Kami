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
  Clock,
  Undo2,
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
  createdAt?: string | null;
  // ── Kolom defensif (API paralel mungkin belum ada → semua opsional) ──
  // GET production-tasks (asumsi): ?q=, courierNotes, dueDate, priority,
  // nama assignee (assignee/assignedTo). Bila belum ada, fallback di bawah.
  teamName?: string | null;
  teamwearFlag?: boolean | number | string | null;
  isExpress?: boolean | null;
  assignee?: { name?: string | null } | null;
  assignedTo?: { name?: string | null } | null;
  order: {
    orderNumber: string;
    deliveryMethod: string;
    courierNotes: string | null;
    teamName?: string | null;
    teamwearFlag?: boolean | number | string | null;
    isExpress?: boolean | null;
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
  { id: "DESIGN_PREP", label: "Persiapan File", icon: FileText, color: "border-blue-500/40 text-blue-700 dark:text-blue-400" },
  { id: "SCREEN_PRINT_SETUP", label: "Setup DTF Film", icon: Layers, color: "border-cyan-500/40 text-cyan-700 dark:text-cyan-400" },
  { id: "PRINTING", label: "Sedang Dicetak DTF", icon: Printer, color: "border-brand-accent/40 text-brand-accent" },
  { id: "PRESSING", label: "Heat Press Kaos", icon: Flame, color: "border-amber-500/40 text-amber-700 dark:text-amber-400" },
  { id: "QUALITY_CHECK", label: "Quality Check", icon: CheckCircle2, color: "border-purple-500/40 text-purple-700 dark:text-purple-400" },
  { id: "PACKAGING", label: "Packing & Siap", icon: Package, color: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" },
  { id: "DONE", label: "Selesai", icon: CheckCircle2, color: "border-emerald-600/40 text-emerald-700 dark:text-emerald-500" },
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
// UX WORKSHOP — helper kartu (defensif terhadap field API paralel yg mungkin
// belum ada: isExpress, nama assignee, courierNotes, teamName).
// ---------------------------------------------------------------------------

/** Nama pemegang task: pakai nama assignee dari API bila ada, fallback ID. */
function namaPemegang(t: ProductionTaskItem): string {
  const n =
    (typeof t.assignee?.name === "string" && t.assignee.name.trim()) ||
    (typeof t.assignedTo?.name === "string" && t.assignedTo.name.trim()) ||
    "";
  if (n) return n;
  if (t.assignedToUserId) return `Operator ${t.assignedToUserId.slice(0, 8)}…`;
  return "Belum dipegang";
}

function courierNotesOf(t: ProductionTaskItem): string {
  const v = t.order?.courierNotes ?? (t as { courierNotes?: unknown }).courierNotes;
  return typeof v === "string" ? v : "";
}

/** Badge EXPRESS konsisten: field API (isExpress/priority) dulu, fallback courierNotes/notes. */
function isExpressTask(t: ProductionTaskItem): boolean {
  if ((t.isExpress as boolean | null | undefined) === true) return true;
  if ((t.order as { isExpress?: unknown }).isExpress === true) return true;
  if ((t.priority ?? 0) > 0) return true;
  const hay = `${courierNotesOf(t)} ${t.notes || ""}`;
  return /express/i.test(hay);
}

function deadlineMs(t: ProductionTaskItem): number | null {
  if (!t.dueDate) return null;
  const ms = new Date(t.dueDate).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function isTelat(t: ProductionTaskItem): boolean {
  const ms = deadlineMs(t);
  return ms !== null && ms < Date.now();
}

/** Badge merah H-3: khusus express yg deadline-nya ≤3 jam lagi (belum lewat). */
function isH3Express(t: ProductionTaskItem): boolean {
  if (!isExpressTask(t)) return false;
  const ms = deadlineMs(t);
  if (ms === null) return false;
  const sisa = ms - Date.now();
  return sisa > 0 && sisa <= 3 * 3600 * 1000;
}

function formatDeadline(t: ProductionTaskItem): string {
  const ms = deadlineMs(t);
  if (ms === null) return "Tanpa deadline";
  const d = new Date(ms);
  const tgl = d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const sisaMs = ms - Date.now();
  if (sisaMs < 0) {
    const telatJam = Math.round(-sisaMs / 3600000);
    const label = telatJam >= 24 ? `${Math.round(telatJam / 24)} hari` : `${telatJam} jam`;
    return `${tgl} · TELAT ${label}`;
  }
  const sisaJam = sisaMs / 3600000;
  const rel = sisaJam >= 24 ? `H-${Math.ceil(sisaJam / 24)} hari` : `H-${Math.max(1, Math.ceil(sisaJam))} jam`;
  return `${tgl} · ${rel}`;
}

// ---------------------------------------------------------------------------
// TEAMWEAR BERBASIS DATA (pengganti heuristik regex "Jersey … #…" Sep 2026).
// - Bila kolom teamName/teamwearFlag sudah ada (butuh `db push`, lihat
//   drizzle-schema.ts + prisma/schema.prisma) → tampilkan nama tim asli.
// - Bila belum → grouping jujur by orderId (>1 task) dgn label "MULTI-ITEM"
//   (BUKAN "TEAMWEAR"/"BULK" — nama tim tak boleh dikarang).
// ---------------------------------------------------------------------------
function teamNameOf(t: ProductionTaskItem): string | null {
  const v =
    (typeof t.teamName === "string" && t.teamName.trim() && t.teamName.trim()) ||
    (typeof t.order?.teamName === "string" && t.order.teamName.trim() && t.order.teamName.trim()) ||
    "";
  return v || null;
}

function orderTotalPcs(order: ProductionTaskItem["order"]): number {
  try {
    return (order?.items || []).reduce((a, it) => a + (it?.quantity || 0), 0) || 1;
  } catch {
    return 1;
  }
}

function multiBadgeFor(orderTasks: ProductionTaskItem[]): string | null {
  if (orderTasks.length <= 1) return null;
  const orderPcs = orderTotalPcs(orderTasks[0]!.order);
  const nm = teamNameOf(orderTasks[0]!);
  return nm
    ? `${nm} · ${orderPcs} pcs · ${orderTasks.length} task`
    : `MULTI-ITEM ${orderPcs} pcs · ${orderTasks.length} task`;
}

// ---------------------------------------------------------------------------
// JEJAK QC PER ORDER (read-only yg ada — fetch malas, TANPA route baru).
// ---------------------------------------------------------------------------
interface QcInspectionItem {
  id: string;
  photoUrl: string;
  grazingDeg: number | null;
  luxEstimate: number | null;
  side: string | null;
  checksJson: string;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

function parseQcChecks(checksJson: string): string[] {
  try {
    const v = JSON.parse(checksJson);
    return Array.isArray(v) ? v.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function isLolosRow(r: QcInspectionItem): boolean {
  return parseQcChecks(r.checksJson).length === 0;
}

/** Fetch read-only ke route QC yg sudah ada (dipakai gate LANJUT + section). */
async function fetchQcRows(orderId: string): Promise<QcInspectionItem[]> {
  const res = await fetch(`/api/qc/inspections?orderId=${encodeURIComponent(orderId)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || `Server ${res.status}`);
  return Array.isArray(data.data) ? (data.data as QcInspectionItem[]) : [];
}

function QcOrderSection({
  orderId,
  anchorId,
  autoLoad,
}: {
  orderId: string;
  anchorId?: string;
  autoLoad?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<QcInspectionItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchQcRows(orderId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat jejak QC.");
    } finally {
      setLoading(false);
    }
  };

  // Kartu di kolom QUALITY_CHECK langsung memuat status (relevan saja) agar
  // badge LOLOS/defect terlihat tanpa tap ekstra. Kolom lain tetap malas.
  useEffect(() => {
    if (autoLoad && rows === null && !loading && !error) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && rows === null) void load();
  };

  const lolosCount = rows ? rows.filter(isLolosRow).length : 0;
  const defectCount = rows ? rows.length - lolosCount : 0;

  return (
    <div id={anchorId} className="rounded-lg bg-surface border border-border-subtle scroll-mt-4">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-text-primary min-h-[32px]"
      >
        <span>
          📷 QC
          {rows !== null && rows.length > 0
            ? ` · ✅${lolosCount} LOLOS${defectCount > 0 ? ` · ⚠️${defectCount} defect` : ""}`
            : rows !== null
              ? " · belum ada foto"
              : ""}
        </span>
        <ChevronDown size={12} className={`text-brand-accent transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-2">
          {loading && <p className="text-[10px] text-text-muted">Memuat jejak QC…</p>}
          {error && !loading && (
            <div className="flex items-center justify-between gap-2 text-[10px] text-red-700 dark:text-red-300">
              <span>⚠️ {error}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); void load(); }} className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/40 font-bold">
                COBA LAGI
              </button>
            </div>
          )}
          {!loading && !error && rows !== null && rows.length === 0 && (
            <p className="text-[10px] text-text-muted">Belum ada foto QC untuk order ini.</p>
          )}
          {!loading && !error && rows !== null && rows.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {rows.map((r) => {
                const checks = parseQcChecks(r.checksJson);
                return (
                  <div key={r.id} className="rounded-lg border border-border-subtle overflow-hidden bg-black/5 dark:bg-white/5">
                    <a href={r.photoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      <img src={r.photoUrl} alt="Foto QC" loading="lazy" className="w-full h-20 object-cover" />
                    </a>
                    <div className="p-1.5 space-y-0.5 text-[9px] leading-tight">
                      <p className={`font-bold ${checks.length === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                        {checks.length === 0 ? "✅ LOLOS" : `⚠️ ${checks.join(", ")}`}
                      </p>
                      <p className="text-text-muted">
                        {r.side ? `${r.side} · ` : ""}{r.grazingDeg != null ? `${r.grazingDeg}°` : "—"} · {r.luxEstimate != null ? `~${r.luxEstimate} lux` : "lux —"}
                      </p>
                      {r.note && <p className="text-text-primary truncate" title={r.note}>{r.note}</p>}
                      <p className="text-text-muted">
                        {r.createdByUserId ? `${r.createdByUserId.slice(0, 8)}… · ` : ""}{new Date(r.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LastMove {
  taskId: string;
  fromStage: string;
  toStage: string;
  orderNumber: string;
}

export default function ProductionKanbanPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeTask, setActiveTask] = useState<ProductionTaskItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [qcGateMsg, setQcGateMsg] = useState<string | null>(null);
  const [qcCheckingId, setQcCheckingId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [undoLeft, setUndoLeft] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Deep-link: ?q= (search server) + ?teamwear=1 (filter multi-item, kompatibel).
  const [multiOnly, setMultiOnly] = useState(false);
  const [collapsedOrders, setCollapsedOrders] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("q");
      if (q) {
        setSearchTerm(q);
        setDebouncedQ(q.trim());
      }
      if (sp.get("teamwear") === "1" || sp.get("multi") === "1") setMultiOnly(true);
    } catch { /* abaikan */ }
  }, []);

  // Debounce 400ms: search jalan ke server via ?q= (hemat request saat mengetik).
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchTerm.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // Sinkron URL saat query stabil (bisa dibagikan ke mandor).
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (debouncedQ) url.searchParams.set("q", debouncedQ);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
    } catch { /* abaikan */ }
  }, [debouncedQ]);

  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; tasks: ProductionTaskItem[] }>({
    queryKey: ["production-tasks", debouncedQ],
    queryFn: async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const qs = debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : "";
        const res = await fetch(`/api/admin/production-tasks${qs}`, { signal: ctrl.signal });
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

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, stage }: { taskId: string; stage: string; fromStage?: string; isUndo?: boolean }) => {
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, stage }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Gagal pindah (${res.status})`);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
      // Simpan langkah untuk UNDO 10 detik (kecuali ini memang aksi undo).
      // Catatan: undo DARI DONE ditolak API (DONE final) — pesan error tampil jujur.
      if (!vars.isUndo && vars.fromStage && vars.fromStage !== vars.stage) {
        const t = tasks.find((x) => x.id === vars.taskId);
        setLastMove({ taskId: vars.taskId, fromStage: vars.fromStage, toStage: vars.stage, orderNumber: t?.order.orderNumber || "" });
      }
    },
    onError: (e: unknown) => {
      setActionError(e instanceof Error ? e.message : "Gagal memindahkan task. Cek koneksi lalu coba lagi.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // Hitung mundur UNDO 10 detik.
  useEffect(() => {
    if (!lastMove) {
      setUndoLeft(0);
      return;
    }
    setUndoLeft(10);
    const iv = window.setInterval(() => {
      setUndoLeft((s) => {
        if (s <= 1) {
          window.clearInterval(iv);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    const to = window.setTimeout(() => setLastMove(null), 10000);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
    };
  }, [lastMove]);

  const undoLastMove = () => {
    if (!lastMove) return;
    const m = lastMove;
    setLastMove(null);
    moveTaskMutation.mutate({ taskId: m.taskId, stage: m.fromStage, isUndo: true });
  };

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
    onError: (e: unknown) => {
      setActionError(e instanceof Error ? e.message : "Gagal mengambil task.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const tasks = (data?.tasks || []).filter((t) => t && t.order);

  // Filter klien sebagai jaring pengaman bila server belum mendukung ?q=
  // (agent paralel). Bila server sudah filter, penyaringan ganda ini tak merusak.
  const filteredTasks = tasks.filter((t) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      t.order?.orderNumber || "",
      t.order?.user?.name || "",
      namaPemegang(t),
      courierNotesOf(t),
      ...(t.order?.items || []).map((it) => it?.snapshotName || ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  // Sortir "deadline mepet dulu" per kolom (null = paling belakang), lalu prioritas.
  const sortByDeadline = (arr: ProductionTaskItem[]) =>
    [...arr].sort((a, b) => {
      const da = deadlineMs(a);
      const db = deadlineMs(b);
      if (da !== null && db !== null && da !== db) return da - db;
      if (da !== null && db === null) return -1;
      if (da === null && db !== null) return 1;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

  // Grup multi-item board-wide (orderId >1 task) + agregat stage.
  const countByOrder = useMemo(() => {
    const m = new Map<string, ProductionTaskItem[]>();
    for (const t of tasks) {
      const arr = m.get(t.orderId) || [];
      arr.push(t);
      m.set(t.orderId, arr);
    }
    return m;
  }, [tasks]);
  const multiOrderCount = useMemo(
    () => [...countByOrder.values()].filter((a) => a.length > 1).length,
    [countByOrder]
  );
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

  // Strip workload per operator (read-only — tampil saja; reassign manual via API).
  const workload = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      const key = t.assignedToUserId ? namaPemegang(t) : "Belum dipegang";
      m.set(key, (m.get(key) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const visibleTasks = multiOnly
    ? filteredTasks.filter((t) => (countByOrder.get(t.orderId) || []).length > 1)
    : filteredTasks;

  const toggleMultiFilter = () => {
    setMultiOnly((v) => {
      const next = !v;
      try {
        const url = new URL(window.location.href);
        if (next) url.searchParams.set("teamwear", "1");
        else {
          url.searchParams.delete("teamwear");
          url.searchParams.delete("multi");
        }
        window.history.replaceState(null, "", url.toString());
      } catch { /* abaikan */ }
      return next;
    });
  };
  const toggleCollapse = (orderId: string) =>
    setCollapsedOrders((p) => ({ ...p, [orderId]: !p[orderId] }));

  const handleDragStart = (event: DragStartEvent) => {
    const task = (event.active.data.current as { task?: ProductionTaskItem } | undefined)?.task as ProductionTaskItem | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActionError(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    let targetStage = overId;
    const overTask = (over.data.current as { task?: ProductionTaskItem } | undefined)?.task as ProductionTaskItem | undefined;
    if (overTask) targetStage = overTask.stage;
    if (!STAGES.find((s) => s.id === targetStage)) {
      setActionError("Drop di luar kolom stage — seret ke salah satu kolom tahapan.");
      return;
    }
    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!activeTaskData || activeTaskData.stage === targetStage) return;
    moveTaskMutation.mutate({ taskId: activeId, stage: targetStage, fromStage: activeTaskData.stage });
  };

  /** LANJUT dengan gate QC: dari QUALITY_CHECK wajib ada 1 foto LOLOS (read-only). */
  const advanceWithQcGate = async (task: ProductionTaskItem, nextStage: string) => {
    setQcGateMsg(null);
    setActionError(null);
    if (task.stage === "QUALITY_CHECK") {
      setQcCheckingId(task.id);
      try {
        const rows = await fetchQcRows(task.orderId);
        const lolos = rows.filter(isLolosRow).length;
        if (lolos === 0) {
          setQcGateMsg(
            rows.length > 0
              ? `Task ${task.order.orderNumber} tertahan: ${rows.length} foto QC ada tapi semuanya defect. Minta operator QC meloloskan dulu sebelum LANJUT.`
              : `Task ${task.order.orderNumber} tertahan: belum ada foto QC (0 LOLOS). Buka section 📷 QC di kartu, minta operator QC memfoto + meloloskan dulu.`
          );
          return;
        }
      } catch (e: unknown) {
        setQcGateMsg(`Verifikasi QC gagal (${e instanceof Error ? e.message : "koneksi"}) — LANJUT ditahan agar aman. Coba lagi.`);
        return;
      } finally {
        setQcCheckingId(null);
      }
    }
    moveTaskMutation.mutate({ taskId: task.id, stage: nextStage, fromStage: task.stage });
  };

  const scrollToQc = (taskId: string) => {
    try {
      document.getElementById(`qc-${taskId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch { /* abaikan */ }
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary flex items-center gap-2.5">
            <Layers size={24} className="text-brand-accent" />
            <span>KANBAN PRODUKSI SABLON DTF</span>
          </h1>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            Manajemen alur cetak fisik workshop: File Prep → DTF Printhead → Heat Press → QC → Packing.
          </p>
          {/* Strip workload per operator (read-only — reassign manual via API bila perlu). */}
          {workload.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2" role="group" aria-label="Beban kerja per operator">
              <span className="font-mono text-[10px] text-text-muted">BEBAN:</span>
              {workload.map(([nama, n]) => (
                <span
                  key={nama}
                  className="px-2 py-0.5 rounded-full border border-border-subtle bg-surface font-mono text-[10px] text-text-primary"
                  title={`${n} task`}
                >
                  👤 {nama} · {n}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pesanan / nama…"
              aria-label="Cari pesanan"
              className="pl-9 pr-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all min-h-[40px] min-w-[40px]"
            title="Refresh Antrean"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={toggleMultiFilter}
            aria-pressed={multiOnly}
            title="Tampilkan hanya order multi-item (orderId dengan >1 task)"
            className={`px-3 py-2 rounded-xl border font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
              multiOnly
                ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
          >
            <Users size={13} />
            <span>MULTI-ITEM{multiOrderCount > 0 ? ` (${multiOrderCount})` : ""}</span>
          </button>
        </div>
      </div>
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-300 font-mono text-xs" role="alert">
          ⚠️ {actionError}
        </div>
      )}
      {qcGateMsg && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-200 font-mono text-xs" role="alert">
          🛡️ {qcGateMsg}
        </div>
      )}
      {/* UNDO 10 detik untuk pindah stage terakhir */}
      {lastMove && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/40 text-sky-800 dark:text-sky-200 font-mono text-xs flex items-center justify-between gap-3" role="status">
          <span>
            ↩️ {lastMove.orderNumber || "Task"} pindah {lastMove.fromStage} → {lastMove.toStage}. Batalkan dalam {undoLeft} dtk?
          </span>
          <button
            type="button"
            onClick={undoLastMove}
            className="px-4 py-2 rounded-lg bg-sky-500 text-white font-bold flex items-center gap-1.5 min-h-[44px] shrink-0"
          >
            <Undo2 size={13} />
            <span>UNDO ({undoLeft})</span>
          </button>
        </div>
      )}

      {/* Kanban Board Horizontal Columns — Drag & Drop via @dnd-kit (BLUEPRINT-03 §3) */}
      {isError && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-mono text-xs flex items-center justify-between" role="alert">
          <span>Gagal memuat antrean produksi. Periksa koneksi server.</span>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-lg bg-rose-500/20 font-bold min-h-[44px]">
            COBA LAGI
          </button>
        </div>
      )}
      {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 pb-4 items-start" role="status" aria-busy="true" aria-label="Memuat antrean produksi">
          {STAGES.map((col) => (
            <div key={col.id} className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3 min-w-[260px] animate-pulse">
              <div className="h-4 rounded bg-black/10 dark:bg-white/10 w-2/3" />
              <div className="h-24 rounded-xl bg-black/5 dark:bg-white/5" />
              <div className="h-24 rounded-xl bg-black/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto snap-x snap-mandatory md:snap-none pb-4 items-start min-h-[600px]">
          {STAGES.map((col, colIdx) => {
            const colTasks = sortByDeadline(visibleTasks.filter((t) => t.stage === col.id));
            const Icon = col.icon;
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
                className="bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col space-y-3 min-w-[260px] w-[85vw] max-w-[320px] md:w-auto md:max-w-none shrink-0 md:shrink snap-start"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <div className="flex items-center space-x-2">
                    <Icon size={14} className={col.color} />
                    <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                      {col.label}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border-subtle">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards — Sortable (urut deadline mepet dulu) */}
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 flex-1 min-h-[100px]">
                    {colGroups.map((g) => {
                      const first = g.tasksInCol[0]!;
                      const boardTasks = countByOrder.get(g.orderId) || g.tasksInCol;
                      const badge = multiBadgeFor(boardTasks);
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
                            className="w-full flex items-center justify-between gap-2 text-left min-h-[32px]"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary min-w-0">
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
                    {colTasks.map((task) => {
                      const express = isExpressTask(task);
                      const h3 = isH3Express(task);
                      const telat = isTelat(task);
                      const multi = (countByOrder.get(task.orderId) || []).length > 1;
                      const nmTim = teamNameOf(task);
                      const checking = qcCheckingId === task.id;
                      return (
                      <div key={task.id} className={colGroupMap.has(task.orderId) && collapsedOrders[task.orderId] ? "hidden" : ""}>
                      <SortableTaskCard task={task}>
                        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent/50 transition-all space-y-2.5 font-mono text-xs shadow-md cursor-grab active:cursor-grabbing">
                          {/* Top Row: Order ID & Priority */}
                          <div className="flex justify-between items-start gap-1.5 flex-wrap">
                            <span className="font-bold text-brand-accent">{task.order.orderNumber}</span>
                            <span className="flex gap-1 flex-wrap">
                              {multi && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/40">
                                  {nmTim || "MULTI-ITEM"}
                                </span>
                              )}
                              {express && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${h3 ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50" : "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"}`}>
                                  {h3 ? "🔴 H-3 JAM EXPRESS" : "⚡ EXPRESS"}
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Item Details */}
                          <div>
                            <p className="font-bold text-text-primary leading-tight">
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
                          <div className="p-2 rounded-lg bg-surface border border-border-subtle text-[10px] space-y-0.5">
                            <span className="block text-text-muted">UKURAN CETAK (DTF):</span>
                            {task.printWidthCm && task.printHeightCm ? (
                              <span className="font-bold text-text-primary block">
                                📏 {task.printWidthCm} cm × {task.printHeightCm} cm (Maks 30cm)
                              </span>
                            ) : (
                              <span className="font-bold text-amber-700 dark:text-amber-400 block">⚠ Belum terukur</span>
                            )}
                            {task.printFileUrl && (
                              <div className="flex items-center gap-2 mt-1">
                                <img
                                  src={task.printFileUrl}
                                  alt="Thumbnail DTF"
                                  className="w-8 h-8 object-contain rounded bg-black/40 border border-border-subtle p-0.5"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                                <a
                                  href={task.printFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/25 transition-all"
                                >
                                  <span>📄 FILE CETAK 300DPI</span>
                                </a>
                              </div>
                            )}
                            {/* Deadline nyata per kartu */}
                            <span className={`flex items-center gap-1 mt-1 font-bold ${telat ? "text-red-700 dark:text-red-300" : h3 ? "text-red-700 dark:text-red-300" : "text-text-muted"}`}>
                              <Clock size={10} />
                              🎯 {formatDeadline(task)}
                            </span>
                            {courierNotesOf(task) && (
                              <span className="block text-text-muted mt-0.5 truncate" title={courierNotesOf(task)}>
                                📝 {courierNotesOf(task)}
                              </span>
                            )}
                          </div>

                          {/* Jejak QC per order (read-only; auto-muat di kolom QC) */}
                          <QcOrderSection orderId={task.orderId} anchorId={`qc-${task.id}`} autoLoad={task.stage === "QUALITY_CHECK"} />

                          {/* Customer & Pemegang */}
                          <div className="text-[10px] text-text-muted flex justify-between border-t border-border-subtle pt-2 gap-2">
                            <span className="truncate">{task.order.user?.name || "Pelanggan"}</span>
                            <span className="text-text-primary font-bold shrink-0">{task.order.deliveryMethod}</span>
                          </div>
                          <div className="text-[10px] text-text-muted flex justify-between gap-2">
                            <span>👤 {namaPemegang(task)}</span>
                          </div>

                          {/* Move Stage Actions — ramah HP (target ≥44px) */}
                          <div className="pt-2 flex items-center justify-between border-t border-border-subtle gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`/admin/orders/${task.orderId}`}
                                className="text-[10px] text-brand-accent hover:underline flex items-center gap-1 min-h-[44px] px-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>INSPEKSI</span>
                                <ExternalLink size={10} />
                              </a>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scrollToQc(task.id);
                                }}
                                className="text-[10px] text-brand-accent hover:underline min-h-[44px] px-1 font-bold"
                                title="Lompat ke section QC kartu ini"
                              >
                                📷 QC
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!task.assignedToUserId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    claimTaskMutation.mutate({ taskId: task.id });
                                  }}
                                  className="px-4 py-2.5 rounded bg-surface border border-border-strong text-text-primary font-bold text-[11px] hover:border-brand-accent transition-all min-h-[44px]"
                                >
                                  <span>AMBIL</span>
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                                  DIPEGANG
                                </span>
                              )}
                              {colIdx < STAGES.length - 1 && (
                                <button
                                  type="button"
                                  disabled={checking}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void advanceWithQcGate(task, STAGES[colIdx + 1]?.id ?? "DONE");
                                  }}
                                  title={task.stage === "QUALITY_CHECK" ? "LANJUT dikunci sampai ada 1 foto QC LOLOS" : "Maju ke stage berikut"}
                                  className="px-4 py-2.5 rounded bg-brand-accent text-canvas font-bold text-[11px] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 min-h-[44px] disabled:opacity-50"
                                >
                                  <span>{checking ? "CEK QC…" : "LANJUT"}</span>
                                  <ChevronRight size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </SortableTaskCard>
                      </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="p-6 text-center text-text-muted/60 text-[11px] font-mono border border-dashed border-border-subtle rounded-xl">
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
              <p className="font-bold text-text-primary truncate">{activeTask.order.items?.[0]?.snapshotName}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
