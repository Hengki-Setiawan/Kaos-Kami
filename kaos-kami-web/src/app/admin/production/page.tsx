"use client";

import React, { useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import type { ApparelType } from "@/lib/constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Preview 3D ringan: chunk three.js hanya diunduh saat modal tiket dibuka
// (dynamic + ssr:false), dan kanvas WebGL hanya di-mount saat staf menekan
// tombol "Lihat 3D". Visual utama tetap <img> snapshotImageUrl (ringan).
const Showcase3DOrbitViewer = nextDynamic(
  () => import("@/components/3d/Showcase3DOrbitViewer").then((m) => m.Showcase3DOrbitViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/5] min-h-[280px] rounded-2xl border border-border-subtle bg-black/20 flex items-center justify-center font-mono text-xs text-text-muted">
        Memuat 3D…
      </div>
    ),
  }
);

// Heuristik UI-only: tebak slug apparel & warna dari snapshot order
// (Showcase3DOrbitViewer existing hanya menerima apparelSlug + colorHex,
// bukan snapshotImageUrl — tanpa ubah API/DB).
function guessApparelSlug(name?: string | null): ApparelType {
  const n = (name || "").toLowerCase();
  if (n.includes("hoodie")) return "hoodie";
  if (n.includes("crewneck") || n.includes("sweater")) return "crewneck";
  if (n.includes("longsleeve") || n.includes("lengan panjang")) return "longsleeve";
  if (n.includes("jacket") || n.includes("jaket") || n.includes("shirt") || n.includes("kemeja")) return "shirt";
  return "tshirt";
}

function guessColorHex(colorName?: string | null): string {
  const n = (colorName || "").toLowerCase();
  if (n.includes("putih") || n.includes("white")) return "#f5f5f5";
  if (n.includes("navy") || n.includes("dongker")) return "#1e3a5f";
  if (n.includes("merah") || n.includes("red") || n.includes("maroon")) return "#7f1d1d";
  if (n.includes("hijau") || n.includes("green") || n.includes("army")) return "#1a3c2e";
  if (n.includes("biru") || n.includes("blue") || n.includes("denim")) return "#1e40af";
  if (n.includes("kuning") || n.includes("yellow") || n.includes("mustard")) return "#a16207";
  if (n.includes("abu") || n.includes("grey") || n.includes("gray")) return "#6b7280";
  if (n.includes("coklat") || n.includes("brown") || n.includes("mocca")) return "#5b3a1e";
  if (n.includes("pink") || n.includes("lilac") || n.includes("ungu") || n.includes("purple")) return "#7e22ce";
  return "#18181b";
}
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
  Eye,
  X,
  Sparkles,
  MessageCircle,
  Send,
} from "lucide-react";
import { buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { maskPhone } from "@/lib/mask";

/** Normalisasi nomor ke format wa.me (62…) — tampilan/client saja. */
function toWaNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/[^0-9]/g, "");
  if (d.length < 9) return null;
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  return d;
}

interface ProductionTaskItem {
  id: string;
  orderId: string;
  stage: string;
  priority: number;
  notes: string | null;
  printWidthCm: number | null;
  printHeightCm: number | null;
  placementSide: string | null;
  offsetFromCollarCm?: number | null;
  rawAssetUrl?: string | null;
  mockupPreviewUrl?: string | null;
  printFileUrl: string | null;
  dueDate: string | null;
  assignedToUserId: string | null;
  createdAt?: string | null;
  // ── Kolom defensif (API paralel mungkin belum ada → semua opsional) ──
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
      snapshotImageUrl?: string | null;
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

const WORKSHOP_PILLARS = [
  {
    id: "maklon_queue",
    label: "1. Antrean Maklon DTF",
    sublabel: "File Siap → Kirim ke Vendor Roll DTF",
    stages: ["DESIGN_PREP", "SCREEN_PRINT_SETUP"],
    icon: FileText,
    color: "border-blue-500/40 text-blue-700 dark:text-blue-400",
  },
  {
    id: "ready_to_press",
    label: "2. Siap Press (Film Tiba)",
    sublabel: "Film Tiba → Siapkan Kaos Combed dari Rak",
    stages: ["PRINTING"],
    icon: Printer,
    color: "border-cyan-500/40 text-cyan-700 dark:text-cyan-400",
  },
  {
    id: "pressing_qc",
    label: "3. Sedang Dipress & QC",
    sublabel: "Press 160°C 15s → Cold Peel → Cek QC",
    stages: ["PRESSING", "QUALITY_CHECK"],
    icon: Flame,
    color: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  },
  {
    id: "packing_done",
    label: "4. Packing & Selesai",
    sublabel: "Masuk Polymailer → Siap Kirim / Pickup",
    stages: ["PACKAGING", "DONE"],
    icon: Package,
    color: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  },
];

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

function TaskCardContent({
  task,
  onOpenPreview,
  onClaim,
  onAdvance,
  isChecking,
  advanceLabel,
  scrollToQc,
}: {
  task: ProductionTaskItem;
  onOpenPreview: (t: ProductionTaskItem) => void;
  onClaim: (t: ProductionTaskItem) => void;
  onAdvance?: (t: ProductionTaskItem) => void;
  isChecking?: boolean;
  advanceLabel?: string;
  scrollToQc: (taskId: string) => void;
}) {
  const express = isExpressTask(task);
  const h3 = isH3Express(task);
  const telat = isTelat(task);
  const nmTim = teamNameOf(task);
  // Clamp fisik DTF: lebar cetak maks 30.0 cm (heat press + anatomi dada A3).
  // Tampilan saja — logika status/task TIDAK diubah.
  const wClamped = task.printWidthCm != null ? Math.min(task.printWidthCm, 30.0) : null;
  const wOver = task.printWidthCm != null && task.printWidthCm > 30.0;
  // ── WA kurir/pembeli + resi (client-only, tanpa API baru) ──
  const [resi, setResi] = useState("");
  const [waSent, setWaSent] = useState(false);
  const waNum = toWaNumber(task.order.user?.phoneNumber);
  const stageLabel = STAGES.find((s) => s.id === task.stage)?.label || task.stage;
  const invoiceUrl =
    typeof window !== "undefined" ? `${window.location.origin}/orders/${task.orderId}` : `/orders/${task.orderId}`;
  const kirimNotifWa = () => {
    if (!waNum) return;
    const msg = buildProductionStatusMessage({
      orderNumber: task.order.orderNumber,
      recipientName: task.order.user?.name || "Pelanggan",
      stageName: `${stageLabel}${resi.trim() ? ` · Resi: ${resi.trim()}` : ""}`,
      note: resi.trim() ? `No. resi pengiriman: ${resi.trim()}` : undefined,
      invoiceUrl,
    });
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    setWaSent(true);
    window.setTimeout(() => setWaSent(false), 3000);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle hover:border-brand-accent/50 transition-all space-y-3 font-sans text-sm shadow-md cursor-grab active:cursor-grabbing">
      {/* Top Row: Order ID, Preview Button & Priority */}
      <div className="flex justify-between items-start gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="font-mono tabular-nums font-bold text-brand-accent">{task.order.orderNumber}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview(task);
            }}
            className="p-1 rounded-md bg-surface border border-border-subtle hover:border-brand-accent text-text-muted hover:text-brand-accent transition-colors"
            title="Buka Pratinjau 3D & Tiket Kerja Workshop"
          >
            <Eye size={12} />
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {nmTim && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/40">
              {nmTim}
            </span>
          )}
          {express && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                h3
                  ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"
              }`}
            >
              {h3 ? "🔴 H-3 JAM" : "⚡ EXPRESS"}
            </span>
          )}
        </div>
      </div>

      {/* Item Details + Thumbnail Preview */}
      <div className="flex items-center gap-2.5">
        {(task.mockupPreviewUrl || task.order.items?.[0]?.snapshotImageUrl) ? (
          <img
            src={task.mockupPreviewUrl || task.order.items?.[0]?.snapshotImageUrl || ""}
            alt="Mockup"
            className="w-10 h-12 object-cover rounded-lg bg-black/20 border border-border-subtle shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-sans font-bold text-text-primary text-xs leading-snug truncate">
            {task.order.items?.[0]?.snapshotName || "Sablon DTF Apparel"}
            {(task.order.items?.length || 0) > 1 && (
              <span className="text-brand-accent font-mono"> +{(task.order.items?.length || 1) - 1} item</span>
            )}
          </p>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            Size {task.order.items?.[0]?.snapshotSize || "L"} · {task.order.items?.[0]?.snapshotColorName || "Hitam"} ·{" "}
            {task.order.items?.reduce((a, it) => a + (it.quantity || 0), 0) || 1} pcs
          </p>
        </div>
      </div>

      {/* DTF Print Dimensions & Collar Offset */}
      <div className="p-2.5 rounded-xl bg-surface/80 border border-border-subtle text-[10px] space-y-1">
        <div className="flex items-center justify-between text-text-muted">
          <span>UKURAN CETAK DTF:</span>
          <span className="text-brand-accent font-bold">{task.placementSide || "Dada Depan"}</span>
        </div>
        {wClamped != null && task.printHeightCm ? (
          <span className="font-mono font-bold text-text-primary block">
            📏 {wClamped.toFixed(1)} cm × {task.printHeightCm} cm (Maks 30.0cm)
            {wOver ? <span className="text-amber-600 dark:text-amber-400"> · dibatasi 30.0</span> : null}
          </span>
        ) : (
          <span className="font-bold text-amber-600 dark:text-amber-400 block">⚠ Belum terukur</span>
        )}
        {task.offsetFromCollarCm ? (
          <span className="text-brand-accent font-bold block">
            📍 {task.offsetFromCollarCm} cm di bawah kerah
          </span>
        ) : null}
        {task.printFileUrl && (
          <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
            <a
              href={task.printFileUrl}
              target="_blank"
              rel="noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/25 transition-all text-[10px]"
            >
              <span>📄 MASTER 300DPI</span>
            </a>
          </div>
        )}
        <span
          className={`flex items-center gap-1 font-bold ${
            telat ? "text-red-700 dark:text-red-300" : h3 ? "text-red-700 dark:text-red-300" : "text-text-muted"
          }`}
        >
          <Clock size={10} />
          <span>{formatDeadline(task)}</span>
        </span>
      </div>

      {/* Jejak QC per order */}
      <QcOrderSection orderId={task.orderId} anchorId={`qc-${task.id}`} autoLoad={task.stage === "QUALITY_CHECK"} />

      {/* Customer & Pemegang */}
      <div className="text-[10px] text-text-muted flex justify-between border-t border-border-subtle pt-2 gap-2">
        <span className="truncate">{task.order.user?.name || "Pelanggan"}</span>
        <span className="text-text-primary font-bold shrink-0">{task.order.deliveryMethod}</span>
      </div>
      <div className="text-[10px] text-text-muted flex justify-between gap-2">
        <span>👤 {namaPemegang(task)}</span>
      </div>

      {/* WA pembeli + WA driver/kurir + input resi + kirim notifikasi
           (client-only wa.me, teks via buildProductionStatusMessage existing —
           TANPA API/DB baru, TANPA auto-dispatch: semua via klik manual) */}
      <div className="rounded-xl bg-surface/80 border border-border-subtle p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted font-bold">
            📱 {task.order.user?.phoneNumber ? maskPhone(task.order.user.phoneNumber) : "No. WA belum ada"}
          </span>
          <div className="flex items-center gap-1.5">
            {waNum && (
              <a
                href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                  `Halo ${task.order.user?.name || "kak"} 👋, Kaos Kami Makassar — pesanan ${task.order.orderNumber} tahap: ${stageLabel}. ${invoiceUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/25 transition-all min-h-[32px]"
                title="Chat pembeli via WhatsApp"
              >
                <MessageCircle size={11} />
                <span>CHAT WA</span>
              </a>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Halo kurir Kaos Kami Makassar — paket ${task.order.orderNumber} (${task.order.user?.name || "pelanggan"}) tahap: ${stageLabel}${resi.trim() ? ` · Resi: ${resi.trim()}` : ""}. ${invoiceUrl}`
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/35 text-sky-700 dark:text-sky-300 font-bold text-[10px] hover:bg-sky-500/25 transition-all min-h-[32px]"
              title="Teruskan info paket ke driver/kurir via WhatsApp (pilih kontak manual — tanpa auto-dispatch)"
            >
              <MessageCircle size={11} />
              <span>WA DRIVER</span>
            </a>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            value={resi}
            onChange={(e) => setResi(e.target.value.slice(0, 40))}
            onClick={(e) => e.stopPropagation()}
            placeholder="No. resi kirim…"
            aria-label="Nomor resi pengiriman"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface border border-border-subtle font-mono text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent min-h-[32px]"
          />
          <button
            type="button"
            disabled={!waNum}
            onClick={(e) => {
              e.stopPropagation();
              kirimNotifWa();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-accent text-canvas font-bold text-[10px] hover:brightness-110 active:scale-95 transition-all min-h-[32px] disabled:opacity-40 shrink-0"
            title={waNum ? "Kirim notifikasi tahap + resi via WhatsApp" : "Nomor WA pembeli belum ada"}
          >
            <Send size={11} />
            <span>{waSent ? "TERKIRIM ✓" : "NOTIF WA"}</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-between border-t border-border-subtle gap-1.5">
        <div className="flex items-center gap-1.5">
          <a
            href={`/admin/orders/${task.orderId}`}
            className="text-[10px] text-brand-accent hover:underline flex items-center gap-1 min-h-[36px] px-1 font-bold"
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
            className="text-[10px] text-brand-accent hover:underline min-h-[36px] px-1 font-bold"
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
                onClaim(task);
              }}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border-strong text-text-primary font-bold text-[10px] hover:border-brand-accent transition-all min-h-[36px]"
            >
              AMBIL
            </button>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
              DIPEGANG
            </span>
          )}
          {onAdvance && (
            <button
              type="button"
              disabled={isChecking}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(task);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-brand-accent text-canvas font-bold text-[10px] uppercase hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 min-h-[36px] disabled:opacity-50"
            >
              <span>{isChecking ? "CEK QC…" : advanceLabel || "LANJUT"}</span>
              <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LastMove {
  taskId: string;
  fromStage: string;
  toStage: string;
  orderNumber: string;
}

/**
 * Master-attach form di modal tiket workshop — POST ke
 * /api/admin/production-tasks/master-notify (RBAC = PATCH).
 * Field: printFileUrl https-R2, lebar clamp ≤30, sisi, offset kerah,
 * resi ≤40, notifyWa default FALSE (WA hanya bila true eksplisit).
 */
function MasterAttachForm({
  task,
  onUpdated,
}: {
  task: ProductionTaskItem;
  onUpdated: (t: ProductionTaskItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [printFileUrl, setPrintFileUrl] = useState(task.printFileUrl || "");
  const [printWidthCm, setPrintWidthCm] = useState(
    task.printWidthCm != null ? String(task.printWidthCm) : ""
  );
  const [placementSide, setPlacementSide] = useState(task.placementSide || "");
  const [offsetCm, setOffsetCm] = useState(
    task.offsetFromCollarCm != null ? String(task.offsetFromCollarCm) : ""
  );
  const [resi, setResi] = useState("");
  const [notifyWa, setNotifyWa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setPrintFileUrl(task.printFileUrl || "");
    setPrintWidthCm(task.printWidthCm != null ? String(task.printWidthCm) : "");
    setPlacementSide(task.placementSide || "");
    setOffsetCm(task.offsetFromCollarCm != null ? String(task.offsetFromCollarCm) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = { taskId: task.id, notifyWa };
      const url = printFileUrl.trim();
      if (url) payload.printFileUrl = url;
      const w = printWidthCm.trim() ? Number(printWidthCm) : undefined;
      if (w !== undefined && Number.isFinite(w)) payload.printWidthCm = Math.min(w, 30.0);
      if (placementSide.trim()) payload.placementSide = placementSide.trim().slice(0, 40);
      const off = offsetCm.trim() ? Number(offsetCm) : undefined;
      if (off !== undefined && Number.isFinite(off)) payload.offsetFromCollarCm = off;
      if (resi.trim()) payload.resi = resi.trim().slice(0, 40);
      const res = await fetch("/api/admin/production-tasks/master-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Server ${res.status}`);
      setMsg(
        data.waSent
          ? "✅ Master terlampir + WA terkirim."
          : data.waError
            ? `✅ Master terlampir (WA: ${data.waError}).`
            : "✅ Master terlampir + event tercatat."
      );
      // Segarkan tiket dari server (GET ulang kanban) + update modal lokal.
      try {
        const merged = { ...task, ...(data.task || {}) } as ProductionTaskItem;
        onUpdated(merged);
      } catch {
        // abaikan
      }
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : "Gagal melampirkan master."}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between font-mono text-xs font-bold text-text-primary"
      >
        <span className="flex items-center gap-1.5">
          <FileText size={13} className="text-brand-accent" />
          <span>Lampirkan Master Film DTF</span>
        </span>
        <ChevronDown size={14} className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 pt-1">
          <input
            value={printFileUrl}
            onChange={(e) => setPrintFileUrl(e.target.value.slice(0, 2048))}
            onClick={(e) => e.stopPropagation()}
            placeholder="https://r2…/masters/film-300dpi.png"
            aria-label="URL master film DTF (https R2)"
            className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border-subtle font-mono text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[10px] text-text-muted font-bold">
              <span>LEBAR (cm, maks 30.0)</span>
              <input
                value={printWidthCm}
                onChange={(e) => setPrintWidthCm(e.target.value.slice(0, 8))}
                onClick={(e) => e.stopPropagation()}
                inputMode="decimal"
                placeholder="29.0"
                aria-label="Lebar cetak cm"
                className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border-subtle font-mono text-[11px] text-text-primary focus:outline-none focus:border-brand-accent"
              />
            </label>
            <label className="space-y-1 text-[10px] text-text-muted font-bold">
              <span>JARAK KERAH (cm)</span>
              <input
                value={offsetCm}
                onChange={(e) => setOffsetCm(e.target.value.slice(0, 8))}
                onClick={(e) => e.stopPropagation()}
                inputMode="decimal"
                placeholder="5.0"
                aria-label="Jarak dari kerah cm"
                className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border-subtle font-mono text-[11px] text-text-primary focus:outline-none focus:border-brand-accent"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={placementSide}
              onChange={(e) => setPlacementSide(e.target.value.slice(0, 40))}
              onClick={(e) => e.stopPropagation()}
              placeholder="Dada Depan"
              aria-label="Sisi penempatan"
              className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border-subtle font-mono text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
            />
            <input
              value={resi}
              onChange={(e) => setResi(e.target.value.slice(0, 40))}
              onClick={(e) => e.stopPropagation()}
              placeholder="No. resi (maks 40)"
              aria-label="Nomor resi"
              className="w-full px-2.5 py-2 rounded-xl bg-surface border border-border-subtle font-mono text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifyWa}
              onChange={(e) => setNotifyWa(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="accent-brand-accent w-4 h-4"
            />
            <span>Kirim WA pembeli (default MATI)</span>
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => {
              e.stopPropagation();
              void submit();
            }}
            className="w-full py-2.5 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "MENYIMPAN…" : "LAMPIRKAN MASTER + NOTIFY"}
          </button>
          {msg && <p className="font-mono text-[11px] text-text-primary">{msg}</p>}
          <p className="font-mono text-[10px] text-text-muted">
            Master https-R2 + event tercatat selalu; WA hanya bila checkbox AKTIF.
          </p>
        </div>
      )}
    </div>
  );
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
  const [viewMode, setViewMode] = useState<"maklon" | "detail">("maklon");
  const [previewTask, setPreviewTask] = useState<ProductionTaskItem | null>(null);
  // Toggle preview 3D di modal tiket (default MATI agar ringan; reset tiap ganti tiket).
  const [preview3DOpen, setPreview3DOpen] = useState(false);
  useEffect(() => {
    setPreview3DOpen(false);
  }, [previewTask?.id]);

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
    if (overTask) {
      targetStage = overTask.stage;
    } else {
      const pillar = WORKSHOP_PILLARS.find((p) => p.id === overId);
      if (pillar && pillar.stages[0]) {
        targetStage = pillar.stages[0];
      }
    }
    if (!STAGES.find((s) => s.id === targetStage)) {
      setActionError("Drop di luar kolom tahapan — seret ke salah satu kolom alur.");
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

  const getNextStageAndLabel = (currentStage: string): { nextStage: string | null; label: string } => {
    if (viewMode === "maklon") {
      const maklonMap: Record<string, { nextStage: string; label: string }> = {
        DESIGN_PREP: { nextStage: "PRINTING", label: "FILM MAKLON TIBA" },
        SCREEN_PRINT_SETUP: { nextStage: "PRINTING", label: "FILM MAKLON TIBA" },
        PRINTING: { nextStage: "PRESSING", label: "MULAI HEAT PRESS" },
        PRESSING: { nextStage: "PACKAGING", label: "SELESAI PRESS / PACK" },
        QUALITY_CHECK: { nextStage: "PACKAGING", label: "SELESAI PRESS / PACK" },
        PACKAGING: { nextStage: "DONE", label: "SELESAI / SIAP ANTAR" },
      };
      return maklonMap[currentStage] || { nextStage: null, label: "SELESAI" };
    }
    const map: Record<string, { nextStage: string; label: string }> = {
      DESIGN_PREP: { nextStage: "SCREEN_PRINT_SETUP", label: "ROLL FILM" },
      SCREEN_PRINT_SETUP: { nextStage: "PRINTING", label: "KIRIM MAKLON" },
      PRINTING: { nextStage: "PRESSING", label: "FILM TIBA / PRESS" },
      PRESSING: { nextStage: "QUALITY_CHECK", label: "MASUK QC" },
      QUALITY_CHECK: { nextStage: "PACKAGING", label: "LOLOS / PACKING" },
      PACKAGING: { nextStage: "DONE", label: "SELESAI" },
    };
    return map[currentStage] || { nextStage: null, label: "SELESAI" };
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold uppercase tracking-tight text-text-primary flex items-center gap-2.5">
            <Layers size={24} className="text-brand-accent" />
            <span>Jalur Produksi</span>
          </h1>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            Pantau antrean cetak fisik workshop secara real-time: File Prep → Cetak DTF (Maklon) → Heat Press → QC → Packing.
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

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle: Alur Maklon (4 Tahap) vs Rinci (7 Kolom) */}
          <div className="flex items-center rounded-xl bg-surface border border-border-subtle p-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("maklon")}
              aria-pressed={viewMode === "maklon"}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === "maklon"
                  ? "bg-brand-accent text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              🏭 Alur Maklon (4 Tahap)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("detail")}
              aria-pressed={viewMode === "detail"}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === "detail"
                  ? "bg-brand-accent text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              📊 Rinci (7 Kolom)
            </button>
          </div>

          <a
            href="/admin/gang-sheet"
            className="px-3 py-2 rounded-xl bg-surface border border-border-subtle hover:border-amber-500/50 text-text-primary text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 min-h-[40px] shadow-xs"
            title="Buka Alat Penataan Gang Sheet DTF 100×58cm"
          >
            <Layers size={13} className="text-amber-500" />
            <span>GANG SHEET 100×58</span>
          </a>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 items-start" role="status" aria-busy="true" aria-label="Memuat antrean produksi">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border-subtle rounded-2xl p-4 space-y-3 min-w-[260px] animate-pulse">
              <div className="h-4 rounded bg-black/10 dark:bg-white/10 w-2/3" />
              <div className="h-24 rounded-xl bg-black/5 dark:bg-white/5" />
              <div className="h-24 rounded-xl bg-black/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {viewMode === "maklon" ? (
          /* WORKSHOP_PILLARS 4-Columns Grid (Alur Maklon DTF Makassar) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 items-start min-h-[600px]">
            {WORKSHOP_PILLARS.map((pillar) => {
              const pillarTasks = sortByDeadline(visibleTasks.filter((t) => pillar.stages.includes(t.stage)));
              const Icon = pillar.icon;
              const pillarGroupMap = new Map<string, ProductionTaskItem[]>();
              for (const t of pillarTasks) {
                if ((countByOrder.get(t.orderId) || []).length > 1) {
                  const arr = pillarGroupMap.get(t.orderId) || [];
                  arr.push(t);
                  pillarGroupMap.set(t.orderId, arr);
                }
              }
              const pillarGroups = [...pillarGroupMap.entries()].map(([orderId, tasksInCol]) => ({ orderId, tasksInCol }));
              // Pilar kosong mode maklon: collapse jadi strip sempit (visual saja —
              // id Droppable + logika stage/task TIDAK diubah agar drag tetap bisa drop).
              const isEmptyPillar = pillarTasks.length === 0;

              return (
                <DroppableColumn
                  key={pillar.id}
                  id={pillar.id}
                  className={
                    isEmptyPillar
                      ? "bg-surface/60 border border-dashed border-border-subtle rounded-2xl p-2 flex flex-col items-center gap-2 min-w-[52px] w-[52px] shrink-0"
                      : "bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col space-y-3 min-w-[280px]"
                  }
                >
                  {isEmptyPillar ? (
                    <>
                      <div className="flex flex-col items-center gap-1.5 py-1" title={`${pillar.label} — kosong`}>
                        <Icon size={14} className={pillar.color} />
                        <span className="font-mono tabular-nums text-[11px] font-bold text-text-muted bg-surface px-1.5 py-0.5 rounded-full border border-border-subtle">
                          0
                        </span>
                        <span
                          className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider text-center"
                          style={{ writingMode: "vertical-rl" }}
                        >
                          {pillar.label}
                        </span>
                      </div>
                      <SortableContext items={[]} strategy={verticalListSortingStrategy}>
                        <div className="flex-1 min-h-[200px] w-full rounded-lg" aria-label={`Pilar kosong ${pillar.label} — drag card ke sini`} />
                      </SortableContext>
                    </>
                  ) : (
                  <>
                  {/* Pillar Header */}
                  <div className="pb-2 border-b border-border-subtle space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon size={16} className={pillar.color} />
                        <span className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider">
                          {pillar.label}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border-subtle">
                        {pillarTasks.length}
                      </span>
                    </div>
                    <p className="text-[10px] font-sans text-text-muted">{pillar.sublabel}</p>
                    {/* 1-klik dual-mode per kolom: majukan 1 task teratas (deadline mepet)
                        via advanceWithQcGate existing (stage-transition + gate QC),
                        label ikut mode Maklon/Rinci — TANPA auto-dispatch. */}
                    {(() => {
                      const top = pillarTasks[0];
                      if (!top) return null;
                      const ni = getNextStageAndLabel(top.stage);
                      if (!ni.nextStage) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => void advanceWithQcGate(top, ni.nextStage as string)}
                          title={`1-klik: ${top.order.orderNumber} → ${ni.nextStage} (mode ${viewMode === "maklon" ? "Maklon" : "Rinci"})`}
                          className="w-full mt-1 px-2 py-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent font-mono font-bold text-[10px] hover:bg-brand-accent/20 active:scale-[0.98] transition-all min-h-[32px]"
                        >
                          ⏩ {ni.label} · TERATAS ({top.order.orderNumber})
                        </button>
                      );
                    })()}
                  </div>

                  {/* Task Cards */}
                  <SortableContext items={pillarTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 flex-1 min-h-[100px]">
                      {pillarGroups.map((g) => {
                        const first = g.tasksInCol[0]!;
                        const boardTasks = countByOrder.get(g.orderId) || g.tasksInCol;
                        const badge = multiBadgeFor(boardTasks);
                        const pcs = orderTotalPcs(first.order);
                        const agg = stageAggByOrder.get(g.orderId);
                        const collapsed = !!collapsedOrders[g.orderId];
                        return (
                          <div key={`grp-${pillar.id}-${g.orderId}`} className="rounded-xl border border-brand-accent/30 bg-brand-accent/[0.05] p-2.5 space-y-1 font-mono">
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
                      {pillarTasks.map((task) => {
                        const nextInfo = getNextStageAndLabel(task.stage);
                        const checking = qcCheckingId === task.id;
                        return (
                          <div key={task.id} className={pillarGroupMap.has(task.orderId) && collapsedOrders[task.orderId] ? "hidden" : ""}>
                            <SortableTaskCard task={task}>
                              <TaskCardContent
                                task={task}
                                onOpenPreview={setPreviewTask}
                                onClaim={(t) => claimTaskMutation.mutate({ taskId: t.id })}
                                onAdvance={nextInfo.nextStage ? () => void advanceWithQcGate(task, nextInfo.nextStage!) : undefined}
                                advanceLabel={nextInfo.label}
                                isChecking={checking}
                                scrollToQc={scrollToQc}
                              />
                            </SortableTaskCard>
                          </div>
                        );
                      })}

                    </div>
                  </SortableContext>
                  </>
                  )}
                </DroppableColumn>
              );
            })}
          </div>
        ) : (
          /* STAGES 7-Columns Detailed View */
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
              // Kolom kosong mode rinci: collapse jadi strip sempit (visual saja —
              // id Droppable + logika stage/task TIDAK diubah agar drag tetap bisa drop).
              const isEmptyCol = colTasks.length === 0;

              return (
                <DroppableColumn
                  key={col.id}
                  id={col.id}
                  className={
                    isEmptyCol
                      ? "bg-surface/60 border border-dashed border-border-subtle rounded-2xl p-2 flex flex-col items-center gap-2 min-w-[52px] w-[52px] shrink-0 snap-start"
                      : "bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col space-y-3 min-w-[260px] w-[85vw] max-w-[320px] md:w-auto md:max-w-none shrink-0 md:shrink snap-start"
                  }
                >
                  {isEmptyCol ? (
                    <>
                      <div className="flex flex-col items-center gap-1.5 py-1" title={`${col.label} — kosong`}>
                        <Icon size={14} className={col.color} />
                        <span className="font-mono tabular-nums text-[11px] font-bold text-text-muted bg-surface px-1.5 py-0.5 rounded-full border border-border-subtle">
                          0
                        </span>
                        <span
                          className="font-sans text-[10px] font-bold text-text-muted uppercase tracking-wider"
                          style={{ writingMode: "vertical-rl" }}
                        >
                          {col.label}
                        </span>
                      </div>
                      <SortableContext items={[]} strategy={verticalListSortingStrategy}>
                        <div className="flex-1 min-h-[200px] w-full rounded-lg" aria-label={`Kolom kosong ${col.label} — drag card ke sini`} />
                      </SortableContext>
                    </>
                  ) : (
                  <>
                  {/* Column Header */}
                  <div className="pb-2 border-b border-border-subtle space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon size={14} className={col.color} />
                      <span className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider">
                        {col.label}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] font-bold text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border-subtle">
                      {colTasks.length}
                    </span>
                  </div>
                  {/* 1-klik dual-mode per kolom (mode Rinci): majukan 1 task teratas
                      via advanceWithQcGate existing — TANPA auto-dispatch. */}
                  {(() => {
                    const top = colTasks[0];
                    const nextId = colIdx < STAGES.length - 1 ? STAGES[colIdx + 1]?.id : null;
                    if (!top || !nextId) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => void advanceWithQcGate(top, nextId)}
                        title={`1-klik: ${top.order.orderNumber} → ${nextId} (mode Rinci)`}
                        className="w-full px-2 py-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent font-mono font-bold text-[10px] hover:bg-brand-accent/20 active:scale-[0.98] transition-all min-h-[32px]"
                      >
                        ⏩ LANJUT · TERATAS ({top.order.orderNumber})
                      </button>
                    );
                  })()}
                  </div>

                  {/* Task Cards */}
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
                        const checking = qcCheckingId === task.id;
                        return (
                          <div key={task.id} className={colGroupMap.has(task.orderId) && collapsedOrders[task.orderId] ? "hidden" : ""}>
                            <SortableTaskCard task={task}>
                              <TaskCardContent
                                task={task}
                                onOpenPreview={setPreviewTask}
                                onClaim={(t) => claimTaskMutation.mutate({ taskId: t.id })}
                                onAdvance={colIdx < STAGES.length - 1 ? () => void advanceWithQcGate(task, STAGES[colIdx + 1]?.id ?? "DONE") : undefined}
                                advanceLabel="LANJUT"
                                isChecking={checking}
                                scrollToQc={scrollToQc}
                              />
                            </SortableTaskCard>
                          </div>
                        );
                      })}

                    </div>
                  </SortableContext>
                  </>
                  )}
                </DroppableColumn>
              );
            })}
          </div>
        )}
        <DragOverlay>
          {activeTask ? (
            <div className="p-3.5 rounded-xl bg-surface border border-brand-accent shadow-2xl font-mono text-xs w-[280px] opacity-90">
              <span className="font-bold text-brand-accent">{activeTask.order.orderNumber}</span>
              <p className="font-bold text-text-primary truncate">{activeTask.order.items?.[0]?.snapshotName}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {/* 3D Preview & Workshop Work Ticket Modal */}
      {previewTask && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewTask(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Tiket kerja workshop"
        >
          <div
            className="bg-surface border border-border-subtle rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-accent/15 border border-brand-accent/30 text-brand-accent">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-sans text-xl font-bold text-text-primary">
                      Tiket Kerja Workshop: {previewTask.order.orderNumber}
                    </h2>
                    {isExpressTask(previewTask) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                        ⚡ EXPRESS
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-text-muted">
                    Stage saat ini:{" "}
                    <span className="font-bold text-brand-accent">
                      {STAGES.find((s) => s.id === previewTask.stage)?.label || previewTask.stage}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Apparel Mockup & Master File */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-subtle overflow-hidden bg-black/10 dark:bg-black/40 aspect-[4/5] relative flex items-center justify-center">
                  {previewTask.mockupPreviewUrl || previewTask.order.items?.[0]?.snapshotImageUrl ? (
                    <img
                      src={previewTask.mockupPreviewUrl || previewTask.order.items?.[0]?.snapshotImageUrl || ""}
                      alt="Pratinjau Mockup"
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="text-center p-6 text-text-muted font-mono text-xs">
                      <Package size={40} className="mx-auto mb-2 opacity-40" />
                      <span>Mockup 3D tidak tersedia untuk order ini</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] flex justify-between items-center">
                    <span className="truncate pr-2">{previewTask.order.items?.[0]?.snapshotName || "Sablon DTF Apparel"}</span>
                    <span className="font-bold text-brand-accent shrink-0">
                      Size {previewTask.order.items?.[0]?.snapshotSize}
                    </span>
                  </div>
                </div>

                {/* Preview 3D ringan (on-demand): foto snapshot tetap utama;
                    model 3D generik hanya untuk cek siluet apparel. */}
                <div className="rounded-2xl border border-border-subtle overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreview3DOpen((v) => !v)}
                    aria-expanded={preview3DOpen}
                    className="w-full px-4 py-2.5 flex items-center justify-between font-mono text-xs font-bold text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <RefreshCw size={13} className="text-brand-accent" />
                      <span>Pratinjau 3D Orbit (ringan)</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-text-muted transition-transform ${preview3DOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {preview3DOpen && (
                    <div className="border-t border-border-subtle">
                      <Showcase3DOrbitViewer
                        apparelSlug={guessApparelSlug(previewTask.order.items?.[0]?.snapshotName)}
                        colorHex={guessColorHex(previewTask.order.items?.[0]?.snapshotColorName)}
                      />
                      <p className="px-4 py-2 font-mono text-[10px] text-text-muted">
                        Model 3D generik ({guessApparelSlug(previewTask.order.items?.[0]?.snapshotName)}) —
                        detail sablon lihat foto snapshot di atas.
                      </p>
                    </div>
                  )}
                </div>

                {previewTask.printFileUrl ? (
                  <div className="p-4 rounded-2xl bg-surface border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>Master Film DTF 300 DPI</span>
                      </span>
                      <span className="text-[10px] text-text-muted">Siap Maklon</span>
                    </div>
                    <a
                      href={previewTask.printFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={14} />
                      <span>Unduh File Cetak 300 DPI</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono text-xs text-center">
                    ⚠️ Belum ada file cetak master terlampir.
                  </div>
                )}
                {/* Master-attach: lampirkan/refresh master + resi + WA opsional */}
                <MasterAttachForm
                  task={previewTask}
                  onUpdated={(t) => {
                    setPreviewTask(t);
                    queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
                  }}
                />
              </div>

              {/* Right: Physical Calibrated DTF Specs */}
              <div className="space-y-4 font-mono text-xs">
                {/* Card Kalibrasi Fisik */}
                <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
                  <h3 className="font-sans font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <span>📏 Parameter Fisik Sablon DTF</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                      <span className="text-text-muted block text-[10px]">LEBAR CETAK:</span>
                      <span className="font-bold text-brand-accent text-sm">
                        {previewTask.printWidthCm != null ? `${Math.min(previewTask.printWidthCm, 30.0).toFixed(1)} cm` : "—"}
                      </span>
                      <span className="text-[9px] text-text-muted block">
                        Maksimal 30.0 cm{previewTask.printWidthCm != null && previewTask.printWidthCm > 30.0 ? " · dibatasi" : ""}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                      <span className="text-text-muted block text-[10px]">TINGGI CETAK:</span>
                      <span className="font-bold text-brand-accent text-sm">
                        {previewTask.printHeightCm ? `${previewTask.printHeightCm} cm` : "—"}
                      </span>
                      <span className="text-[9px] text-text-muted block">Skala proporsional</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30 space-y-1">
                    <span className="text-text-muted block text-[10px]">POSISI & JARAK KERAH (SOP):</span>
                    <p className="font-bold text-text-primary">
                      📍 {previewTask.placementSide || "Dada Depan"} ·{" "}
                      <span className="text-brand-accent">
                        {previewTask.offsetFromCollarCm
                          ? `${previewTask.offsetFromCollarCm} cm di bawah kerah`
                          : "5.0 cm di bawah jahitan kerah"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* SOP Heat Press Makassar */}
                <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5">
                  <h3 className="font-sans font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-500" />
                    <span>SOP Mesin Heat Press (Makassar)</span>
                  </h3>
                  <div className="space-y-1.5 text-[11px] text-text-muted">
                    <div className="flex justify-between border-b border-border-subtle pb-1">
                      <span>Suhu Press:</span>
                      <span className="font-bold text-text-primary">160°C (320°F)</span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1">
                      <span>Durasi Press Awal:</span>
                      <span className="font-bold text-text-primary">15 Detik (Medium Pressure)</span>
                    </div>
                    <div className="flex justify-between border-b border-border-subtle pb-1">
                      <span>Metode Peel:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">Cold Peel (Tunggu Dingin Total)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Finishing Press:</span>
                      <span className="font-bold text-text-primary">5 Detik (Dengan Lembar Teflon)</span>
                    </div>
                  </div>
                </div>

                {/* Info Pemesan & Logistik */}
                <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pemesan:</span>
                    <span className="font-bold text-text-primary">{previewTask.order.user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">No. WhatsApp:</span>
                    <span className="font-bold text-brand-accent">{previewTask.order.user?.phoneNumber ? maskPhone(previewTask.order.user.phoneNumber) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pengiriman:</span>
                    <span className="font-bold text-text-primary">{previewTask.order.deliveryMethod}</span>
                  </div>
                  {courierNotesOf(previewTask) && (
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-[10px] text-text-muted">
                      Catatan: {courierNotesOf(previewTask)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`/admin/orders/${previewTask.orderId}`}
                  className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary font-mono text-xs font-bold hover:border-brand-accent transition-all flex items-center gap-1.5"
                >
                  <span>Detail Pesanan</span>
                  <ExternalLink size={12} />
                </a>
                <a
                  href={`/admin/orders/${previewTask.orderId}/job-ticket`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:border-amber-500/50 text-text-primary font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Cetak slip kerja SPK fisik meja heat press"
                >
                  <Printer size={12} className="text-amber-500" />
                  <span>Cetak SPK</span>
                </a>
              </div>
              <div className="flex items-center gap-2">
                {!previewTask.assignedToUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      claimTaskMutation.mutate({ taskId: previewTask.id });
                      setPreviewTask(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-surface border border-border-strong text-text-primary font-mono text-xs font-bold hover:border-brand-accent transition-all"
                  >
                    Ambil Task Ini
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="px-5 py-2 rounded-xl bg-brand-accent text-canvas font-mono text-xs font-bold hover:brightness-110 transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
