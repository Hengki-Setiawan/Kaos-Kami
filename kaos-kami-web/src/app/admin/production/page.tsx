"use client";

import React, { useEffect, useMemo, useState } from "react";
import nextDynamic from "next/dynamic";
import type { ApparelType } from "@/lib/constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Preview 3D ringan: chunk three.js hanya diunduh saat modal tiket dibuka
// (dynamic + ssr:false), dan kanvas WebGL hanya di-mount saat staf menekan
// tombol "Lihat 3D". Visual utama tetap <img> snapshotImageUrl (ringan).
// Preview 3D Interaktif dengan Desain & Decal Asli Pesanan (Client-only chunk)
const OrderInspector3D = nextDynamic(
  () => import("@/components/admin/OrderInspector3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/5] min-h-[300px] rounded-2xl border border-border-subtle bg-black/20 flex items-center justify-center font-mono text-xs text-text-muted">
        Memuat Mockup 3D Interaktif…
      </div>
    ),
  }
);
import { ActivityHistoryModal } from "@/components/admin/ActivityHistoryModal";

// Heuristik Kaos Kami: Prioritaskan Kaos/T-Shirt (Kaos Kami TIDAK menjual Kemeja)
function guessApparelSlug(name?: string | null): ApparelType {
  const n = (name || "").toLowerCase();
  if (n.includes("hoodie")) return "hoodie";
  if (n.includes("crewneck") || n.includes("sweater")) return "crewneck";
  if (n.includes("longsleeve") || n.includes("lengan panjang")) return "longsleeve";
  if (n.includes("tshirt") || n.includes("t-shirt") || n.includes("kaos") || n.includes("tee")) return "tshirt";
  if (n.includes("jacket") || n.includes("jaket") || n.includes("coach")) return "shirt";
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

function guessApparelLabel(name?: string | null): string {
  const n = (name || "").toLowerCase();
  if (n.includes("hoodie")) return "Hoodie Jumper";
  if (n.includes("crewneck") || n.includes("sweater")) return "Crewneck Sweater";
  if (n.includes("longsleeve") || n.includes("lengan panjang")) return "Kaos Lengan Panjang";
  if (n.includes("jacket") || n.includes("jaket") || n.includes("coach")) return "Coach Jacket";
  return "Kaos Polos Pendek (T-Shirt)";
}

function guessFabricType(apparelType: ApparelType): string {
  switch (apparelType) {
    case "hoodie":
      return "Cotton Fleece Heavyweight 380 GSM";
    case "crewneck":
      return "Cotton Fleece 320 GSM";
    case "longsleeve":
      return "Cotton Combed 24s Longsleeve Reaktif";
    case "shirt":
      return "Taslan Milky Windproof / Micro Ripstop";
    case "tshirt":
    default:
      return "Cotton Combed 24s Reaktif (180 GSM)";
  }
}

function getProductionInspectorSeed(
  task: ProductionTaskItem,
  allTasks?: ProductionTaskItem[]
): any {
  const item = task.order?.items?.[0];
  const apparel = guessApparelSlug(item?.snapshotName);
  const colorHex = guessColorHex(item?.snapshotColorName);
  const colorName = item?.snapshotColorName || "Hitam";
  const size = item?.snapshotSize || "L";

  let decals: any[] = [];
  const rawDesign = (item as any)?.design;
  if (rawDesign?.decals) {
    try {
      decals = typeof rawDesign.decals === "string" ? JSON.parse(rawDesign.decals) : rawDesign.decals;
    } catch {}
  }

  // Jika tidak ada decals dari relasi design, kumpulkan dari semua task terkait order ini (mendukung multi-sisi depan, belakang, lengan)
  if (!Array.isArray(decals) || decals.length === 0) {
    const relatedTasks = allTasks ? allTasks.filter((t) => t.orderId === task.orderId) : [task];
    const gathered: any[] = [];
    for (const t of relatedTasks) {
      const artworkUrl = t.printFileUrl || t.mockupPreviewUrl || t.rawAssetUrl || item?.snapshotImageUrl;
      if (artworkUrl) {
        const side = (t.placementSide || "front").toLowerCase();
        gathered.push({
          id: `task-decal-${t.id}`,
          url: artworkUrl,
          targetSide: side === "back" ? "back" : "front",
          scale: 0.14,
          x: 0,
          y: -0.05,
          rotation: 0,
          printWidthCm: t.printWidthCm || 28,
          printHeightCm: t.printHeightCm || 12,
          offsetFromCollarCm: t.offsetFromCollarCm || 6.5,
        });
      }
    }
    decals = gathered;
  }

  return {
    apparel,
    colorHex,
    colorName,
    size,
    decals,
    printWidthCm: task.printWidthCm,
    printHeightCm: task.printHeightCm,
    offsetFromCollarCm: task.offsetFromCollarCm,
  };
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
  Ruler,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Camera,
  User,
  LayoutGrid,
  Boxes,
  Shirt,
  History,
  Download,
  Check,
} from "lucide-react";
import { packGangSheet, type GangPlacement } from "@/lib/gangPacker";
import { exportGangSheetPNG } from "@/lib/gangExport";
import { buildProductionStatusMessage } from "@/lib/notifications/whatsapp";
import { maskPhone } from "@/lib/mask";
import { FlatWorkshopBlueprintViewer } from "@/components/admin/FlatWorkshopBlueprintViewer";
import { computeFlatWorkshopPlacement } from "@/lib/workshopBlueprint";

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
  completedAt?: string | null;
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
    createdAt?: string | null;
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
    id: "design_intake",
    label: "1. Desain Masuk",
    sublabel: "Desain Pelanggan → Proses ke Gang Sheet",
    stages: ["DESIGN_PREP"],
    icon: FileText,
    color: "border-blue-500/40 text-blue-700 dark:text-blue-400",
  },
  {
    id: "gang_queue",
    label: "2. Antrean Gang Sheet",
    sublabel: "Roll Film DTF → Susun & Cetak",
    stages: ["SCREEN_PRINT_SETUP"],
    icon: Printer,
    color: "border-cyan-500/40 text-cyan-700 dark:text-cyan-400",
  },
  {
    id: "pressing_qc",
    label: "3. Siap Sablon",
    sublabel: "Press 160°C 15s → Cold Peel → Uji QC",
    stages: ["PRINTING", "PRESSING", "QUALITY_CHECK"],
    icon: Flame,
    color: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  },
  {
    id: "packing_done",
    label: "4. Pesanan Disiapkan (Packing)",
    sublabel: "Masuk Polymailer → Dikelompokkan per Order",
    stages: ["PACKAGING"],
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
        <span className="flex items-center gap-1">
          <Camera size={11} className="text-brand-accent shrink-0" />
          <span>QC Visual</span>
          {rows !== null && rows.length > 0
            ? ` · ${lolosCount} Lolos${defectCount > 0 ? ` · ${defectCount} Defect` : ""}`
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
              <span>{error}</span>
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
                        {checks.length === 0 ? "Lolos QC" : `Periksa: ${checks.join(", ")}`}
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
    <div
      onClick={() => onOpenPreview(task)}
      className="p-3.5 rounded-2xl bg-surface/90 border border-border-subtle hover:border-brand-accent/60 transition-all space-y-3 font-sans text-sm shadow-md hover:shadow-xl cursor-pointer group relative overflow-hidden backdrop-blur-xs"
    >
      {/* Top Row: Order ID, Preview Button & Priority Badges */}
      <div className="flex justify-between items-start gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="font-mono tabular-nums font-bold text-brand-accent text-xs tracking-tight">
            {task.order.orderNumber}
          </span>
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
        <div className="flex gap-1 flex-wrap items-center">
          {nmTim && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/40">
              {nmTim}
            </span>
          )}
          {express && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${
                h3
                  ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"
              }`}
            >
              <Zap size={10} className="shrink-0" />
              <span>{h3 ? "H-3 JAM" : "EXPRESS"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Item Details + Thumbnail Preview */}
      <div className="flex items-center gap-2.5">
        {(task.mockupPreviewUrl || task.order.items?.[0]?.snapshotImageUrl) ? (
          <div className="w-11 h-13 rounded-xl overflow-hidden bg-black/20 border border-border-subtle shrink-0 relative shadow-inner">
            <img
              src={task.mockupPreviewUrl || task.order.items?.[0]?.snapshotImageUrl || ""}
              alt="Mockup"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-sans font-bold text-text-primary text-xs leading-snug truncate">
            {task.order.items?.[0]?.snapshotName || "Sablon DTF Apparel"}
            {(task.order.items?.length || 0) > 1 && (
              <span className="text-brand-accent font-mono"> +{(task.order.items?.length || 1) - 1} item</span>
            )}
          </p>
          <p className="text-[11px] font-mono text-text-muted truncate">
            Size {task.order.items?.[0]?.snapshotSize || "L"} · {task.order.items?.[0]?.snapshotColorName || "Hitam"} ·{" "}
            {task.order.items?.reduce((a, it) => a + (it.quantity || 0), 0) || 1} pcs
          </p>
          {task.printWidthCm && task.printHeightCm && (
            <p className="text-[10px] font-mono text-brand-accent/80">
              Sablon: {task.printWidthCm}×{task.printHeightCm} cm
            </p>
          )}
        </div>
      </div>

      {/* Footer Info: Pelanggan & Sisi Sablon */}
      <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-border-subtle pt-2">
        <span className="truncate max-w-[130px] font-medium text-text-primary">
          {task.order.user?.name || "Pelanggan"}
        </span>
        <span className="px-1.5 py-0.5 rounded-md bg-brand-accent/10 border border-brand-accent/30 font-mono text-[9px] text-brand-accent font-bold uppercase tracking-wider">
          {task.placementSide || "Dada Depan"}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-between border-t border-border-subtle gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview(task);
          }}
          className="px-2.5 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary hover:text-brand-accent font-bold text-[10px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <Eye size={12} className="text-brand-accent" />
          <span>Lihat 3D & Detail</span>
        </button>

        <div className="flex items-center gap-1.5">
          {onAdvance && (
            <button
              type="button"
              disabled={isChecking}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(task);
              }}
              className="px-3 py-1.5 rounded-xl bg-brand-accent text-canvas font-bold text-[10px] uppercase hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <span>{isChecking ? "CEK QC…" : advanceLabel || "LANJUT"}</span>
              <ChevronRight size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GangSheetRollCard({
  rollNumber,
  tasks,
  onOpenRollModal,
  onPrintRoll,
  isPrinting,
}: {
  rollNumber: number;
  tasks: ProductionTaskItem[];
  onOpenRollModal: () => void;
  onPrintRoll: () => void;
  isPrinting?: boolean;
}) {
  const totalPcs = tasks.reduce((sum, t) => sum + orderTotalPcs(t.order), 0);

  // Kalkulasi susunan gang sheet nyata persis engine gangPacker (580 x 1000 mm)
  const gangPack = useMemo(() => {
    const items = tasks.map((t) => ({
      id: t.id,
      wMm: Math.round((t.printWidthCm || 28) * 10),
      hMm: Math.round((t.printHeightCm || 12) * 10),
      orderNumber: t.order.orderNumber,
      masterUrl:
        t.printFileUrl ||
        t.mockupPreviewUrl ||
        t.rawAssetUrl ||
        t.order.items?.[0]?.snapshotImageUrl ||
        "",
      label: t.order.items?.[0]?.snapshotName || "DTF Sablon",
      qty: 1,
    }));
    return packGangSheet(items, { binWmm: 580, binHmm: 1000, marginMm: 10, gapMm: 6 });
  }, [tasks]);

  const placements = gangPack.bins[0] || [];

  return (
    <div
      onClick={onOpenRollModal}
      className="p-4 rounded-2xl bg-surface border-2 border-amber-500/40 hover:border-amber-500 transition-all space-y-3 font-sans shadow-lg cursor-pointer group relative overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header info */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Layers size={14} />
            </span>
            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Roll Gang Sheet #{rollNumber}
            </span>
          </div>
          <h4 className="font-bold text-sm text-text-primary mt-1">
            Roll Film DTF 100 × 58 cm
          </h4>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
          {tasks.length} Desain
        </span>
      </div>

      {/* Visual Kontinu Roll PET Film 58.0 cm Makassar */}
      <div className="p-2.5 rounded-xl bg-black/90 border border-amber-500/40 space-y-1.5 shadow-inner">
        <div className="flex items-center justify-between text-[9px] font-mono text-amber-400 px-1">
          <span className="flex items-center gap-1 font-bold">
            <Ruler size={10} />
            <span>LEBAR 58 CM</span>
          </span>
          <span className="text-amber-400/80">PANJANG 100 CM</span>
        </div>

        {/* Continuous SVG Canvas Mini Preview */}
        <div className="relative rounded-lg overflow-hidden bg-[#0a0f1d] border border-amber-500/30 aspect-[580/550] max-h-[150px] flex items-center justify-center p-1">
          <svg viewBox="0 0 580 1000" className="w-full h-full drop-shadow">
            {/* Background Lembar Film PET Gelap */}
            <rect x={0} y={0} width={580} height={1000} fill="#0d1424" />
            {/* Margin Aman Cetak 10mm */}
            <rect
              x={10}
              y={10}
              width={560}
              height={980}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="10 8"
              opacity={0.6}
            />
            {/* Penataan Artwork Nyata Hasil packGangSheet */}
            {placements.map((p, idx) => (
              <g key={`${p.id}-${idx}`}>
                <rect
                  x={p.xMm}
                  y={p.yMm}
                  width={p.wMm}
                  height={p.hMm}
                  fill="rgba(56, 189, 248, 0.08)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                />
                {p.masterUrl && (
                  <image
                    href={p.masterUrl}
                    x={p.xMm + 4}
                    y={p.yMm + 4}
                    width={p.wMm - 8}
                    height={p.hMm - 8}
                    preserveAspectRatio="xMidYMid meet"
                    opacity={0.88}
                  />
                )}
                <rect
                  x={p.xMm + 4}
                  y={p.yMm + 4}
                  width={Math.min(p.wMm - 8, 140)}
                  height={26}
                  rx={4}
                  fill="rgba(0,0,0,0.85)"
                />
                <text
                  x={p.xMm + 8}
                  y={p.yMm + 21}
                  fill="#38bdf8"
                  fontSize={16}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  #{idx + 1} {p.orderNumber.slice(-4)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Orders summary */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold text-text-muted block">
          Pesanan Tergabung ({totalPcs} pcs):
        </span>
        <div className="flex flex-wrap gap-1">
          {tasks.map((t) => (
            <span
              key={t.id}
              className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-border-subtle font-mono text-[10px] text-text-primary"
            >
              {t.order.orderNumber} ({t.order.items?.[0]?.snapshotSize || "L"})
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-1 space-y-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenRollModal();
          }}
          className="w-full py-2 rounded-xl bg-surface border border-border-subtle hover:border-amber-500 text-text-primary font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Eye size={12} className="text-amber-500" />
          <span>Buka Roll Film & Master HD</span>
        </button>

        <button
          type="button"
          disabled={isPrinting}
          onClick={(e) => {
            e.stopPropagation();
            onPrintRoll();
          }}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
        >
          <Printer size={14} />
          <span>
            {isPrinting ? "MEMPROSES ROLL…" : "SUDAH CETAK FILM (SIAP SABLON) →"}
          </span>
        </button>
      </div>
    </div>
  );
}

function GangSheetRollModal({
  roll,
  onClose,
  onPrintRoll,
  isPrinting,
}: {
  roll: { rollNumber: number; tasks: ProductionTaskItem[] };
  onClose: () => void;
  onPrintRoll: () => void;
  isPrinting?: boolean;
}) {
  const totalPcs = roll.tasks.reduce((sum, t) => sum + orderTotalPcs(t.order), 0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Hitung susunan roll film nyata persis engine gangPacker (580 x 1000 mm)
  const gangPack = useMemo(() => {
    const items = roll.tasks.map((t) => ({
      id: t.id,
      wMm: Math.round((t.printWidthCm || 28) * 10),
      hMm: Math.round((t.printHeightCm || 12) * 10),
      orderNumber: t.order.orderNumber,
      masterUrl:
        t.printFileUrl ||
        t.mockupPreviewUrl ||
        t.rawAssetUrl ||
        t.order.items?.[0]?.snapshotImageUrl ||
        "",
      label: t.order.items?.[0]?.snapshotName || "DTF Sablon",
      qty: 1,
    }));
    return packGangSheet(items, { binWmm: 580, binHmm: 1000, marginMm: 10, gapMm: 6 });
  }, [roll.tasks]);

  const placements = gangPack.bins[0] || [];

  // Unduh Master PNG 300 DPI composite asli via exportGangSheetPNG
  const handleDownloadGangSheetPNG = async () => {
    if (placements.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const out = await exportGangSheetPNG({
        placements,
        binWmm: 580,
        binHmm: 1000,
        dpi: 300,
        cutLines: true,
        gangId: `ROLL-${roll.rollNumber}-${new Date().toISOString().slice(0, 10)}`,
      });
      const url = URL.createObjectURL(out.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = out.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportSuccess(`Berhasil unduh ${out.filename} (300 DPI)`);
    } catch (err) {
      console.error("Gagal ekspor gang sheet PNG:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Modal Gang Sheet Roll"
    >
      <div
        className="bg-surface border border-border-subtle rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans text-xl font-bold text-text-primary">
                  Roll Gang Sheet DTF #{roll.rollNumber} (100 × 58 cm)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                  {roll.tasks.length} DESAIN TERGABUNG
                </span>
              </div>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                Layout Media Roll PET Film DTF Lebar 58.0 cm Makassar · Total {totalPcs} pcs pakaian
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Film Roll Visualizer Canvas (Real Continuous SVG Sheet) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Printer size={14} className="text-amber-500" />
                <span>Lembar Kontinu PET Roll Film (100 × 58 cm)</span>
              </span>
              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Cold-Peel Double Matte
              </span>
            </div>

            {/* Continuous 100 x 58 cm SVG PET Roll Film Canvas */}
            <div className="rounded-2xl border-2 border-amber-500/40 bg-[#090d16] p-3 text-white space-y-2 relative overflow-hidden shadow-inner">
              {/* Top Ruler: Lebar 58.0 cm */}
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5 px-2 font-mono text-[10px] text-amber-400">
                <span className="flex items-center gap-1 font-bold">
                  <Ruler size={12} />
                  <span>0 cm</span>
                </span>
                <span className="text-text-muted text-[9px]">15 cm</span>
                <span className="font-bold">28.0 cm (Tengah)</span>
                <span className="text-text-muted text-[9px]">45 cm</span>
                <span className="font-bold text-amber-300">58.0 cm (Maks Roll)</span>
              </div>

              {/* Film Surface SVG Container */}
              <div className="p-2 bg-black/70 rounded-xl border border-white/10 aspect-[580/720] max-h-[380px] flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 580 1000" className="w-full h-full drop-shadow">
                  {/* Film Surface Background */}
                  <rect x={0} y={0} width={580} height={1000} fill="#0d1424" />
                  {/* Margin Aman 10mm */}
                  <rect
                    x={10}
                    y={10}
                    width={560}
                    height={980}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="10 8"
                    opacity={0.65}
                  />

                  {/* Artwork Placements */}
                  {placements.map((p, idx) => {
                    const labelCm = `${(p.wMm / 10).toFixed(1)}×${(p.hMm / 10).toFixed(1)} cm`;
                    return (
                      <g key={`${p.id}-${idx}`}>
                        <rect
                          x={p.xMm}
                          y={p.yMm}
                          width={p.wMm}
                          height={p.hMm}
                          fill="rgba(56, 189, 248, 0.08)"
                          stroke="#38bdf8"
                          strokeWidth={2.5}
                        />
                        {p.masterUrl && (
                          <image
                            href={p.masterUrl}
                            x={p.xMm + 4}
                            y={p.yMm + 4}
                            width={p.wMm - 8}
                            height={p.hMm - 8}
                            preserveAspectRatio="xMidYMid meet"
                            opacity={0.92}
                          />
                        )}
                        {/* Order & Size Tag Banner */}
                        <rect
                          x={p.xMm + 4}
                          y={p.yMm + 4}
                          width={Math.min(p.wMm - 8, 180)}
                          height={28}
                          rx={5}
                          fill="rgba(0,0,0,0.85)"
                          stroke="#38bdf8"
                          strokeWidth={1}
                        />
                        <text
                          x={p.xMm + 10}
                          y={p.yMm + 23}
                          fill="#ffffff"
                          fontSize={16}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          #{idx + 1} {p.orderNumber}
                        </text>

                        {/* Dimension Badge Bottom */}
                        <rect
                          x={p.xMm + 4}
                          y={p.yMm + p.hMm - 26}
                          width={Math.min(p.wMm - 8, 130)}
                          height={22}
                          rx={4}
                          fill="rgba(0,0,0,0.85)"
                          stroke="#f59e0b"
                          strokeWidth={0.8}
                        />
                        <text
                          x={p.xMm + 8}
                          y={p.yMm + p.hMm - 10}
                          fill="#fbbf24"
                          fontSize={13}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelCm}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Bottom Roll Indicator */}
              <div className="flex justify-between items-center font-mono text-[9px] text-amber-400/80 pt-1 px-1">
                <span>Area Efektif Cetak: 56.0 cm</span>
                <span>Panjang Roll: 100.0 cm</span>
              </div>
            </div>

            {/* Quick Export & Builder Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadGangSheetPNG}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Download size={14} />
                <span>
                  {isExporting ? "MENGEKSPOR PNG…" : "Unduh Master Roll (300 DPI)"}
                </span>
              </button>

              <a
                href="/admin/gang-sheet"
                className="py-2.5 px-3 rounded-xl bg-surface border border-border-subtle hover:border-amber-500 text-text-primary font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Layers size={13} className="text-amber-500" />
                <span>Editor Gang Sheet ↗</span>
              </a>
            </div>

            {exportSuccess && (
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check size={14} />
                <span>{exportSuccess}</span>
              </p>
            )}
          </div>

          {/* Right: Roll Contents & Technical DTF Specs (Data-Dense, Zero Slop) */}
          <div className="space-y-4 font-mono text-xs">
            {/* Rincian Desain Tergabung */}
            <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="font-sans font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-brand-accent" />
                  <span>Daftar Desain Tergabung ({roll.tasks.length} Desain)</span>
                </span>
                <span className="text-[10px] text-brand-accent font-mono font-bold">
                  {totalPcs} Pcs Total
                </span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {roll.tasks.map((t, idx) => {
                  const artUrl =
                    t.printFileUrl ||
                    t.mockupPreviewUrl ||
                    t.rawAssetUrl ||
                    t.order.items?.[0]?.snapshotImageUrl;
                  const item = t.order.items?.[0];
                  const wCm = t.printWidthCm ? `${t.printWidthCm.toFixed(1)} cm` : "28.0 cm";
                  const hCm = t.printHeightCm ? `${t.printHeightCm.toFixed(1)} cm` : "12.0 cm";

                  return (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle flex items-center justify-between gap-3 text-[11px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {artUrl ? (
                          <img
                            src={artUrl}
                            alt={t.order.orderNumber}
                            className="w-9 h-9 object-contain rounded-md bg-black/20 border border-border-subtle shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-black/10 flex items-center justify-center font-bold text-text-muted text-[10px] shrink-0">
                            #{idx + 1}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-text-primary truncate font-sans">
                            {t.order.orderNumber} · {t.order.user?.name || "Pelanggan"}
                          </p>
                          <p className="text-[10px] text-text-muted truncate">
                            {item?.snapshotName || "Kaos Sablon"} ({item?.snapshotColorName} - Size {item?.snapshotSize}) · {wCm} × {hCm}
                          </p>
                        </div>
                      </div>

                      {artUrl && (
                        <a
                          href={artUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-2.5 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent text-brand-accent font-bold text-[10px] shrink-0 transition-colors flex items-center gap-1"
                        >
                          <FileText size={11} />
                          <span>HD</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spesifikasi Roll DTF Makassar */}
            <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5 text-[11px]">
              <h4 className="font-sans font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-amber-500" />
                <span>Spesifikasi Produksi Roll DTF</span>
              </h4>
              <div className="space-y-1.5 text-text-muted border-t border-border-subtle pt-2">
                <div className="flex justify-between">
                  <span>Lebar Media Film:</span>
                  <span className="font-bold text-text-primary">58.0 cm (Area Efektif 56 cm)</span>
                </div>
                <div className="flex justify-between">
                  <span>Panjang Media Roll:</span>
                  <span className="font-bold text-text-primary">100.0 cm</span>
                </div>
                <div className="flex justify-between">
                  <span>Jenis Film:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">PET Cold Peel (Double Matte 75µ)</span>
                </div>
                <div className="flex justify-between">
                  <span>Tinta & White Layer:</span>
                  <span className="font-bold text-text-primary">DTF CMYK + High-Density White Underbase</span>
                </div>
                <div className="flex justify-between">
                  <span>Curing Oven Serbuk:</span>
                  <span className="font-bold text-text-primary">160°C selama 120 Detik</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
          <a
            href="/admin/gang-sheet"
            className="px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-amber-500/50 text-text-primary font-mono text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Layers size={13} className="text-amber-500" />
            <span>Editor Gang Sheet (100×58cm)</span>
          </a>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isPrinting}
              onClick={onPrintRoll}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Printer size={14} />
              <span>{isPrinting ? "MEMPROSES ROLL…" : "SUDAH CETAK FILM (SIAP SABLON) →"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-text-primary font-mono text-xs font-bold hover:bg-black/20 dark:hover:bg-white/20 transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
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
          ? "Master terlampir + WA terkirim."
          : data.waError
            ? `Master terlampir (WA: ${data.waError}).`
            : "Master terlampir + event tercatat."
      );
      // Segarkan tiket dari server (GET ulang kanban) + update modal lokal.
      try {
        const merged = { ...task, ...(data.task || {}) } as ProductionTaskItem;
        onUpdated(merged);
      } catch {
        // abaikan
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal melampirkan master.");
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
  // Mode pratinjau tiket: "3d" = Model 3D Interaktif + Decal, "flat" = Lembar Pola 2D CAD, "master" = File Cetak HD
  const [previewModeTab, setPreviewModeTab] = useState<"3d" | "flat" | "master">("3d");
  const [selectedGangRoll, setSelectedGangRoll] = useState<{
    rollNumber: number;
    tasks: ProductionTaskItem[];
  } | null>(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    if (previewTask) {
      if (previewTask.stage === "DESIGN_PREP") {
        setPreviewModeTab("3d");
      } else if (previewTask.stage === "PRESSING" || previewTask.stage === "PRINTING") {
        setPreviewModeTab("flat");
      } else {
        setPreviewModeTab("3d");
      }
    }
  }, [previewTask?.id, previewTask?.stage]);

  const advanceGangRollToPressing = async (rollTasks: ProductionTaskItem[]) => {
    if (!rollTasks || rollTasks.length === 0) return;
    setIsBatchPrinting(true);
    setActionError(null);
    try {
      const taskIds = rollTasks.map((t) => t.id);
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds,
          stage: "PRESSING",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Gagal memperbarui status roll gang sheet");
      }
      setSelectedGangRoll(null);
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
    } catch (err: any) {
      setActionError(err instanceof Error ? err.message : "Gagal memproses batch roll gang sheet.");
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setIsBatchPrinting(false);
    }
  };

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
    const next = !multiOnly;
    setMultiOnly(next);
    try {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("teamwear", "1");
      else {
        url.searchParams.delete("teamwear");
        url.searchParams.delete("multi");
      }
      window.history.replaceState(null, "", url.toString());
    } catch { /* abaikan */ }
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
              : `Task ${task.order.orderNumber} tertahan: belum ada foto QC (0 Lolos). Buka section QC Visual di kartu, minta operator QC memfoto + meloloskan dulu.`
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
    moveTaskMutation.mutate(
      { taskId: task.id, stage: nextStage, fromStage: task.stage },
      {
        onSuccess: () => {
          if (task.stage === "DESIGN_PREP" && nextStage === "SCREEN_PRINT_SETUP") {
            window.open("/admin/gang-sheet", "_blank");
          }
        },
      }
    );
  };

  const scrollToQc = (taskId: string) => {
    try {
      document.getElementById(`qc-${taskId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch { /* abaikan */ }
  };

  const getNextStageAndLabel = (currentStage: string): { nextStage: string | null; label: string } => {
    const stageMap: Record<string, { nextStage: string; label: string }> = {
      DESIGN_PREP: { nextStage: "SCREEN_PRINT_SETUP", label: "GANG SHEET" },
      SCREEN_PRINT_SETUP: { nextStage: "PRESSING", label: "FILM DICETAK" },
      PRINTING: { nextStage: "PRESSING", label: "HEAT PRESS" },
      PRESSING: { nextStage: "PACKAGING", label: "QC & PACKING" },
      QUALITY_CHECK: { nextStage: "PACKAGING", label: "QC & PACKING" },
      PACKAGING: { nextStage: "DONE", label: "SIAP" },
    };
    return stageMap[currentStage] || { nextStage: null, label: "SELESAI" };
  };

  const completeOrderPackaging = async (orderId: string, taskIds: string[]) => {
    try {
      setActionError(null);
      await Promise.all(
        taskIds.map((taskId) =>
          fetch("/api/admin/production-tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, stage: "DONE" }),
          })
        )
      );
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READY_TO_SHIP" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Gagal memperbarui status order");
      }
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
    } catch (e: any) {
      setActionError(e instanceof Error ? e.message : "Gagal menyelesaikan packaging pesanan.");
      setTimeout(() => setActionError(null), 5000);
    }
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold uppercase tracking-tight text-text-primary flex items-center gap-2.5">
            <Layers size={24} className="text-brand-accent" />
            <span>Alur Produksi Workshop</span>
          </h1>
          <p className="font-mono text-xs text-text-muted mt-0.5">
            4 Tahap Operasional: Desain Masuk → Antrean Gang Sheet → Siap Sablon (DTF) → Pesanan Disiapkan (Packing).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[40px] shadow-xs cursor-pointer"
            title="Lihat Log Riwayat Aktivitas & Perubahan Produksi"
          >
            <History size={13} className="text-brand-accent" />
            <span>Riwayat Log</span>
          </button>

          <a
            href="/admin/gang-sheet"
            className="px-3 py-2 rounded-xl bg-surface border border-border-subtle hover:border-amber-500/50 text-text-primary text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[40px] shadow-xs"
            title="Buka Alat Penataan Gang Sheet DTF 100×58cm"
          >
            <Layers size={13} className="text-amber-500" />
            <span>Gang Sheet 100×58</span>
          </a>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pesanan / nama…"
              aria-label="Cari pesanan"
              className="pl-9 pr-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
            />
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title="Refresh Antrean"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={toggleMultiFilter}
            aria-pressed={multiOnly}
            title="Filter: Hanya tampilkan pesanan dengan lebih dari 1 item pakaian"
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[40px] cursor-pointer ${
              multiOnly
                ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
            }`}
          >
            <Package size={13} />
            <span>Multi-Item{multiOrderCount > 0 ? ` (${multiOrderCount})` : ""}</span>
          </button>
        </div>
      </div>
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2" role="alert">
          <AlertTriangle size={15} className="shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}
      {qcGateMsg && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2" role="alert">
          <ShieldAlert size={15} className="shrink-0 text-amber-500" />
          <span>{qcGateMsg}</span>
        </div>
      )}
      {/* UNDO 10 detik untuk pindah stage terakhir */}
      {lastMove && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/40 text-sky-800 dark:text-sky-200 text-xs flex items-center justify-between gap-3" role="status">
          <span className="flex items-center gap-2">
            <RotateCcw size={14} className="shrink-0 text-sky-600" />
            <span>{lastMove.orderNumber || "Task"} pindah {lastMove.fromStage} → {lastMove.toStage}. Batalkan dalam {undoLeft} dtk?</span>
          </span>
          <button
            type="button"
            onClick={undoLastMove}
            className="px-4 py-2 rounded-lg bg-sky-500 text-white font-bold flex items-center gap-1.5 min-h-[36px] shrink-0"
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
        {/* 4-Pillar Operational Grid (Desain Masuk → Gang Sheet → Siap Sablon → Pesanan Disiapkan) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 items-start min-h-[600px]">
          {WORKSHOP_PILLARS.map((pillar) => {
            const pillarTasks = sortByDeadline(visibleTasks.filter((t) => pillar.stages.includes(t.stage)));
            const Icon = pillar.icon;
            const pillarGroupMap = new Map<string, ProductionTaskItem[]>();
            for (const t of pillarTasks) {
              const arr = pillarGroupMap.get(t.orderId) || [];
              arr.push(t);
              pillarGroupMap.set(t.orderId, arr);
            }
            const pillarGroups = [...pillarGroupMap.entries()].map(([orderId, tasksInCol]) => ({ orderId, tasksInCol }));
            const isEmptyPillar = pillarTasks.length === 0;

            const GANG_ROLL_CAPACITY = 5;
            const gangRolls: { rollId: string; rollNumber: number; tasks: ProductionTaskItem[] }[] = [];
            if (pillar.id === "gang_queue") {
              for (let i = 0; i < pillarTasks.length; i += GANG_ROLL_CAPACITY) {
                gangRolls.push({
                  rollId: `roll-${Math.floor(i / GANG_ROLL_CAPACITY) + 1}`,
                  rollNumber: Math.floor(i / GANG_ROLL_CAPACITY) + 1,
                  tasks: pillarTasks.slice(i, i + GANG_ROLL_CAPACITY),
                });
              }
            }

            return (
              <DroppableColumn
                key={pillar.id}
                id={pillar.id}
                className="bg-surface border border-border-subtle rounded-2xl p-4 flex flex-col space-y-3 w-full min-h-[500px]"
              >
                {/* Pillar Header */}
                <div className="pb-2 border-b border-border-subtle space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon size={16} className={pillar.color} />
                      <span className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider">
                        {pillar.label}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] font-bold text-text-muted bg-canvas px-2 py-0.5 rounded-full border border-border-subtle">
                      {pillar.id === "gang_queue"
                        ? `${gangRolls.length} Roll (${pillarTasks.length} Desain)`
                        : pillarTasks.length}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-text-muted">{pillar.sublabel}</p>
                </div>

                {isEmptyPillar ? (
                  <SortableContext items={[]} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 min-h-[220px] rounded-xl border border-dashed border-border-subtle flex flex-col items-center justify-center p-4 text-center text-text-muted">
                      <Icon size={20} className="opacity-30 mb-1" />
                      <span className="text-[11px] font-medium">Antrean Kosong</span>
                      <span className="text-[10px] text-text-muted/60">Belum ada tugas di tahap ini</span>
                    </div>
                  </SortableContext>
                ) : (
                  <SortableContext items={pillarTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 flex-1 min-h-[100px]">
                      {pillar.id === "packing_done" ? (
                        /* Tahap 4: Dikelompokkan per Order Pelanggan */
                        pillarGroups.map((g) => {
                          const first = g.tasksInCol[0]!;
                          const pcs = orderTotalPcs(first.order);
                          const checking = qcCheckingId === first.id;
                          return (
                            <div
                              key={`packing-${g.orderId}`}
                              onClick={() => setPreviewTask(first)}
                              className="p-3.5 rounded-2xl bg-surface border border-emerald-500/30 hover:border-emerald-500 transition-all space-y-3 font-sans shadow-md cursor-pointer"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-mono text-xs font-bold text-brand-accent">
                                    {first.order.orderNumber}
                                  </span>
                                  <h4 className="font-bold text-sm text-text-primary mt-0.5">
                                    {first.order.user?.name || "Pelanggan"}
                                  </h4>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  Siap Packing
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-canvas border border-border-subtle space-y-1 text-xs">
                                <span className="text-[10px] uppercase font-bold text-text-muted block">
                                  Daftar Item ({pcs} pcs):
                                </span>
                                {g.tasksInCol.map((tk) => (
                                  <div key={tk.id} className="flex justify-between items-center text-[11px] py-0.5">
                                    <span className="truncate pr-2 font-medium">
                                      • {tk.order.items?.[0]?.snapshotName || "Kaos Sablon DTF"} ({tk.order.items?.[0]?.snapshotSize} / {tk.order.items?.[0]?.snapshotColorName})
                                    </span>
                                    <span className="font-mono text-text-muted shrink-0">
                                      {tk.order.items?.[0]?.quantity || 1} pcs
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                disabled={checking}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void completeOrderPackaging(g.orderId, g.tasksInCol.map((t) => t.id));
                                }}
                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                <CheckCircle2 size={14} />
                                <span>Pesanan Siap (Maju ke Pengiriman)</span>
                              </button>
                            </div>
                          );
                        })
                      ) : pillar.id === "gang_queue" ? (
                        /* Tahap 2: Dikelompokkan per Roll Gang Sheet (Opsi A) */
                        gangRolls.map((roll) => (
                          <GangSheetRollCard
                            key={roll.rollId}
                            rollNumber={roll.rollNumber}
                            tasks={roll.tasks}
                            onOpenRollModal={() => setSelectedGangRoll(roll)}
                            onPrintRoll={() => void advanceGangRollToPressing(roll.tasks)}
                            isPrinting={isBatchPrinting}
                          />
                        ))
                      ) : (
                        pillarTasks.map((task) => {
                          const nextInfo = getNextStageAndLabel(task.stage);
                          const checking = qcCheckingId === task.id;
                          return (
                            <SortableTaskCard key={task.id} task={task}>
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
                          );
                        })
                      )}
                    </div>
                  </SortableContext>
                )}
              </DroppableColumn>
            );
          })}
        </div>
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
            className="bg-surface border border-border-subtle rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative"
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 inline-flex items-center gap-1">
                        <Zap size={10} className="text-amber-500" />
                        <span>EXPRESS</span>
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
                className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Apparel 3D Mockup & File Master */}
              <div className="space-y-4">
                {/* Mode Tab Switcher: 3D Mockup, Pola Meja 2D, File Master */}
                <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setPreviewModeTab("3d")}
                    className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      previewModeTab === "3d"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Boxes size={14} />
                    <span>3D Mockup Interaktif</span>
                  </button>
                  {previewTask.stage !== "DESIGN_PREP" && (
                    <button
                      type="button"
                      onClick={() => setPreviewModeTab("flat")}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        previewModeTab === "flat"
                          ? "bg-brand-accent text-canvas shadow-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <Ruler size={14} />
                      <span>Pola Meja 2D</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewModeTab("master")}
                    className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      previewModeTab === "master"
                        ? "bg-brand-accent text-canvas shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Eye size={14} />
                    <span>File Master</span>
                  </button>
                </div>

                {/* 3D Mockup with customer decal & Orbit controls */}
                {previewModeTab === "3d" && (
                  <div className="rounded-2xl border border-border-subtle overflow-hidden bg-black/10 dark:bg-black/40 h-[460px] min-h-[460px] relative">
                    <OrderInspector3D
                      seed={getProductionInspectorSeed(previewTask, data?.tasks)}
                      initialSide={(previewTask.placementSide || "").toLowerCase() === "back" ? "back" : "front"}
                      className="w-full h-full min-h-[460px]"
                    />
                    <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] flex justify-between items-center pointer-events-none">
                      <span className="truncate pr-2">{previewTask.order.items?.[0]?.snapshotName || "Sablon DTF Apparel"}</span>
                      <span className="font-bold text-brand-accent shrink-0">
                        Size {previewTask.order.items?.[0]?.snapshotSize || "L"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Pola Meja 2D CAD Blueprint */}
                {previewModeTab === "flat" && (
                  <FlatWorkshopBlueprintViewer
                    placementParams={{
                      apparelType: guessApparelSlug(previewTask.order.items?.[0]?.snapshotName),
                      size: previewTask.order.items?.[0]?.snapshotSize,
                      targetSide: (previewTask.placementSide || "front").toLowerCase(),
                      printWidthCm: previewTask.printWidthCm,
                      printHeightCm: previewTask.printHeightCm,
                      offsetFromCollarCm: previewTask.offsetFromCollarCm,
                    }}
                    garmentColorHex={guessColorHex(previewTask.order.items?.[0]?.snapshotColorName)}
                    artworkUrl={previewTask.printFileUrl || previewTask.mockupPreviewUrl || previewTask.order.items?.[0]?.snapshotImageUrl}
                    showPrintGuide={false}
                    allDecals={
                      data?.tasks
                        ?.filter((t) => t.orderId === previewTask.orderId)
                        .map((t) => ({
                          targetSide: (t.placementSide || "front").toLowerCase(),
                          artworkUrl: t.printFileUrl || t.mockupPreviewUrl || t.rawAssetUrl || t.order.items?.[0]?.snapshotImageUrl,
                          printWidthCm: t.printWidthCm,
                          printHeightCm: t.printHeightCm,
                          offsetFromCollarCm: t.offsetFromCollarCm,
                        })) || []
                    }
                  />
                )}

                {/* File Master Preview */}
                {previewModeTab === "master" && (
                  <div className="rounded-2xl border border-border-subtle overflow-hidden bg-black/10 dark:bg-black/40 min-h-[420px] relative flex flex-col items-center justify-center p-6 text-center">
                    {previewTask.printFileUrl || previewTask.mockupPreviewUrl || previewTask.order.items?.[0]?.snapshotImageUrl ? (
                      <img
                        src={previewTask.printFileUrl || previewTask.mockupPreviewUrl || previewTask.order.items?.[0]?.snapshotImageUrl || ""}
                        alt="File Master DTF"
                        className="max-h-[340px] max-w-full object-contain drop-shadow-lg"
                      />
                    ) : (
                      <div className="text-center p-6 text-text-muted font-mono text-xs">
                        <Package size={40} className="mx-auto mb-2 opacity-40" />
                        <span>File master belum diunggah untuk order ini</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between w-full pt-3 border-t border-border-subtle font-mono text-[11px] text-text-muted">
                      <span>{previewTask.placementSide === "BACK" ? "Sisi Punggung Belakang" : "Sisi Dada Depan"}</span>
                      <span className="font-bold text-brand-accent">
                        Maksimal Lebar 30.0 cm
                      </span>
                    </div>
                  </div>
                )}

                {/* File Master Download & Attachment */}
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
                    Belum ada file cetak master terlampir.
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

              {/* Right Column: Stage-Adaptive Panel */}
              {(() => {
                const apparelSlug = guessApparelSlug(previewTask.order.items?.[0]?.snapshotName);
                const apparelLabel = guessApparelLabel(previewTask.order.items?.[0]?.snapshotName);
                const colorHex = guessColorHex(previewTask.order.items?.[0]?.snapshotColorName);
                const colorName = previewTask.order.items?.[0]?.snapshotColorName || "Hitam";
                const size = previewTask.order.items?.[0]?.snapshotSize || "L";
                const qty = previewTask.order.items?.reduce((a, it) => a + (it.quantity || 0), 0) || 1;
                const fabricDesc = guessFabricType(apparelSlug);

                const flatPlacement = computeFlatWorkshopPlacement({
                  apparelType: apparelSlug,
                  size,
                  targetSide: previewTask.placementSide,
                  printWidthCm: previewTask.printWidthCm,
                  printHeightCm: previewTask.printHeightCm,
                  offsetFromCollarCm: previewTask.offsetFromCollarCm,
                });

                // TAHAP 1: DESAIN MASUK (DESIGN_PREP)
                if (previewTask.stage === "DESIGN_PREP") {
                  return (
                    <div className="space-y-4 font-mono text-xs">
                      {/* Detail Spesifikasi Pesanan */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                          <span className="font-sans font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-1.5">
                            <Shirt size={14} className="text-brand-accent" />
                            <span>Spesifikasi Produk</span>
                          </span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-brand-accent/15 text-brand-accent border border-brand-accent/30 text-xs">
                            {qty} Pcs
                          </span>
                        </div>

                        <div className="space-y-2 text-[11px] text-text-muted">
                          <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                            <span>Jenis Apparel:</span>
                            <span className="font-bold text-text-primary text-xs">{apparelLabel}</span>
                          </div>
                          <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                            <span>Warna Kain:</span>
                            <span className="font-bold text-text-primary flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shrink-0 inline-block shadow-sm"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span>{colorName}</span>
                              <span className="font-mono text-[10px] text-text-muted">({colorHex})</span>
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                            <span>Ukuran (Size):</span>
                            <span className="font-bold text-brand-accent font-mono text-xs">Size {size}</span>
                          </div>
                          <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                            <span>Bahan Kain:</span>
                            <span className="font-medium text-text-primary text-right max-w-[220px] truncate">{fabricDesc}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Posisi Sablon:</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">
                              {previewTask.placementSide === "BACK" ? "Punggung Belakang" : "Dada Depan"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detail Pelanggan & Pengiriman */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5 text-[11px]">
                        <h4 className="font-sans font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <User size={13} className="text-brand-accent" />
                          <span>Informasi Pemesan & Pengiriman</span>
                        </h4>
                        <div className="space-y-1.5 text-text-muted border-t border-border-subtle pt-2">
                          <div className="flex justify-between">
                            <span>Pemesan:</span>
                            <span className="font-bold text-text-primary">{previewTask.order.user?.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>No. WhatsApp:</span>
                            {previewTask.order.user?.phoneNumber ? (
                              <a
                                href={`https://wa.me/${previewTask.order.user.phoneNumber.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                              >
                                <MessageCircle size={12} />
                                <span>{previewTask.order.user.phoneNumber}</span>
                              </a>
                            ) : (
                              <span className="text-text-muted font-mono">—</span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <span>Pengiriman:</span>
                            <span className="font-bold text-text-primary">{previewTask.order.deliveryMethod}</span>
                          </div>
                          {courierNotesOf(previewTask) && (
                            <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-[10px] text-text-muted">
                              Catatan: {courierNotesOf(previewTask)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gang Sheet Direct Link Card */}
                      <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex items-center justify-between">
                        <span className="font-sans font-bold text-xs text-text-primary flex items-center gap-1.5">
                          <Layers size={14} className="text-amber-500" />
                          <span>Penataan Gang Sheet DTF</span>
                        </span>
                        <a
                          href="/admin/gang-sheet"
                          className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
                        >
                          <span>Buka Gang Sheet</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                }

                // TAHAP 2: ANTREAN GANG SHEET (SCREEN_PRINT_SETUP)
                if (previewTask.stage === "SCREEN_PRINT_SETUP") {
                  return (
                    <div className="space-y-4 font-mono text-xs">
                      {/* Action Box Buka Modul Gang Sheet */}
                      <div className="p-4 rounded-2xl bg-surface border border-amber-500/40 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-bold text-sm text-text-primary flex items-center gap-2">
                            <Layers size={16} className="text-amber-500" />
                            <span>Modul Gang Sheet Roll DTF</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
                            LEBAR 58 CM
                          </span>
                        </div>
                        <a
                          href="/admin/gang-sheet"
                          className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-sans font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Layers size={14} />
                          <span>Buka Lembar Gang Sheet (100×58cm) →</span>
                        </a>
                      </div>

                      {/* Spesifikasi Film & Cetak */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
                        <h4 className="font-sans font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Printer size={13} className="text-brand-accent" />
                          <span>Estimasi Dimensi Film</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                            <span className="text-text-muted block text-[10px]">LEBAR CETAK:</span>
                            <span className="font-bold text-brand-accent text-sm">
                              {previewTask.printWidthCm ? `${previewTask.printWidthCm.toFixed(1)} cm` : "Standar A3 (28 cm)"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                            <span className="text-text-muted block text-[10px]">TINGGI CETAK:</span>
                            <span className="font-bold text-brand-accent text-sm">
                              {previewTask.printHeightCm ? `${previewTask.printHeightCm.toFixed(1)} cm` : "Proporsional"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ringkasan Singkat Pesanan */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Item:</span>
                          <span className="font-bold text-text-primary">{apparelLabel} ({colorName} - Size {size})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Jumlah:</span>
                          <span className="font-bold text-brand-accent">{qty} Pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Pemesan:</span>
                          <span className="font-bold text-text-primary">{previewTask.order.user?.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // TAHAP 3: SIAP SABLON & HEAT PRESS (PRINTING / PRESSING)
                if (previewTask.stage === "PRINTING" || previewTask.stage === "PRESSING") {
                  return (
                    <div className="space-y-4 font-mono text-xs">
                      {/* Card Kalibrasi Fisik Presisi Meja Datar */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
                        <h3 className="font-sans font-bold text-text-primary text-sm uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Ruler size={14} className="text-brand-accent" />
                            <span>Posisi Pemasangan Sablon (Meja Datar)</span>
                          </span>
                          <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 font-sans">
                            {flatPlacement.alignmentLabel}
                          </span>
                        </h3>

                        {/* Dimensi Cetak */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                            <span className="text-text-muted block text-[10px]">LEBAR CETAK:</span>
                            <span className="font-bold text-brand-accent text-sm">
                              {flatPlacement.printWidthCm.toFixed(1)} cm
                            </span>
                            <span className="text-[9px] text-text-muted block">
                              Maksimal 30.0 cm
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                            <span className="text-text-muted block text-[10px]">TINGGI CETAK:</span>
                            <span className="font-bold text-brand-accent text-sm">
                              {flatPlacement.printHeightCm.toFixed(1)} cm
                            </span>
                            <span className="text-[9px] text-text-muted block">Skala proporsional</span>
                          </div>
                        </div>

                        {/* Jarak Jahitan Samping Kiri & Kanan */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                            <span className="text-text-muted block text-[10px]">JAHITAN SAMPING KIRI:</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                              ← {flatPlacement.leftSeamMarginCm.toFixed(1)} cm
                            </span>
                            <span className="text-[9px] text-text-muted block">Tarik dari jahitan sisi</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                            <span className="text-text-muted block text-[10px]">JAHITAN SAMPING KANAN:</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                              {flatPlacement.rightSeamMarginCm.toFixed(1)} cm →
                            </span>
                            <span className="text-[9px] text-text-muted block">Tarik dari jahitan sisi</span>
                          </div>
                        </div>

                        {/* Jarak Kerah & Sisa Kelim Bawah */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30 space-y-0.5">
                            <span className="text-text-muted block text-[10px]">JARAK RIB KERAH:</span>
                            <p className="font-bold text-brand-accent text-sm">
                              ↓ {flatPlacement.offsetFromCollarCm.toFixed(1)} cm
                            </p>
                            <span className="text-[9px] text-text-muted block">±3 jari di bawah rib</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
                            <span className="text-text-muted block text-[10px]">SISA KELIM BAWAH:</span>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              ↑ {flatPlacement.bottomHemMarginCm.toFixed(1)} cm
                            </p>
                            <span className="text-[9px] text-text-muted block">Ruang bebas bawah</span>
                          </div>
                        </div>
                      </div>

                      {/* SOP Suhu & Tekanan Heat Press */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5 text-[11px]">
                        <h4 className="font-sans font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Flame size={13} className="text-amber-500" />
                          <span>SOP Pengepresan Panas (Heat Press)</span>
                        </h4>
                        <div className="space-y-1.5 text-text-muted border-t border-border-subtle pt-2">
                          <div className="flex justify-between">
                            <span>Suhu Mesin Press:</span>
                            <span className="font-bold text-text-primary">155°C – 160°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Waktu Press 1:</span>
                            <span className="font-bold text-text-primary">15 Detik (Tekanan Tinggi 4-5 Bar)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Proses Kupas Film:</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">Cold Peel (Tunggu Dingin Sempurna)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Press 2 (Finishing):</span>
                            <span className="font-bold text-text-primary">5 Detik dengan Kain Teflon</span>
                          </div>
                        </div>
                      </div>

                      {/* Spesifikasi Detail Pakaian */}
                      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Apparel:</span>
                          <span className="font-bold text-text-primary">{apparelLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Bahan:</span>
                          <span className="font-bold text-text-primary">{fabricDesc}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Warna & Ukuran:</span>
                          <span className="font-bold text-brand-accent">{colorName} · Size {size}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // TAHAP 4: QC & PACKING (QUALITY_CHECK / PACKAGING)
                return (
                  <div className="space-y-4 font-mono text-xs">
                    {/* Informasi Pengiriman & Penerima Lengkap */}
                    <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                        <span className="font-sans font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-1.5">
                          <User size={14} className="text-brand-accent" />
                          <span>Data Penerima & Kurir</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {previewTask.order.deliveryMethod}
                        </span>
                      </div>

                      <div className="space-y-2 text-[11px] text-text-muted">
                        <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                          <span>Nama Penerima:</span>
                          <span className="font-bold text-text-primary text-xs">{previewTask.order.user?.name}</span>
                        </div>
                        <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                          <span>No. WhatsApp:</span>
                          {previewTask.order.user?.phoneNumber ? (
                            <a
                              href={`https://wa.me/${previewTask.order.user.phoneNumber.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <MessageCircle size={12} />
                              <span>{previewTask.order.user.phoneNumber}</span>
                            </a>
                          ) : (
                            <span className="text-text-muted font-mono">—</span>
                          )}
                        </div>
                        <div className="flex justify-between border-b border-border-subtle pb-1.5 items-center">
                          <span>Item Pesanan:</span>
                          <span className="font-bold text-text-primary">{qty} Pcs {apparelLabel} ({colorName} - Size {size})</span>
                        </div>
                        {courierNotesOf(previewTask) && (
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-[11px] text-text-muted">
                            <span className="font-bold text-text-primary block mb-0.5">Catatan Pengiriman:</span>
                            {courierNotesOf(previewTask)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checklist QC Fisik */}
                    <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2.5 font-sans">
                      <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>Panduan Pemeriksaan Kualitas (QC)</span>
                      </h4>
                      <div className="space-y-2 text-xs text-text-muted pt-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Sablon rata, tidak berpori, dan tidak terkelupas saat diregangkan</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Warna cerah solid tanpa garis banding atau residu lem serbuk</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Ukuran dan warna kain 100% cocok dengan label pesanan</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Hangtag Kaos Kami dan silica gel telah dimasukkan ke polymailer</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`/admin/orders/${previewTask.orderId}`}
                  className="px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-primary font-mono text-xs font-bold hover:border-brand-accent transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Detail Pesanan</span>
                  <ExternalLink size={12} />
                </a>
                <a
                  href={`/admin/orders/${previewTask.orderId}/job-ticket`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-amber-500/50 text-text-primary font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Cetak slip kerja SPK fisik meja heat press"
                >
                  <Printer size={12} className="text-amber-500" />
                  <span>Cetak SPK</span>
                </a>
                <a
                  href="/admin/gang-sheet"
                  className="px-3.5 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-cyan-500/50 text-text-primary font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Buka Lembar Gang Sheet"
                >
                  <Layers size={12} className="text-cyan-500" />
                  <span>Gang Sheet</span>
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Stage Progression Action Buttons */}
                {previewTask.stage === "DESIGN_PREP" && (
                  <button
                    type="button"
                    onClick={() => {
                      moveTaskMutation.mutate({
                        taskId: previewTask.id,
                        stage: "SCREEN_PRINT_SETUP",
                        fromStage: previewTask.stage,
                      });
                      setPreviewTask(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>PROSES KE GANG SHEET →</span>
                  </button>
                )}

                {previewTask.stage === "SCREEN_PRINT_SETUP" && (
                  <button
                    type="button"
                    onClick={() => {
                      moveTaskMutation.mutate({
                        taskId: previewTask.id,
                        stage: "PRESSING",
                        fromStage: previewTask.stage,
                      });
                      setPreviewTask(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>SUDAH CETAK FILM (SIAP SABLON) →</span>
                  </button>
                )}

                {(previewTask.stage === "PRINTING" || previewTask.stage === "PRESSING") && (
                  <button
                    type="button"
                    onClick={() => {
                      moveTaskMutation.mutate({
                        taskId: previewTask.id,
                        stage: "PACKAGING",
                        fromStage: previewTask.stage,
                      });
                      setPreviewTask(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>SELESAI SABLON (KE PACKING) →</span>
                  </button>
                )}

                {(previewTask.stage === "QUALITY_CHECK" || previewTask.stage === "PACKAGING") && (
                  <button
                    type="button"
                    onClick={() => {
                      void completeOrderPackaging(previewTask.orderId, [previewTask.id]);
                      setPreviewTask(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 size={14} />
                    <span>SELESAI PACKING & SIAP KIRIM →</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="px-4 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-text-primary font-mono text-xs font-bold hover:bg-black/20 dark:hover:bg-white/20 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gang Sheet Roll (Tahap 2) */}
      {selectedGangRoll && (
        <GangSheetRollModal
          roll={selectedGangRoll}
          onClose={() => setSelectedGangRoll(null)}
          onPrintRoll={() => void advanceGangRollToPressing(selectedGangRoll.tasks)}
          isPrinting={isBatchPrinting}
        />
      )}

      {/* Modal Riwayat Log Aktivitas */}
      {showHistoryModal && <ActivityHistoryModal onClose={() => setShowHistoryModal(false)} />}
    </div>
  );
}

export const dynamic = 'force-dynamic';
