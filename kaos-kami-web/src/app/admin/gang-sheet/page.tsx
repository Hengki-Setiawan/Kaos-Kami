"use client";

// Halaman builder gang-sheet DTF (kolektor + review + ekspor + integrasi kanban).
// RBAC: ikut layout /admin (server gate ADMIN/SUPER_ADMIN/PRODUCTION_STAFF)
// Standar DTF Profesional: 100% Ukuran Asli Pesanan Dijaga, Tanpa Distorsi/Stretching, Multi-Tournament Strip Packing, 0 R2 Overhead.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  GANG_BIN_H_MM,
  GANG_BIN_W_MM,
  GANG_GAP_MM,
  GANG_MARGIN_MM,
  packGangSheet,
  type GangPackResult,
  type GangPlacement,
  type GangRect,
} from "@/lib/gangPacker";
import {
  exportGangSheetPNG,
  exportAllGangSheetsZip,
  downloadFile,
} from "@/lib/gangExport";
import {
  FileText,
  AlertCircle,
  Printer,
  Sparkles,
  Archive,
  Download,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Phone,
  ExternalLink,
  Search,
  RefreshCw,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Eye,
  X,
  Check,
  Layers,
  Sun,
  Moon,
  Grid,
  Package,
  PlusCircle,
  UploadCloud,
  ShoppingBag,
  Sliders,
  Image as ImageIcon,
  Shirt,
  FolderHeart,
  Plus,
  Minus,
  Info,
  Lock,
  Unlock,
  ArrowUpRight,
  Tag,
} from "lucide-react";

// ─── Tipe baris task (bentuk GET /api/admin/production-tasks) ───

interface OrderItemRingkas {
  id: string;
  quantity: number;
  snapshotName: string;
}

interface TaskRow {
  id: string;
  orderId: string;
  orderItemId: string;
  stage: string;
  printWidthCm: number | null;
  printHeightCm: number | null;
  printFileUrl: string | null;
  rawAssetUrl?: string | null;
  placementSide?: string | null;
  offsetFromCollarCm?: number | null;
  notes: string | null;
  order: {
    orderNumber: string;
    customerName?: string | null;
    customerPhone?: string | null;
    items: OrderItemRingkas[];
  } | null;
}

// ─── Helper kecil ───

function fmtCm(v: number | null): string {
  return v !== null && Number.isFinite(v) ? `${v.toFixed(1)}` : "—";
}

function fmtRp(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

function todayLocalYYYYMMDD(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function qtyDariItemInduk(t: TaskRow): number {
  const q = t.order?.items?.find((it) => it.id === t.orderItemId)?.quantity;
  return Number.isInteger(q) && (q as number) >= 1 ? (q as number) : 1;
}

function labelBaris(t: TaskRow): string {
  const snap = t.order?.items?.find((it) => it.id === t.orderItemId)?.snapshotName?.trim();
  if (snap) return snap;
  if (t.notes?.trim()) return t.notes.trim();
  return `Task ${t.id.slice(0, 8)}`;
}

function siapCetak(t: TaskRow): { ok: boolean; alasan: string } {
  if (!t.printFileUrl) return { ok: false, alasan: "belum ada file cetak" };
  if (
    t.printWidthCm === null ||
    t.printHeightCm === null ||
    !Number.isFinite(t.printWidthCm) ||
    !Number.isFinite(t.printHeightCm) ||
    t.printWidthCm <= 0 ||
    t.printHeightCm <= 0
  )
    return { ok: false, alasan: "dimensi cm belum valid" };
  return { ok: true, alasan: "siap" };
}

function cmToMm(cm: number): number {
  return Math.round(cm * 10);
}

// ─── Modal Pratinjau Desain HD ───

function ModalPratinjauDesain({
  task,
  onClose,
}: {
  task: TaskRow;
  onClose: () => void;
}) {
  const imgUrl = task.printFileUrl || task.rawAssetUrl;
  const orderNo = task.order?.orderNumber || "—";
  const itemLabel = labelBaris(task);
  const qty = qtyDariItemInduk(task);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-surface border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface-elevated">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-400/10 text-amber-500 flex items-center justify-center font-mono font-bold text-xs">
              HD
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
                <span>{orderNo}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-text-muted">
                  Qty: {qty}
                </span>
              </h3>
              <p className="text-xs text-text-muted truncate max-w-sm">{itemLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Gambar Preview */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-neutral-950/60 min-h-[280px]">
          {imgUrl ? (
            <div className="relative group max-w-full max-h-[360px] flex items-center justify-center p-2 rounded-xl border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={itemLabel}
                className="max-h-[340px] max-w-full object-contain rounded drop-shadow-md"
              />
            </div>
          ) : (
            <div className="text-center text-text-muted text-xs font-mono">
              Tidak ada berkas gambar untuk task ini
            </div>
          )}
        </div>

        {/* Spesifikasi Teknis DTF */}
        <div className="p-4 bg-surface border-t border-border-subtle grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle">
            <p className="text-[10px] font-mono uppercase text-text-muted">Ukuran Cetak Asli Pelanggan</p>
            <p className="font-bold text-text-primary font-mono text-sm mt-0.5">
              {fmtCm(task.printWidthCm)} × {fmtCm(task.printHeightCm)} cm
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              ✓ 100% Rasio Asli Terjaga
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle">
            <p className="text-[10px] font-mono uppercase text-text-muted">Posisi Sablon</p>
            <p className="font-bold text-text-primary capitalize text-sm mt-0.5">
              {task.placementSide === "back" ? "Punggung Belakang" : "Dada Depan"}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {task.offsetFromCollarCm ? `Turun ${task.offsetFromCollarCm} cm dari kerah` : "Posisi standar"}
            </p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-surface-elevated">
          {imgUrl ? (
            <a
              href={imgUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Buka Gambar Asli</span>
            </a>
          ) : <span />}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Impor Desain E-Commerce / File Bebas Tanpa Melalui Kanban ───

interface OrderItemApi {
  id: string;
  quantity: number;
  unitPriceIdr: number;
  snapshotName: string;
  snapshotImageUrl?: string | null;
  snapshotSize: string;
  snapshotColorName: string;
  designId?: string | null;
}

interface OrderApi {
  id: string;
  orderNumber: string;
  status: string;
  totalIdr: number;
  createdAt: string;
  user?: {
    name?: string | null;
    phoneNumber?: string | null;
  } | null;
  items: OrderItemApi[];
}

interface CatalogProductApi {
  id: string;
  name: string;
  slug?: string | null;
  apparelSlug?: string | null;
  basePriceIdr: number;
  images?: string[] | string | null;
  tags?: any;
  isActive?: boolean;
}

export interface OfflineVaultItem {
  id: string;
  title: string;
  customerName?: string;
  orderRef?: string;
  imageUrl: string;
  widthCm: number;
  heightCm: number;
  aspectRatio: number;
  placementSide: "front" | "back" | "sleeve";
  apparel?: string;
  createdAt: string;
}

interface SelectedDesignItem {
  id: string;
  source: "ecommerce" | "catalog" | "offline";
  title: string;
  subtitle: string;
  imageUrl: string | null;
  orderRef: string;
  customerName: string;
  customerPhone?: string | null;
  aspectRatio: number;
  placementSide: "front" | "back" | "sleeve";
}

const STORAGE_VAULT_KEY = "kaoskami_offline_print_vault";

function getOfflineVaultFromStorage(): OfflineVaultItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOfflineVaultToStorage(item: OfflineVaultItem) {
  if (typeof window === "undefined") return;
  try {
    const list = getOfflineVaultFromStorage();
    const updated = [item, ...list.filter((x) => x.id !== item.id)];
    localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("kaoskami_vault_updated"));
  } catch (e) {
    console.error("Gagal menyimpan ke offline vault:", e);
  }
}

function deleteOfflineVaultFromStorage(id: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getOfflineVaultFromStorage();
    const updated = list.filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("kaoskami_vault_updated"));
  } catch (e) {
    console.error("Gagal menghapus dari offline vault:", e);
  }
}

function extractCatalogImageUrl(product: CatalogProductApi): string | null {
  try {
    let tagsObj = product.tags;
    if (typeof tagsObj === "string") {
      try {
        tagsObj = JSON.parse(tagsObj);
      } catch {}
    }
    if (tagsObj?.frontDecalUrl) return tagsObj.frontDecalUrl;
    if (Array.isArray(tagsObj?.decals) && tagsObj.decals.length > 0 && tagsObj.decals[0]?.url) {
      return tagsObj.decals[0].url;
    }
    if (tagsObj?.backDecalUrl) return tagsObj.backDecalUrl;
  } catch {}

  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0] ?? null;
  }
  if (typeof product.images === "string") {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0] ?? null;
    } catch {}
    return product.images;
  }
  return null;
}

function ModalImporEcommerce({
  onClose,
  onImportItem,
}: {
  onClose: () => void;
  onImportItem: (task: TaskRow) => void;
}) {
  // 3 Sumber: E-Commerce, Katalog Distro, Offline Vault / Studio
  const [tabSumber, setTabSumber] = useState<"ecommerce" | "catalog" | "offline">("ecommerce");

  // 1. Data E-Commerce
  const [orders, setOrders] = useState<OrderApi[]>([]);
  const [memuatOrder, setMemuatOrder] = useState(true);
  const [galatOrder, setGalatOrder] = useState<string | null>(null);
  const [cariOrder, setCariOrder] = useState("");

  // 2. Data Katalog Distro
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductApi[]>([]);
  const [memuatCatalog, setMemuatCatalog] = useState(true);
  const [galatCatalog, setGalatCatalog] = useState<string | null>(null);
  const [cariCatalog, setCariCatalog] = useState("");

  // 3. Data Bank Desain Offline & Vault
  const [offlineVault, setOfflineVault] = useState<OfflineVaultItem[]>([]);
  const [cariVault, setCariVault] = useState("");
  const [modeUnggahOffline, setModeUnggahOffline] = useState(false);

  // Form Unggah Cepat Offline
  const [judulOffline, setJudulOffline] = useState("");
  const [namaPemesanOffline, setNamaPemesanOffline] = useState("");
  const [urlGambarOffline, setUrlGambarOffline] = useState("");

  // Selected item yang sedang di-inspeksi di kolom kanan
  const [itemTerpilih, setItemTerpilih] = useState<SelectedDesignItem | null>(null);

  // Form kustomisasi sablon di kolom kanan
  const [lebarCm, setLebarCm] = useState<number>(28.0);
  const [tinggiCm, setTinggiCm] = useState<number>(35.0);
  const [jumlahKopi, setJumlahKopi] = useState<number>(1);
  const [posisiSablon, setPosisiSablon] = useState<"front" | "back" | "sleeve">("front");
  const [isAspectLocked, setIsAspectLocked] = useState<boolean>(true);
  const [rasioAspek, setRasioAspek] = useState<number>(28.0 / 35.0);

  // Muat Pesanan E-Commerce
  useEffect(() => {
    let aktif = true;
    async function ambilOrder() {
      setMemuatOrder(true);
      setGalatOrder(null);
      try {
        const res = await fetch("/api/admin/orders?limit=50", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
        if (aktif) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (e: any) {
        if (aktif) setGalatOrder(e.message || "Gagal memuat daftar pesanan");
      } finally {
        if (aktif) setMemuatOrder(false);
      }
    }
    ambilOrder();
    return () => {
      aktif = false;
    };
  }, []);

  // Muat Katalog Distro
  useEffect(() => {
    let aktif = true;
    async function ambilCatalog() {
      setMemuatCatalog(true);
      setGalatCatalog(null);
      try {
        const res = await fetch("/api/admin/distro-catalog", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Server ${res.status}`);
        if (aktif) {
          setCatalogProducts(Array.isArray(data.products) ? data.products : []);
        }
      } catch (e: any) {
        if (aktif) setGalatCatalog(e.message || "Gagal memuat katalog distro");
      } finally {
        if (aktif) setMemuatCatalog(false);
      }
    }
    ambilCatalog();
    return () => {
      aktif = false;
    };
  }, []);

  // Muat Offline Vault dari LocalStorage & dengarkan update
  const sinkronVault = useCallback(() => {
    const list = getOfflineVaultFromStorage();
    setOfflineVault(list);
  }, []);

  useEffect(() => {
    sinkronVault();
    window.addEventListener("storage", sinkronVault);
    window.addEventListener("kaoskami_vault_updated", sinkronVault);
    return () => {
      window.removeEventListener("storage", sinkronVault);
      window.removeEventListener("kaoskami_vault_updated", sinkronVault);
    };
  }, [sinkronVault]);

  // Hitung rasio asli gambar saat item dipilih
  const setDanHitungRasioGambar = (imgUrl: string | null, fallbackW: number = 28.0, fallbackH: number = 35.0) => {
    if (!imgUrl) {
      setRasioAspek(fallbackW / fallbackH);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || 1000;
      const nh = img.naturalHeight || 1000;
      const ratio = nw / nh;
      setRasioAspek(ratio);
      if (isAspectLocked && ratio > 0) {
        const calcH = Math.max(2, Math.round((fallbackW / ratio) * 10) / 10);
        setTinggiCm(calcH);
      }
    };
    img.onerror = () => {
      setRasioAspek(fallbackW / fallbackH);
    };
    img.src = imgUrl;
  };

  // Pilih item dari E-Commerce
  const handlePilihEcommerce = (order: OrderApi, item: OrderItemApi) => {
    const ratio = 28.0 / 35.0;
    setItemTerpilih({
      id: `ecom-${item.id}`,
      source: "ecommerce",
      title: item.snapshotName,
      subtitle: `Ukuran: ${item.snapshotSize} · Warna: ${item.snapshotColorName}`,
      imageUrl: item.snapshotImageUrl || null,
      orderRef: order.orderNumber,
      customerName: order.user?.name || "Pelanggan E-Commerce",
      customerPhone: order.user?.phoneNumber || null,
      aspectRatio: ratio,
      placementSide: "front",
    });
    setLebarCm(28.0);
    setTinggiCm(35.0);
    setJumlahKopi(item.quantity || 1);
    setPosisiSablon("front");
    setDanHitungRasioGambar(item.snapshotImageUrl || null, 28.0, 35.0);
  };

  // Pilih item dari Katalog Distro
  const handlePilihCatalog = (product: CatalogProductApi) => {
    const imgUrl = extractCatalogImageUrl(product);
    const ratio = 28.0 / 35.0;
    setItemTerpilih({
      id: `cat-${product.id}`,
      source: "catalog",
      title: product.name,
      subtitle: `Katalog ${product.apparelSlug?.toUpperCase() || "DISTRO"} · Rp${(product.basePriceIdr || 0).toLocaleString("id-ID")}`,
      imageUrl: imgUrl,
      orderRef: `KATALOG-${product.slug || product.id.slice(0, 6).toUpperCase()}`,
      customerName: "Katalog Distro Kaos Kami",
      customerPhone: null,
      aspectRatio: ratio,
      placementSide: "front",
    });
    setLebarCm(28.0);
    setTinggiCm(35.0);
    setJumlahKopi(1);
    setPosisiSablon("front");
    setDanHitungRasioGambar(imgUrl, 28.0, 35.0);
  };

  // Pilih item dari Vault Offline
  const handlePilihVault = (v: OfflineVaultItem) => {
    setItemTerpilih({
      id: v.id,
      source: "offline",
      title: v.title,
      subtitle: v.customerName ? `Pelanggan: ${v.customerName}` : "Bank Desain Offline",
      imageUrl: v.imageUrl,
      orderRef: v.orderRef || "OFFLINE-VAULT",
      customerName: v.customerName || "Pelanggan Workshop",
      customerPhone: null,
      aspectRatio: v.aspectRatio || v.widthCm / v.heightCm,
      placementSide: v.placementSide || "front",
    });
    setLebarCm(v.widthCm || 28.0);
    setTinggiCm(v.heightCm || 35.0);
    setRasioAspek(v.aspectRatio || v.widthCm / v.heightCm);
    setJumlahKopi(1);
    setPosisiSablon(v.placementSide || "front");
  };

  // Input file lokal offline cepat dengan deteksi rasio otomatis
  const handlePilihFileOffline = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const dataUrl = reader.result;
        setUrlGambarOffline(dataUrl);
        const autoTitle = file.name.replace(/\.[^/.]+$/, "");
        if (!judulOffline) setJudulOffline(autoTitle);

        const img = new Image();
        img.onload = () => {
          const nw = img.naturalWidth || 1000;
          const nh = img.naturalHeight || 1000;
          const ratio = nw / nh;
          const defaultW = 28.0;
          const defaultH = Math.max(2, Math.round((defaultW / ratio) * 10) / 10);
          setRasioAspek(ratio);
          setLebarCm(defaultW);
          setTinggiCm(defaultH);
          setIsAspectLocked(true);

          setItemTerpilih({
            id: `quick-${Date.now().toString(36)}`,
            source: "offline",
            title: autoTitle,
            subtitle: "Berkas Unggahan Gambar Offline",
            imageUrl: dataUrl,
            orderRef: "OFFLINE-MANUAL",
            customerName: namaPemesanOffline.trim() || "Pelanggan Offline",
            customerPhone: null,
            aspectRatio: ratio,
            placementSide: "front",
          });
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // Ubah lebar dengan menjaga rasio aspek bila terkunci (Anti-Gepeng)
  const handleLebarChange = (val: number) => {
    const safeW = Math.min(30.0, Math.max(2, val));
    setLebarCm(safeW);
    if (isAspectLocked && rasioAspek > 0) {
      const calcH = Math.round((safeW / rasioAspek) * 10) / 10;
      setTinggiCm(Math.max(2, calcH));
    }
  };

  // Ubah tinggi dengan menjaga rasio aspek bila terkunci (Anti-Gepeng)
  const handleTinggiChange = (val: number) => {
    const safeH = Math.max(2, val);
    setTinggiCm(safeH);
    if (isAspectLocked && rasioAspek > 0) {
      const calcW = Math.min(30.0, Math.max(2, Math.round((safeH * rasioAspek) * 10) / 10));
      setLebarCm(calcW);
    }
  };

  const pilihPreset = (w: number, h: number) => {
    setLebarCm(w);
    if (isAspectLocked && rasioAspek > 0) {
      const calcH = Math.round((w / rasioAspek) * 10) / 10;
      setTinggiCm(Math.max(2, calcH));
    } else {
      setTinggiCm(h);
    }
  };

  // Simpan desain offline ke Bank Desain (Vault)
  const handleSimpanKeVaultOffline = () => {
    const imgUrl = itemTerpilih?.imageUrl || urlGambarOffline;
    if (!imgUrl) return;
    const title = itemTerpilih?.title || judulOffline || "Desain Offline";
    const cust = itemTerpilih?.customerName || namaPemesanOffline || "Pelanggan Workshop";
    const newItem: OfflineVaultItem = {
      id: `vault-${Date.now().toString(36)}`,
      title,
      customerName: cust,
      orderRef: "OFFLINE-VAULT",
      imageUrl: imgUrl,
      widthCm: lebarCm,
      heightCm: tinggiCm,
      aspectRatio: rasioAspek,
      placementSide: posisiSablon,
      createdAt: new Date().toISOString(),
    };
    saveOfflineVaultToStorage(newItem);
    sinkronVault();
    setModeUnggahOffline(false);
  };

  // Masukkan item terpilih ke Lembar Gang Sheet
  const handleSimpanKeGangSheet = () => {
    if (!itemTerpilih) return;
    const taskBaru: TaskRow = {
      id: `${itemTerpilih.source}-${itemTerpilih.id}-${Date.now().toString(36)}`,
      orderId: itemTerpilih.orderRef.toLowerCase().replace(/[^a-z0-9]/g, "-") || `offline-${Date.now()}`,
      orderItemId: `item-${Date.now().toString(36)}`,
      stage: "SCREEN_PRINT_SETUP", // Langsung masuk roll tanpa melalui Kanban!
      printWidthCm: Math.min(35.0, Math.max(2, lebarCm)), // DTF sablon clamp 35 cm (SSOT)
      printHeightCm: Math.max(2, tinggiCm),
      printFileUrl: itemTerpilih.imageUrl || null,
      rawAssetUrl: itemTerpilih.imageUrl || null,
      placementSide: posisiSablon,
      offsetFromCollarCm: posisiSablon === "back" ? 12 : 7.5,
      notes: `[${itemTerpilih.source.toUpperCase()}] ${itemTerpilih.title}`,
      order: {
        orderNumber: itemTerpilih.orderRef,
        customerName: itemTerpilih.customerName,
        customerPhone: itemTerpilih.customerPhone || null,
        items: [
          {
            id: `item-${Date.now().toString(36)}`,
            quantity: jumlahKopi,
            snapshotName: itemTerpilih.title,
          },
        ],
      },
    };

    // Bila ini item offline baru, otomatis simpan juga ke vault untuk organizer
    if (itemTerpilih.source === "offline" && !offlineVault.some((v) => v.id === itemTerpilih.id)) {
      handleSimpanKeVaultOffline();
    }

    onImportItem(taskBaru);
  };

  // Filter daftar pesanan
  const ordersTersaring = useMemo(() => {
    const q = cariOrder.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.user?.name && o.user.name.toLowerCase().includes(q)) ||
        o.items.some((it) => it.snapshotName.toLowerCase().includes(q))
    );
  }, [orders, cariOrder]);

  // Filter daftar katalog
  const catalogTersaring = useMemo(() => {
    const q = cariCatalog.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.apparelSlug && p.apparelSlug.toLowerCase().includes(q)) ||
        (p.slug && p.slug.toLowerCase().includes(q))
    );
  }, [catalogProducts, cariCatalog]);

  // Filter vault offline
  const vaultTersaring = useMemo(() => {
    const q = cariVault.trim().toLowerCase();
    if (!q) return offlineVault;
    return offlineVault.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (v.customerName && v.customerName.toLowerCase().includes(q)) ||
        (v.orderRef && v.orderRef.toLowerCase().includes(q))
    );
  }, [offlineVault, cariVault]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[720px] max-h-[92vh] rounded-3xl bg-surface border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-elevated shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-400/10 text-amber-500 border border-amber-400/20 flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <span>Impor Desain ke Lembar Gang Sheet</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  Bypass Kanban
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Susun cetak langsung dari pesanan e-commerce, etalase katalog distro, atau bank desain offline & Studio 3D
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3-Tab Segmented Controls */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-surface border-b border-border-subtle shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTabSumber("ecommerce")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              tabSumber === "ecommerce"
                ? "bg-amber-400 text-black shadow-sm font-black"
                : "bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
            }`}
          >
            <ShoppingBag size={14} />
            <span>1. Pesanan E-Commerce</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${tabSumber === "ecommerce" ? "bg-black/20 text-black font-black" : "bg-black/10 dark:bg-white/10 text-text-muted"}`}>
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabSumber("catalog")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              tabSumber === "catalog"
                ? "bg-amber-400 text-black shadow-sm font-black"
                : "bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
            }`}
          >
            <Tag size={14} />
            <span>2. Katalog Distro (Baju Jadi)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${tabSumber === "catalog" ? "bg-black/20 text-black font-black" : "bg-black/10 dark:bg-white/10 text-text-muted"}`}>
              {catalogProducts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabSumber("offline")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              tabSumber === "offline"
                ? "bg-amber-400 text-black shadow-sm font-black"
                : "bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle"
            }`}
          >
            <FolderHeart size={14} />
            <span>3. Bank Desain Offline & Studio 3D</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${tabSumber === "offline" ? "bg-black/20 text-black font-black" : "bg-black/10 dark:bg-white/10 text-text-muted"}`}>
              {offlineVault.length}
            </span>
          </button>
        </div>

        {/* Modal Main Body (2 Columns: Left Browser & Right Inspector) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border-subtle/70">
          {/* KOLOM KIRI: DAFTAR SUMBER DESAIN (md:col-span-7) */}
          <div className="md:col-span-7 h-full flex flex-col min-h-0 overflow-hidden bg-surface p-5 space-y-3">
            {/* ─── TAB 1: E-COMMERCE ─── */}
            {tabSumber === "ecommerce" && (
              <>
                <div className="relative shrink-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Cari order #, nama pembeli, atau judul desain kaos..."
                    value={cariOrder}
                    onChange={(e) => setCariOrder(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border-subtle bg-surface-elevated text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
                  {memuatOrder ? (
                    <div className="py-16 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-amber-500" />
                      <span>Memuat daftar pesanan e-commerce...</span>
                    </div>
                  ) : galatOrder ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold">
                      {galatOrder}
                    </div>
                  ) : ordersTersaring.length === 0 ? (
                    <div className="py-16 text-center text-text-muted text-xs">
                      Tidak ditemukan pesanan e-commerce yang cocok.
                    </div>
                  ) : (
                    ordersTersaring.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 rounded-2xl border border-border-subtle bg-surface-elevated space-y-2 hover:border-border transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-black text-amber-500 shrink-0">{order.orderNumber}</span>
                            <span className="text-xs font-semibold text-text-primary truncate">
                              {order.user?.name || "Pelanggan Toko"}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-text-muted shrink-0">
                            {order.status}
                          </span>
                        </div>

                        {/* Items list di dalam order */}
                        <div className="space-y-1.5 pt-1">
                          {order.items.map((item) => {
                            const dipilih = itemTerpilih?.id === `ecom-${item.id}`;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handlePilihEcommerce(order, item)}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                                  dipilih
                                    ? "bg-amber-400/15 border-amber-500 text-text-primary font-bold shadow-xs ring-1 ring-amber-500/30"
                                    : "bg-surface border-border-subtle hover:border-amber-400/50 text-text-secondary"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {item.snapshotImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.snapshotImageUrl}
                                      alt={item.snapshotName}
                                      className="h-10 w-10 object-contain rounded-lg bg-black/10 shrink-0 border border-border-subtle"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg bg-black/10 text-text-muted flex items-center justify-center text-[10px] shrink-0 font-bold border border-border-subtle">
                                      KAOS
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold truncate text-xs text-text-primary">
                                      {item.snapshotName}
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                      Ukuran: <span className="font-mono font-bold text-text-primary">{item.snapshotSize}</span> · Warna: {item.snapshotColorName} · Qty:{" "}
                                      <span className="font-mono font-bold text-amber-500">{item.quantity}</span>
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-xs font-mono font-bold shrink-0 ml-3 ${dipilih ? "text-amber-500" : "text-text-muted"}`}>
                                  {dipilih ? "✓ Terpilih" : "+ Pilih"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ─── TAB 2: KATALOG DISTRO ─── */}
            {tabSumber === "catalog" && (
              <>
                <div className="relative shrink-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Cari produk katalog distro, kaos, hoodie, crewneck..."
                    value={cariCatalog}
                    onChange={(e) => setCariCatalog(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border-subtle bg-surface-elevated text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {memuatCatalog ? (
                    <div className="py-16 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin text-amber-500" />
                      <span>Memuat katalog distro...</span>
                    </div>
                  ) : galatCatalog ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold">
                      {galatCatalog}
                    </div>
                  ) : catalogTersaring.length === 0 ? (
                    <div className="py-16 text-center text-text-muted text-xs">
                      Tidak ditemukan produk katalog distro yang cocok.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {catalogTersaring.map((product) => {
                        const imgUrl = extractCatalogImageUrl(product);
                        const dipilih = itemTerpilih?.id === `cat-${product.id}`;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handlePilihCatalog(product)}
                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              dipilih
                                ? "bg-amber-400/15 border-amber-500 shadow-sm ring-1 ring-amber-500/30"
                                : "bg-surface-elevated border-border-subtle hover:border-amber-400/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {imgUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imgUrl}
                                  alt={product.name}
                                  className="h-12 w-12 object-contain rounded-xl bg-neutral-900 shrink-0 border border-border-subtle"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-xl bg-black/10 flex items-center justify-center text-xs font-bold text-text-muted shrink-0 border border-border-subtle">
                                  <Shirt size={18} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-text-muted font-bold uppercase inline-block mb-1">
                                  {product.apparelSlug || "Apparel"}
                                </span>
                                <h5 className="font-bold text-xs text-text-primary truncate">
                                  {product.name}
                                </h5>
                                <p className="text-[11px] font-mono font-bold text-amber-500 mt-0.5">
                                  Rp{(product.basePriceIdr || 0).toLocaleString("id-ID")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-subtle/50 text-[11px]">
                              <span className="text-text-muted">Desain 3D Siap Cetak</span>
                              <span className={`font-mono font-bold ${dipilih ? "text-amber-500" : "text-text-muted"}`}>
                                {dipilih ? "✓ Dipilih" : "+ Pilih"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── TAB 3: BANK DESAIN OFFLINE & STUDIO 3D ─── */}
            {tabSumber === "offline" && (
              <>
                {/* Banner Akses Studio 3D */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <h5 className="text-xs font-black text-text-primary">Studio 3D Kustom Kaos & Apparel</h5>
                    </div>
                    <p className="text-[11px] text-text-muted truncate">
                      Tempel desain ke kaos/hoodie 3D, atur ukuran cm, lalu simpan ke bank desain ini
                    </p>
                  </div>
                  <a
                    href="/studio?mode=gangsheet"
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                  >
                    <span>Buka Studio 3D</span>
                    <ArrowUpRight size={13} />
                  </a>
                </div>

                {/* Sub-bar Pilihan: Bank Desain vs Unggah Cepat */}
                <div className="flex items-center justify-between shrink-0 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModeUnggahOffline(false)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !modeUnggahOffline
                          ? "bg-surface-elevated text-text-primary border border-amber-400/50 shadow-xs"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      Daftar Bank Desain ({offlineVault.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeUnggahOffline(true)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        modeUnggahOffline
                          ? "bg-surface-elevated text-text-primary border border-amber-400/50 shadow-xs"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <Plus size={13} />
                      <span>+ Unggah Desain Baru</span>
                    </button>
                  </div>

                  {!modeUnggahOffline && (
                    <div className="relative w-48">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Cari desain..."
                        value={cariVault}
                        onChange={(e) => setCariVault(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-border-subtle bg-surface-elevated text-[11px] text-text-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Body Tab Offline: Mode Unggah Cepat ATAU Daftar Vault */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {modeUnggahOffline ? (
                    <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3">
                      <div>
                        <label className="text-xs font-bold text-text-primary block mb-1">
                          Nama Desain / Sablon *
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Logo Kaos Futsal Reuni 2026"
                          value={judulOffline}
                          onChange={(e) => setJudulOffline(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-xs font-bold text-text-primary block mb-1">
                            Nama Pelanggan (Opsional)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Kak Wahyu"
                            value={namaPemesanOffline}
                            onChange={(e) => setNamaPemesanOffline(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-text-primary block mb-1">
                            Pilih Berkas Gambar (PNG Transparan)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePilihFileOffline}
                            className="w-full text-xs text-text-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-border-subtle file:bg-surface file:text-xs file:font-bold cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-text-muted block mb-1">
                          Atau Masukkan URL Gambar:
                        </label>
                        <input
                          type="url"
                          placeholder="https://.../gambar-sablon.png"
                          value={urlGambarOffline}
                          onChange={(e) => {
                            setUrlGambarOffline(e.target.value);
                            if (e.target.value) {
                              setDanHitungRasioGambar(e.target.value);
                              setItemTerpilih({
                                id: `quick-${Date.now().toString(36)}`,
                                source: "offline",
                                title: judulOffline || "Desain Offline URL",
                                subtitle: "Berkas URL Gambar",
                                imageUrl: e.target.value,
                                orderRef: "OFFLINE-URL",
                                customerName: namaPemesanOffline || "Pelanggan Offline",
                                customerPhone: null,
                                aspectRatio: rasioAspek,
                                placementSide: "front",
                              });
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-border-subtle bg-surface text-xs text-text-primary focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSimpanKeVaultOffline}
                          disabled={!urlGambarOffline}
                          className="py-2 px-3 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated disabled:opacity-40 text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <FolderHeart size={14} className="text-amber-500" />
                          <span>Simpan ke Bank Desain Saja</span>
                        </button>
                      </div>
                    </div>
                  ) : vaultTersaring.length === 0 ? (
                    <div className="py-16 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                      <FolderHeart size={28} className="text-text-muted/40" />
                      <p className="font-bold">Bank Desain Offline Masih Kosong</p>
                      <p className="text-[11px] max-w-xs">
                        Unggah gambar desain offline langsung di sini atau rancang di Studio 3D lalu klik simpan ke gang sheet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setModeUnggahOffline(true)}
                        className="mt-2 py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs cursor-pointer"
                      >
                        + Unggah Desain Baru Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {vaultTersaring.map((v) => {
                        const dipilih = itemTerpilih?.id === v.id;
                        return (
                          <div
                            key={v.id}
                            className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                              dipilih
                                ? "bg-amber-400/15 border-amber-500 shadow-sm ring-1 ring-amber-500/30"
                                : "bg-surface-elevated border-border-subtle hover:border-amber-400/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={v.imageUrl}
                                alt={v.title}
                                className="h-12 w-12 object-contain rounded-xl bg-neutral-900 shrink-0 border border-border-subtle"
                              />
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs text-text-primary truncate">
                                  {v.title}
                                </h5>
                                <p className="text-[11px] text-text-muted truncate mt-0.5">
                                  {v.customerName || "Pelanggan Offline"}
                                </p>
                                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-amber-500 font-bold mt-1 inline-block">
                                  {v.widthCm} × {v.heightCm} cm
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border-subtle/50 text-xs">
                              <button
                                type="button"
                                onClick={() => deleteOfflineVaultFromStorage(v.id)}
                                className="text-text-muted hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                                title="Hapus dari Bank Desain"
                              >
                                <Trash2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePilihVault(v)}
                                className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg cursor-pointer ${
                                  dipilih ? "bg-amber-400 text-black font-black" : "bg-surface border border-border-subtle text-text-primary hover:border-amber-400"
                                }`}
                              >
                                {dipilih ? "✓ Terpilih" : "+ Pilih"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* KOLOM KANAN: INSPEKTOR PENGATURAN CETAK DTF (md:col-span-5) */}
          <div className="md:col-span-5 h-full flex flex-col min-h-0 bg-surface-elevated/70 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-amber-500" />
                <h4 className="text-xs font-black uppercase text-text-primary tracking-wide">
                  Pengaturan Cetak DTF Presisi
                </h4>
              </div>
              {itemTerpilih && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-500 font-bold">
                  {itemTerpilih.source}
                </span>
              )}
            </div>

            {itemTerpilih ? (
              <div className="space-y-4 flex-1">
                {/* Kartu Ringkasan Item Terpilih */}
                <div className="p-3 rounded-2xl bg-surface border border-border-subtle flex items-center gap-3">
                  {itemTerpilih.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={itemTerpilih.imageUrl}
                      alt={itemTerpilih.title}
                      className="h-14 w-14 object-contain rounded-xl bg-neutral-900 shrink-0 border border-border-subtle"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-black/10 flex items-center justify-center text-xs font-bold text-text-muted shrink-0 border border-border-subtle">
                      No Image
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-black text-text-primary truncate">
                      {itemTerpilih.title}
                    </p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {itemTerpilih.subtitle}
                    </p>
                    <p className="text-[10px] font-mono text-amber-500 font-bold mt-0.5">
                      Ref: {itemTerpilih.orderRef}
                    </p>
                  </div>
                </div>

                {/* Preset Ukuran Standar Cepat */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-text-secondary">
                      Preset Ukuran Sablon:
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAspectLocked(!isAspectLocked)}
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        isAspectLocked
                          ? "bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30"
                          : "bg-black/5 dark:bg-white/5 text-text-muted border border-border-subtle"
                      }`}
                      title={isAspectLocked ? "Rasio Terkunci (Gambar Tidak Gepeng)" : "Rasio Bebas (Bisa Diubah Terpisah)"}
                    >
                      {isAspectLocked ? <Lock size={10} /> : <Unlock size={10} />}
                      <span>{isAspectLocked ? "Rasio 1:1 Terkunci" : "Rasio Bebas"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => pilihPreset(28.0, 35.0)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        lebarCm === 28.0
                          ? "bg-amber-400 text-black border-amber-500 font-black shadow-xs"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      A3 (28 × 35 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => pilihPreset(21.0, 29.7)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        lebarCm === 21.0
                          ? "bg-amber-400 text-black border-amber-500 font-black shadow-xs"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      A4 (21 × 29.7 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => pilihPreset(14.8, 21.0)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        lebarCm === 14.8
                          ? "bg-amber-400 text-black border-amber-500 font-black shadow-xs"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      A5 (14.8 × 21 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => pilihPreset(10.0, 10.0)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        lebarCm === 10.0
                          ? "bg-amber-400 text-black border-amber-500 font-black shadow-xs"
                          : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      Saku (10 × 10 cm)
                    </button>
                  </div>
                </div>

                {/* Input Dimensi Manual Presisi */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                      Lebar (cm) — Max 30
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="30"
                      value={lebarCm}
                      onChange={(e) => handleLebarChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                      Tinggi (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="100"
                      value={tinggiCm}
                      onChange={(e) => handleTinggiChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Jumlah Cetak (Qty Stepper) & Posisi Sablon */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                      Jumlah Cetak (Qty)
                    </label>
                    <div className="flex items-center rounded-xl border border-border-subtle bg-surface overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setJumlahKopi(Math.max(1, jumlahKopi - 1))}
                        className="px-2.5 py-2 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={jumlahKopi}
                        onChange={(e) => setJumlahKopi(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setJumlahKopi(jumlahKopi + 1)}
                        className="px-2.5 py-2 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                      Posisi Sablon
                    </label>
                    <select
                      value={posisiSablon}
                      onChange={(e) => setPosisiSablon(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-surface text-xs text-text-primary font-bold focus:outline-none"
                    >
                      <option value="front">Dada Depan</option>
                      <option value="back">Punggung</option>
                      <option value="sleeve">Lengan</option>
                    </select>
                  </div>
                </div>

                {/* Info Estimasi Roll Film */}
                <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-[11px] text-text-muted space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span>Estimasi Luas Cetak:</span>
                    <span className="font-bold text-text-primary">
                      {lebarCm.toFixed(1)} × {(tinggiCm * jumlahKopi).toFixed(1)} cm
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    ✓ DTF sablon clamp lebar maks 35.0 cm menjaga margin heatpress workshop Makassar
                  </p>
                </div>

                {/* Tombol Eksekusi Masukkan ke Gang Sheet */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSimpanKeGangSheet}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <PlusCircle size={16} />
                    <span>+ Masukkan ke Lembar Gang Sheet</span>
                  </button>

                  {itemTerpilih.source === "offline" && (
                    <button
                      type="button"
                      onClick={handleSimpanKeVaultOffline}
                      className="w-full py-2 px-3 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated text-text-primary font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderHeart size={14} className="text-amber-500" />
                      <span>Simpan ke Bank Desain Offline Saja</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* State Kosong Inspector dengan Panduan */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-text-muted">
                <div className="h-14 w-14 rounded-3xl bg-surface border border-border-subtle flex items-center justify-center text-amber-500 shadow-sm">
                  <Sliders size={24} />
                </div>
                <div>
                  <h5 className="font-black text-xs text-text-primary">Pilih Desain Terlebih Dahulu</h5>
                  <p className="text-[11px] text-text-muted mt-1 max-w-xs leading-relaxed">
                    Klik salah satu item dari tab Pesanan E-Commerce, Katalog Distro, atau Bank Desain Offline di sebelah kiri untuk mengatur dimensi cm dan memasukkannya ke roll gang sheet.
                  </p>
                </div>
                <div className="pt-3 w-full border-t border-border-subtle/50 space-y-1.5 text-[11px] font-mono text-left">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pesanan Aktif:</span>
                    <span className="font-bold text-text-primary">{orders.length} order</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Katalog Toko:</span>
                    <span className="font-bold text-text-primary">{catalogProducts.length} produk</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Bank Desain Vault:</span>
                    <span className="font-bold text-text-primary">{offlineVault.length} desain</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-surface-elevated shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Info size={14} className="text-amber-500 shrink-0" />
            <span>Desain yang diimpor langsung masuk ke antrean roll DTF tanpa perlu memindahkan kartu Kanban manual</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated text-text-primary font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Halaman Utama ───

export default function GangSheetBuilderPage() {
  // (1) KOLEKTOR & ANTREAN
  const [semuaTasks, setSemuaTasks] = useState<TaskRow[]>([]);
  const [tabAntrean, setTabAntrean] = useState<"antrean" | "masuk" | "sudah">("antrean");
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [centang, setCentang] = useState<Record<string, boolean>>({});
  const [hargaPerMeter, setHargaPerMeter] = useState(35000);
  const [draftPulih, setDraftPulih] = useState(false);
  const [taskPratinjau, setTaskPratinjau] = useState<TaskRow | null>(null);
  const [modalImporEcommerce, setModalImporEcommerce] = useState(false);
  const [mobileGangView, setMobileGangView] = useState<"queue" | "canvas">("canvas");

  // Parameter Packing Presisi & Celah (Murni Dimensi Asli Tanpa Pemangkasan)
  const [rollOrientation, setRollOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [gapMm, setGapMm] = useState<number>(3); // 3mm default rapat standar DTF profesional
  const [marginMm, setMarginMm] = useState<number>(5); // 5mm margin aman tepi roll

  // Undo hapus / reset
  const [undoHapus, setUndoHapus] = useState<{ bin: number; idx: number; item: GangPlacement } | null>(null);
  const [undoReset, setUndoReset] = useState<{ bin: number; snapshot: GangPlacement[] } | null>(null);

  // (2) HASIL SUSUN
  const [hasil, setHasil] = useState<GangPackResult | null>(null);
  const [binAktif, setBinAktif] = useState(0);
  const [kotakEdit, setKotakEdit] = useState<GangPlacement[][] | null>(null);

  // (3) REVIEW
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [bgPratinjau, setBgPratinjau] = useState<"dark" | "light" | "gray" | "checker">("dark");

  useEffect(() => {
    try {
      const savedBg = window.localStorage.getItem("kaoskami_gang_bg");
      if (savedBg === "dark" || savedBg === "light" || savedBg === "gray" || savedBg === "checker") {
        setBgPratinjau(savedBg as "dark" | "light" | "gray" | "checker");
      }
    } catch {}
  }, []);

  function handleBgChange(mode: "dark" | "light" | "gray" | "checker") {
    setBgPratinjau(mode);
    try {
      window.localStorage.setItem("kaoskami_gang_bg", mode);
    } catch {}
  }

  // Riwayat Undo / Redo untuk manipulasi kanvas (Geser / Putar / Hapus)
  const [riwayatSusun, setRiwayatSusun] = useState<GangPlacement[][][]>([]);
  const [indeksRiwayat, setIndeksRiwayat] = useState<number>(-1);
  const sebelumSeretRef = useRef<GangPlacement[][] | null>(null);

  const catatRiwayat = useCallback((snapshot: GangPlacement[][]) => {
    setRiwayatSusun((prev) => {
      const terpotong = prev.slice(0, indeksRiwayat + 1);
      const baru = [...terpotong, snapshot.map((b) => b.map((p) => ({ ...p })))];
      if (baru.length > 30) baru.shift();
      return baru;
    });
    setIndeksRiwayat((idx) => Math.min(idx + 1, 29));
  }, [indeksRiwayat]);

  const mundurSusun = useCallback(() => {
    if (indeksRiwayat > 0) {
      const targetIdx = indeksRiwayat - 1;
      const snapshot = riwayatSusun[targetIdx];
      if (snapshot) {
        setKotakEdit(snapshot.map((b) => b.map((p) => ({ ...p }))));
        setIndeksRiwayat(targetIdx);
        setTerpilih(null);
      }
    }
  }, [indeksRiwayat, riwayatSusun]);

  const majuSusun = useCallback(() => {
    if (indeksRiwayat < riwayatSusun.length - 1) {
      const targetIdx = indeksRiwayat + 1;
      const snapshot = riwayatSusun[targetIdx];
      if (snapshot) {
        setKotakEdit(snapshot.map((b) => b.map((p) => ({ ...p }))));
        setIndeksRiwayat(targetIdx);
        setTerpilih(null);
      }
    }
  }, [indeksRiwayat, riwayatSusun]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          majuSusun();
        } else {
          mundurSusun();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        majuSusun();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mundurSusun, majuSusun]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const seretRef = useRef<{
    idx: number;
    awalCX: number;
    awalCY: number;
    asalX: number;
    asalY: number;
    pxPerMm: number;
  } | null>(null);

  // (4) EKSPOR & KANBAN
  const [gangId, setGangId] = useState(() => `GANG-${todayLocalYYYYMMDD()}`);
  const [dpi, setDpi] = useState<150 | 300>(300);
  const [nomorMaklon, setNomorMaklon] = useState("");
  const [mengekspor, setMengekspor] = useState(false);
  const [mengeksporZip, setMengeksporZip] = useState(false);
  const [progressZip, setProgressZip] = useState<string | null>(null);
  const [memajukanKanban, setMemajukanKanban] = useState(false);
  const [galatEkspor, setGalatEkspor] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [peringatanEkspor, setPeringatanEkspor] = useState<string[]>([]);
  const [tampilCatatanKualitas, setTampilCatatanKualitas] = useState(false);
  const [disalin, setDisalin] = useState(false);
  const [meterDiekspor, setMeterDiekspor] = useState<number[]>([]);

  // Simpan & baca nomor WA maklon tunggal dari localStorage
  useEffect(() => {
    try {
      const savedWa = window.localStorage.getItem("kaoskami_maklon_wa");
      if (savedWa) setNomorMaklon(savedWa);
    } catch {}
  }, []);

  function handleWaChange(val: string) {
    setNomorMaklon(val);
    try {
      window.localStorage.setItem("kaoskami_maklon_wa", val);
    } catch {}
  }

  // ── Muat task ──
  const muatTask = useCallback(async () => {
    setMemuat(true);
    setGalatMuat(null);
    try {
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch("/api/admin/production-tasks", {
          signal: ctrl.signal,
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.error) {
          throw new Error(data?.error || `Server ${res.status}`);
        }
        const list = Array.isArray(data.tasks) ? (data.tasks as TaskRow[]) : [];
        setSemuaTasks(list.filter((x) => x && x.order));
      } finally {
        window.clearTimeout(t);
      }
    } catch (e) {
      setGalatMuat(e instanceof Error ? e.message : "Gagal memuat antrean produksi");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muatTask();
  }, [muatTask]);

  const handleImportItemKeGangSheet = useCallback((taskBaru: TaskRow) => {
    setSemuaTasks((prev) => [taskBaru, ...prev]);
    setCentang((prev) => ({ ...prev, [taskBaru.id]: true }));
    setPesanSukses(
      `✓ Berhasil memasukkan [${taskBaru.order?.orderNumber || "E-Commerce"}] ${labelBaris(taskBaru)} ke Antrean Roll DTF (Langsung Siap Disusun Tanpa Melalui Kanban)!`
    );
    setTabAntrean("antrean");
    setModalImporEcommerce(false);
  }, []);

  // Pisahkan task sesuai alur Kanban:
  // 1. Antrean Gang Sheet: SCREEN_PRINT_SETUP (desain yang sudah disetujui / diproses dari Kanban 1)
  const siapTasks = useMemo(
    () => semuaTasks.filter((t) => t.stage === "SCREEN_PRINT_SETUP"),
    [semuaTasks],
  );

  // 2. Desain Masuk di Kanban 1: DESIGN_PREP (belum diklik "Proses ke Gang Sheet")
  const desainMasukTasks = useMemo(
    () => semuaTasks.filter((t) => t.stage === "DESIGN_PREP"),
    [semuaTasks],
  );

  // 3. Sudah di Kanban 3 (PRINTING / PRESSING / QC / Selesai)
  const sudahTasks = useMemo(
    () => semuaTasks.filter((t) => t.stage !== "SCREEN_PRINT_SETUP" && t.stage !== "DESIGN_PREP"),
    [semuaTasks],
  );

  const taskDitampilkan = useMemo(() => {
    const dasar =
      tabAntrean === "antrean"
        ? siapTasks
        : tabAntrean === "masuk"
        ? desainMasukTasks
        : sudahTasks;
    const q = cari.trim().toLowerCase();
    if (!q) return dasar;
    return dasar.filter((t) => `${t.order?.orderNumber || ""} ${labelBaris(t)}`.toLowerCase().includes(q));
  }, [tabAntrean, siapTasks, desainMasukTasks, sudahTasks, cari]);

  // Aksi cepat memindahkan task dari Kanban 1 (DESIGN_PREP) ke Antrean Gang Sheet (SCREEN_PRINT_SETUP)
  async function masukkanKeAntreanGangSheet(ids: string[]) {
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taskIds: ids,
          stage: "SCREEN_PRINT_SETUP", // Masuk ke Antrean Gang Sheet
          notes: "Diproses masuk Antrean Gang Sheet",
          appendNotes: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Server ${res.status}`);
      setPesanSukses(`✓ Berhasil memasukkan ${ids.length} desain ke Antrean Gang Sheet!`);
      setTimeout(() => setPesanSukses(null), 3500);
      setTabAntrean("antrean");
      await muatTask();
    } catch (err) {
      setGalatMuat(`Gagal memindahkan ke antrean: ${err instanceof Error ? err.message : "koneksi bermasalah"}`);
    }
  }

  // ── DRAFT localStorage ──
  const DRAFT_KEY = "kaoskami_gang_draft_v4";
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.centang && typeof d.centang === "object") setCentang(d.centang);
      if (Array.isArray(d.kotakEdit) && d.kotakEdit.length > 0) {
        setKotakEdit(d.kotakEdit);
        setHasil((prev) =>
          prev ?? {
            bins: d.kotakEdit as GangPlacement[][],
            unplaced: [],
            utilizationPct: 0,
            binWmm: 580,
            binHmm: 1000,
            strategyName: "Draft Tersimpan",
          }
        );
      }
      if (Number.isInteger(d.binAktif)) setBinAktif(Math.max(0, d.binAktif));
      if (typeof d.gangId === "string" && d.gangId) setGangId(d.gangId);
      if (d.dpi === 150 || d.dpi === 300) setDpi(d.dpi);
      if (Number.isFinite(d.hargaPerMeter)) setHargaPerMeter(Math.max(0, Math.round(d.hargaPerMeter)));
      if (Number.isFinite(d.gapMm)) setGapMm(d.gapMm);
      setDraftPulih(true);
    } catch {}
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ centang, kotakEdit, binAktif, gangId, dpi, hargaPerMeter, gapMm }),
        );
      } catch {}
    }, 500);
    return () => window.clearTimeout(t);
  }, [centang, kotakEdit, binAktif, gangId, dpi, hargaPerMeter, gapMm]);

  // Filter yang terpilih dan valid untuk disusun
  const dipilihValid = useMemo(
    () => siapTasks.filter((t) => centang[t.id] && siapCetak(t).ok),
    [siapTasks, centang],
  );

  const totalKopiDiminta = useMemo(
    () => dipilihValid.reduce((s, t) => s + qtyDariItemInduk(t), 0),
    [dipilihValid],
  );

  // Helper pembaca aspek rasio alami gambar (menghapus letterbox kosong buatan)
  function dapatkanDimensiGambar(url: string): Promise<{ naturalW: number; naturalH: number } | null> {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ naturalW: img.naturalWidth, naturalH: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  // ── (2) AUTO-SUSUN DENGAN UKURAN 100% ASLI & ALGORITMA MULTI-TOURNAMENT ──
  const [galatSusun, setGalatSusun] = useState<string | null>(null);

  async function susunOtomatis() {
    setGalatSusun(null);
    if (dipilihValid.length === 0) return;

    try {
      // 1. Baca aspek rasio alami gambar agar kavling cetak tepat mengikuti batas fisik karya seni (tanpa letterbox kosong)
      const urlUnik = Array.from(new Set(dipilihValid.map((t) => t.printFileUrl).filter(Boolean))) as string[];
      const dimPairs = await Promise.all(
        urlUnik.map(async (u) => {
          const dim = await dapatkanDimensiGambar(u);
          return [u, dim] as const;
        })
      );
      const dimMap = new Map<string, { naturalW: number; naturalH: number } | null>(dimPairs);

      // 2. Hitung dimensi kavling fisik sebenarnya (proporsional 1:1, tanpa ruang transparan palsu)
      const rects: GangRect[] = dipilihValid.map((t) => {
        let actW = cmToMm(t.printWidthCm as number);
        let actH = cmToMm(t.printHeightCm as number);

        const dim = t.printFileUrl ? dimMap.get(t.printFileUrl) : null;
        if (dim && dim.naturalW > 0 && dim.naturalH > 0) {
          const imgRatio = dim.naturalW / dim.naturalH;
          const boxRatio = actW / actH;
          if (imgRatio > boxRatio) {
            // Gambar lebih lebar: lebar maksimum tetap, tinggi disesuaikan proporsinya
            actH = Math.max(10, Math.round(actW / imgRatio));
          } else {
            // Gambar lebih tinggi: tinggi maksimum tetap, lebar disesuaikan proporsinya
            actW = Math.max(10, Math.round(actH * imgRatio));
          }
        }

        return {
          id: t.id,
          wMm: actW,
          hMm: actH,
          qty: qtyDariItemInduk(t),
          label: labelBaris(t),
          orderNumber: t.order?.orderNumber || "—",
          masterUrl: t.printFileUrl,
          allowRotation: true,
        };
      });

      const binW = rollOrientation === "vertical" ? 580 : 1000;
      const binH = rollOrientation === "vertical" ? 1000 : 580;

      const r = packGangSheet(rects, {
        binWmm: binW,
        binHmm: binH,
        gapMm: gapMm,
        marginMm: marginMm,
      });

      setHasil(r);
      const snapshot = r.bins.map((b) => b.map((p) => ({ ...p })));
      setKotakEdit(snapshot);
      setRiwayatSusun([snapshot]);
      setIndeksRiwayat(0);
      setBinAktif(0);
      setTerpilih(null);
      setMeterDiekspor([]);
      setPesanSukses(null);
      setUndoHapus(null);
      setUndoReset(null);
    } catch (e) {
      setGalatSusun(e instanceof Error ? e.message : "Gagal menyusun gang sheet");
    }
  }

  // ── Manipulasi Kanvas ──
  const isiBinAktif: GangPlacement[] = useMemo(
    () => (kotakEdit && kotakEdit[binAktif]) || [],
    [kotakEdit, binAktif],
  );

  const itemTerpilih: GangPlacement | null =
    terpilih !== null ? (isiBinAktif[terpilih] ?? null) : null;

  function perbaruiKotak(idx: number, patch: Partial<GangPlacement>) {
    setKotakEdit((prev) => {
      if (!prev) return prev;
      const cur = prev[binAktif];
      if (!cur || !cur[idx]) return prev;
      const next = prev.map((b) => [...b]);
      const nb: GangPlacement[] = [...cur];
      nb[idx] = { ...nb[idx], ...patch } as GangPlacement;
      next[binAktif] = nb;
      return next;
    });
  }

  function putarTerpilih() {
    if (!hasil || terpilih === null || !kotakEdit) return;
    const p = isiBinAktif[terpilih];
    if (!p) return;
    const w = p.hMm;
    const h = p.wMm;
    const x = Math.min(Math.max(0, p.xMm), Math.max(0, hasil.binWmm - w));
    const y = Math.min(Math.max(0, p.yMm), Math.max(0, hasil.binHmm - h));
    const next = kotakEdit.map((b, bi) =>
      bi === binAktif
        ? b.map((item, ii) =>
            ii === terpilih ? { ...item, wMm: w, hMm: h, xMm: x, yMm: y, rot: !item.rot } : item
          )
        : [...b]
    );
    setKotakEdit(next);
    catatRiwayat(next);
  }

  function hapusTerpilih() {
    if (terpilih === null || !kotakEdit) return;
    const korban = isiBinAktif[terpilih];
    if (!korban) return;
    setUndoHapus({ bin: binAktif, idx: terpilih, item: { ...korban } });
    const next = kotakEdit.map((b, bi) =>
      bi === binAktif ? b.filter((_, i) => i !== terpilih) : [...b]
    );
    setKotakEdit(next);
    catatRiwayat(next);
    setTerpilih(null);
  }

  function undoHapusTerakhir() {
    if (!undoHapus) return;
    const { bin, idx, item } = undoHapus;
    setUndoHapus(null);
    setKotakEdit((prev) => {
      if (!prev || !prev[bin]) return prev;
      const next = prev.map((b) => [...b]);
      const cur = [...next[bin]!];
      cur.splice(Math.min(idx, cur.length), 0, { ...item });
      next[bin] = cur;
      catatRiwayat(next);
      return next;
    });
    setBinAktif(bin);
  }

  function resetMeteranAktif() {
    if (!hasil || !kotakEdit) return;
    const curBin = kotakEdit[binAktif];
    if (!curBin || curBin.length === 0) return;

    // 1. Ambil semua task ID yang ada di meter ini untuk dikembalikan ke antrean
    const taskIdsDiMeter = Array.from(new Set(curBin.map((p) => p.id)));

    // Catat snapshot untuk undo
    setUndoReset({ bin: binAktif, snapshot: curBin.map((p) => ({ ...p })) });

    // 2. Kembalikan ke antrean (hapus centang dari task-task di meter ini)
    setCentang((prev) => {
      const next = { ...prev };
      for (const id of taskIdsDiMeter) {
        delete next[id];
      }
      return next;
    });

    // 3. Hapus meter ini dari kotakEdit
    const nextKotak = kotakEdit.filter((_, bi) => bi !== binAktif);
    const reindexedKotak = nextKotak.map((b, bi) =>
      b.map((p) => ({ ...p, bin: bi }))
    );

    if (reindexedKotak.length === 0) {
      setKotakEdit(null);
      setHasil(null);
      setBinAktif(0);
      catatRiwayat([]);
    } else {
      setKotakEdit(reindexedKotak);
      setHasil((prev) =>
        prev
          ? {
              ...prev,
              bins: reindexedKotak,
            }
          : null
      );
      setBinAktif((cur) => Math.max(0, Math.min(cur, reindexedKotak.length - 1)));
      catatRiwayat(reindexedKotak);
    }

    setTerpilih(null);
    setPesanSukses(
      `✓ Meter ${binAktif + 1} dihapus & ${taskIdsDiMeter.length} desain dikembalikan ke daftar antrean.`
    );
    setTimeout(() => setPesanSukses(null), 4000);
  }

  function resetSemuaMeteran() {
    if (!hasil && !kotakEdit) return;
    setCentang({});
    setKotakEdit(null);
    setHasil(null);
    setBinAktif(0);
    setTerpilih(null);
    catatRiwayat([]);
    setPesanSukses("✓ Seluruh meteran berhasil dihapus dan semua desain dikembalikan ke antrean.");
    setTimeout(() => setPesanSukses(null), 4000);
  }

  function undoResetMeteran() {
    if (!undoReset) return;
    const { bin, snapshot } = undoReset;
    setUndoReset(null);
    // Kembalikan centang untuk item yang di-undo
    setCentang((prev) => {
      const next = { ...prev };
      for (const p of snapshot) {
        next[p.id] = true;
      }
      return next;
    });
    setKotakEdit((prev) => {
      const cur = prev ? [...prev] : [];
      cur.splice(Math.min(bin, cur.length), 0, snapshot.map((p) => ({ ...p })));
      const reindexed = cur.map((b, bi) => b.map((p) => ({ ...p, bin: bi })));
      catatRiwayat(reindexed);
      return reindexed;
    });
    setBinAktif(bin);
  }

  // Pointer Drag di Kanvas
  function onKotakPointerDown(e: React.PointerEvent, idx: number) {
    const p = isiBinAktif[idx];
    const svg = svgRef.current;
    if (!p || !svg) return;
    e.stopPropagation();
    setTerpilih(idx);
    const rect = svg.getBoundingClientRect();
    const pxPerMm = rect.width / (hasil?.binWmm || GANG_BIN_W_MM);
    if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) return;
    seretRef.current = { idx, awalCX: e.clientX, awalCY: e.clientY, asalX: p.xMm, asalY: p.yMm, pxPerMm };
    if (kotakEdit) {
      sebelumSeretRef.current = kotakEdit.map((b) => b.map((item) => ({ ...item })));
    }
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onSvgPointerMove(e: React.PointerEvent) {
    const s = seretRef.current;
    if (!s || !hasil) return;
    const dxMm = Math.round((e.clientX - s.awalCX) / s.pxPerMm);
    const dyMm = Math.round((e.clientY - s.awalCY) / s.pxPerMm);
    const p = isiBinAktif[s.idx];
    if (!p) return;
    const x = Math.min(Math.max(0, s.asalX + dxMm), Math.max(0, hasil.binWmm - p.wMm));
    const y = Math.min(Math.max(0, s.asalY + dyMm), Math.max(0, hasil.binHmm - p.hMm));
    perbaruiKotak(s.idx, { xMm: x, yMm: y });
  }

  function akhiriSeret() {
    if (seretRef.current && sebelumSeretRef.current && kotakEdit) {
      const s = seretRef.current;
      const awal = sebelumSeretRef.current[binAktif]?.[s.idx];
      const akhir = kotakEdit[binAktif]?.[s.idx];
      if (awal && akhir && (awal.xMm !== akhir.xMm || awal.yMm !== akhir.yMm)) {
        catatRiwayat(kotakEdit);
      }
    }
    seretRef.current = null;
    sebelumSeretRef.current = null;
  }

  // ── (3) INTEGRASI KANBAN BAGIAN 2 (SCREEN_PRINT_SETUP) ──
  async function majukanKeKanban(taskIdsTarget?: string[]) {
    const ids = taskIdsTarget ?? Array.from(new Set(isiBinAktif.map((p) => p.id)));
    if (ids.length === 0) return;
    setMemajukanKanban(true);
    setGalatEkspor(null);
    try {
      const res = await fetch("/api/admin/production-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taskIds: ids,
          stage: "PRINTING", // Maju ke Pilar 3 Kanban: "3. Siap Sablon / Sedang Dicetak"
          notes: `Tersusun di Gang Sheet (${gangId})`,
          appendNotes: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Server ${res.status}`);

      setPesanSukses(`✓ Berhasil memajukan ${ids.length} task ke Kanban Pilar 3 (Siap Sablon / Sedang Dicetak)!`);
      // Bersihkan task yang berhasil dari centang
      setCentang((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      await muatTask();
    } catch (err) {
      setGalatEkspor(`Gagal memajukan ke Kanban: ${err instanceof Error ? err.message : "koneksi bermasalah"}`);
    } finally {
      setMemajukanKanban(false);
    }
  }

  // ── (4) EKSPOR PNG SATUAN + AUTO-DOWNLOAD TXT SPK ──
  async function eksporPng() {
    if (!hasil || isiBinAktif.length === 0 || mengekspor) return;
    setMengekspor(true);
    setGalatEkspor(null);
    setPesanSukses(null);
    try {
      const out = await exportGangSheetPNG({
        placements: isiBinAktif,
        binWmm: hasil.binWmm,
        binHmm: hasil.binHmm,
        dpi,
        cutLines: false,
        gangId: gangId.trim() || undefined,
        alphaTrim: false, // Murni ukuran asli
      });

      setPeringatanEkspor(out.warnings);

      // 1. Unduh PNG
      downloadFile(out.blob, out.filename, "image/png");

      // 2. Ekstrak otomatis berkas TXT SPK (tanpa mengotori UI)
      const txtFilename = out.filename.replace(/\.png$/i, "_SPK_REKAP.txt");
      downloadFile(out.recapText, txtFilename, "text/plain");

      const taskIdsInBin = Array.from(new Set(isiBinAktif.map((p) => p.id)));

      if (out.hasSkippedItem) {
        setPesanSukses(
          `Meter ${binAktif + 1} diekspor (${out.filename}), namun ada gambar yang terlewat.`,
        );
      } else {
        setMeterDiekspor((prev) => (prev.includes(binAktif) ? prev : [...prev, binAktif]));
        setPesanSukses(
          `✓ Meter ${binAktif + 1} berhasil diunduh (${out.filename}). Desain tetap di antrean hingga Anda menekan "Masuk ke Kanban (Siap Sablon)".`,
        );
      }
    } catch (e) {
      setGalatEkspor(e instanceof Error ? e.message : "Gagal mengekspor PNG");
    } finally {
      setMengekspor(false);
    }
  }

  // ── (5) EKSPOR SEMUA METER (ZIP LOSSLESS LENGKAP) ──
  async function eksporSemuaZip() {
    if (!kotakEdit || kotakEdit.length === 0 || mengeksporZip) return;
    setMengeksporZip(true);
    setProgressZip("Memulai perenderan paket maklon...");
    setGalatEkspor(null);
    setPesanSukses(null);
    try {
      const binW = rollOrientation === "vertical" ? 580 : 1000;
      const binH = rollOrientation === "vertical" ? 1000 : 580;

      const res = await exportAllGangSheetsZip({
        bins: kotakEdit,
        binWmm: binW,
        binHmm: binH,
        dpi,
        cutLines: false,
        gangId,
        alphaTrim: false, // Murni ukuran asli
        onProgress: (_m, _total, msg) => setProgressZip(msg),
      });

      setPeringatanEkspor(res.warnings);

      // 1. Unduh ZIP
      downloadFile(res.zipBlob, res.filename, "application/zip");

      // 2. Beri tanda meter sudah diekspor tanpa memajukan Kanban otomatis
      setMeterDiekspor(Array.from({ length: res.meterCount }, (_, i) => i));

      setPesanSukses(
        `✓ Paket Maklon Berhasil Diunduh (${res.meterCount} Meter, ${res.totalDesain} Desain) dalam format ZIP 300 DPI! Desain tetap di antrean hingga Anda menekan "Masuk ke Kanban (Siap Sablon)".`,
      );
    } catch (err) {
      setGalatEkspor(`Gagal mengekspor ZIP: ${err instanceof Error ? err.message : "Terjadi kesalahan perenderan"}`);
    } finally {
      setMengeksporZip(false);
      setProgressZip(null);
    }
  }

  // ── Rekap Ringkas WhatsApp ──
  const utilLive = useMemo(() => {
    if (!hasil || isiBinAktif.length === 0) return 0;
    const luasIsi = isiBinAktif.reduce((acc, p) => acc + p.wMm * p.hMm, 0);
    const luasBin = (hasil.binWmm || 580) * (hasil.binHmm || 1000);
    return Math.min(100, (luasIsi / luasBin) * 100);
  }, [hasil, isiBinAktif]);

  const rekapRingkas = useMemo(() => {
    if (!hasil || isiBinAktif.length === 0) return "";
    const list = isiBinAktif
      .map((p, i) => `${i + 1}. [${p.orderNumber}] ${p.label} - ${(p.wMm / 10).toFixed(1)}x${(p.hMm / 10).toFixed(1)}cm`)
      .join("\n");
    return `Halo Tim Maklon Cetak,\nBerikut SPK Gang Sheet ${gangId} (Meter ${binAktif + 1} dari ${hasil.bins.length}):\n- Ukuran Roll: ${hasil.binWmm / 10} × ${hasil.binHmm / 10} cm\n- Total Desain: ${isiBinAktif.length} pcs\n- Utilisasi: ${utilLive.toFixed(1)}%\n\nRincian Item:\n${list}\n\nMohon diproses dengan resolusi 300 DPI. Terima kasih!`;
  }, [hasil, isiBinAktif, gangId, binAktif, utilLive]);

  async function salinRekap() {
    if (!rekapRingkas) return;
    try {
      await navigator.clipboard.writeText(rekapRingkas);
      setDisalin(true);
      window.setTimeout(() => setDisalin(false), 2000);
    } catch {}
  }

  const binCount = hasil?.bins.length || 0;
  const totalBiaya = binCount * hargaPerMeter;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Modal Pratinjau Desain HD */}
      {taskPratinjau && (
        <ModalPratinjauDesain
          task={taskPratinjau}
          onClose={() => setTaskPratinjau(null)}
        />
      )}

      {/* ── HEADER HALAMAN ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
              PRODUKSI WORKSHOP
            </span>
            <span className="text-xs text-text-muted font-mono">Kota Makassar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-1 flex items-center gap-2">
            <Layers className="text-amber-500" size={24} />
            <span>Gang Sheet DTF Maklon</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Strip Packing Presisi · 100% Ukuran & Rasio Asli Pelanggan Terjaga · Integrasi Kanban Pilar 2
          </p>
        </div>

        {/* Action Header: Kembali ke Kanban Produksi */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/production"
            className="px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={14} />
            <span>Kanban Produksi</span>
          </Link>
          <button
            onClick={() => void muatTask()}
            disabled={memuat}
            className="p-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs transition-all disabled:opacity-50"
            title="Segarkan antrean"
          >
            <RefreshCw size={14} className={memuat ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Pesan Sukses / Galat Global */}
      {pesanSukses && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-500 shrink-0" />
            <span>{pesanSukses}</span>
            {undoReset && (
              <button
                onClick={undoResetMeteran}
                className="ml-2 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                Batalkan Hapus (Undo)
              </button>
            )}
          </div>
          <button onClick={() => setPesanSukses(null)} className="text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>
      )}
      {galatEkspor && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between">
          <span>{galatEkspor}</span>
          <button onClick={() => setGalatEkspor(null)} className="text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MOBILE VIEW SWITCHER (Khusus Layar HP < lg) ── */}
      <div className="flex lg:hidden p-1 rounded-2xl bg-surface border border-border-subtle shadow-xs">
        <button
          type="button"
          onClick={() => setMobileGangView("queue")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileGangView === "queue"
              ? "bg-amber-500 text-black shadow-xs font-black"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Package size={14} />
          <span>Antrean Desain ({siapTasks.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileGangView("canvas")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileGangView === "canvas"
              ? "bg-amber-500 text-black shadow-xs font-black"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Layers size={14} />
          <span>Pratinjau Roll & Ekspor</span>
        </button>
      </div>

      {/* ── GRID UTAMA: 2 KOLOM SEIMBANG (KIRI: TASK & ANTREAN, KANAN: ROLL PREVIEW) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── KOLOM KIRI (5 / 12): ANTREAN & SELEKSI DESAIN ── */}
        <div className={`${mobileGangView === "queue" ? "block" : "hidden lg:block"} lg:col-span-5 space-y-4`}>
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 space-y-4 shadow-sm">
            {/* Tombol Impor Desain E-Commerce / Berkas Bebas Tanpa Kanban */}
            <button
              type="button"
              onClick={() => setModalImporEcommerce(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/15 transition-all cursor-pointer"
            >
              <Package size={15} />
              <span>+ Impor Desain E-Commerce / Berkas Bebas (Tanpa Kanban)</span>
            </button>

            {/* Tab Antrean: Antrean Gang Sheet vs Desain Masuk (Kanban 1) vs Sudah Sablon */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
              <button
                type="button"
                onClick={() => setTabAntrean("antrean")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tabAntrean === "antrean"
                    ? "bg-amber-400 text-black shadow-sm font-black"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>Antrean Roll</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                  {siapTasks.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTabAntrean("masuk")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tabAntrean === "masuk"
                    ? "bg-blue-600 text-white shadow-sm font-black"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>Kanban 1</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                  {desainMasukTasks.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTabAntrean("sudah")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tabAntrean === "sudah"
                    ? "bg-surface text-text-primary shadow-sm border border-border-subtle font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>Sudah Sablon</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                  {sudahTasks.length}
                </span>
              </button>
            </div>

            {/* Banner Khusus Tab Desain Masuk (Kanban 1) */}
            {tabAntrean === "masuk" && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <FileText size={14} className="shrink-0 text-blue-500" />
                    <span>Desain Masuk (Kanban Pilar 1)</span>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                    {desainMasukTasks.length} Belum Masuk Roll
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Pesanan di sini belum masuk antrean gang sheet. Klik tombol di bawah untuk memasukkan semua ke antrean gang sheet atau pilih per baris.
                </p>
                {desainMasukTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void masukkanKeAntreanGangSheet(desainMasukTasks.map((t) => t.id))}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Layers size={14} />
                    <span>+ Masukkan Semua ({desainMasukTasks.length}) ke Antrean Gang Sheet</span>
                  </button>
                )}
              </div>
            )}

            {/* Pencarian & Tombol Pilih Semua */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari order atau nama desain..."
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border-subtle bg-surface text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {tabAntrean === "antrean" && (
                <button
                  type="button"
                  onClick={() => {
                    const allChecked = siapTasks.every((t) => centang[t.id]);
                    const next: Record<string, boolean> = {};
                    if (!allChecked) {
                      for (const t of siapTasks) {
                        if (siapCetak(t).ok) next[t.id] = true;
                      }
                    }
                    setCentang(next);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-xs font-bold text-text-primary hover:bg-black/10 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {siapTasks.every((t) => centang[t.id]) ? "Lepas Semua" : "Pilih Semua"}
                </button>
              )}
            </div>

            {/* Pengaturan Jarak Item & Margin Tepi (Space Optimization) - Khusus Tab Antrean */}
            {tabAntrean === "antrean" && (
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text-primary">
                    Optimasi Ruang Roll Film (58 cm)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    Ukuran Asli 100% Terjaga
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <div className="flex justify-between text-text-muted mb-1">
                      <span>Jarak Item (Gap):</span>
                      <strong className="text-text-primary font-mono">{gapMm} mm</strong>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={8}
                      step={1}
                      value={gapMm}
                      onChange={(e) => setGapMm(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-text-muted mb-1">
                      <span>Margin Tepi:</span>
                      <strong className="text-text-primary font-mono">{marginMm} mm</strong>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      step={1}
                      value={marginMm}
                      onChange={(e) => setMarginMm(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Antrean */}
            <div className="max-h-[460px] overflow-y-auto rounded-xl border border-border-subtle">
              {taskDitampilkan.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted font-sans px-4">
                  {memuat
                    ? "Memuat antrean..."
                    : tabAntrean === "antrean"
                    ? "Belum ada desain di Antrean Gang Sheet. Silakan klik tab 'Kanban 1' untuk memasukkan desain baru."
                    : tabAntrean === "masuk"
                    ? "Tidak ada pesanan baru di Kanban 1 (semua sudah dimasukkan ke antrean roll)."
                    : "Belum ada task di tahap sablon / selesai."}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-surface-elevated text-text-muted font-mono uppercase text-[10px] sticky top-0 border-b border-border-subtle z-10">
                    <tr>
                      {tabAntrean === "antrean" && <th className="p-2 w-8 text-center">Pilih</th>}
                      <th className="p-2 text-left">Desain & Order</th>
                      <th className="p-2 text-center">Ukuran Asli</th>
                      <th className="p-2 w-12 text-center">Qty</th>
                      <th className="p-2 text-center">
                        {tabAntrean === "masuk" ? "Aksi" : tabAntrean === "antrean" ? "Status" : "Detail"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {taskDitampilkan.map((t) => {
                      const st = siapCetak(t);
                      const orderNo = t.order?.orderNumber || "—";
                      const isChecked = !!centang[t.id];
                      const qty = qtyDariItemInduk(t);
                      // Cek apakah item sedang berada di salah satu meteran roll
                      const meterIndex = kotakEdit?.findIndex((bin) => bin.some((p) => p.id === t.id));
                      const diMeter = meterIndex !== undefined && meterIndex !== -1 ? meterIndex + 1 : null;

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                            isChecked ? "bg-amber-400/5" : ""
                          }`}
                        >
                          {tabAntrean === "antrean" && (
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!st.ok}
                                onChange={(e) =>
                                  setCentang((prev) => ({ ...prev, [t.id]: e.target.checked }))
                                }
                                className="h-3.5 w-3.5 accent-amber-400 rounded cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {/* Thumbnail interaktif dengan ikon mata hover */}
                              <div
                                onClick={() => setTaskPratinjau(t)}
                                className="relative h-8 w-8 rounded bg-black/10 shrink-0 border border-border-subtle overflow-hidden cursor-pointer group"
                                title="Klik untuk pratinjau gambar HD"
                              >
                                {t.printFileUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={t.printFileUrl}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[8px] text-text-muted">
                                    N/A
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye size={12} />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setTaskPratinjau(t)}
                                  className="font-bold text-text-primary truncate block text-left hover:underline"
                                >
                                  {orderNo}
                                </button>
                                <p className="text-[10px] text-text-muted truncate">{labelBaris(t)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono whitespace-nowrap text-[11px]">
                            {fmtCm(t.printWidthCm)}×{fmtCm(t.printHeightCm)}
                          </td>
                          {/* Qty Terkunci sesuai Order Pelanggan */}
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono font-bold text-xs text-text-primary">
                              {qty}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {tabAntrean === "masuk" ? (
                              <button
                                type="button"
                                onClick={() => void masukkanKeAntreanGangSheet([t.id])}
                                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all whitespace-nowrap mx-auto cursor-pointer"
                                title="Masukkan desain pesanan ini ke Antrean Gang Sheet"
                              >
                                <Layers size={11} />
                                <span>+ Masukkan</span>
                              </button>
                            ) : tabAntrean === "antrean" ? (
                              diMeter ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/20 whitespace-nowrap">
                                  Meter {diMeter}
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold whitespace-nowrap">
                                  Siap Susun
                                </span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTaskPratinjau(t)}
                                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
                                title="Lihat Pratinjau Desain"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Tombol Utama Auto-Susun (Hanya tampil di Tab Antrean Roll) */}
            {tabAntrean === "antrean" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={susunOtomatis}
                  disabled={dipilihValid.length === 0}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>
                    Auto-Susun ({dipilihValid.length} Desain · {totalKopiDiminta} Kopi)
                  </span>
                </button>
                {galatSusun && (
                  <p className="text-xs text-red-500 font-mono mt-1 text-center">{galatSusun}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── KOLOM KANAN (7 / 12): PRATINJAU ROLL & EKSPOR MAKLON ── */}
        <div className={`${mobileGangView === "canvas" ? "block" : "hidden lg:block"} lg:col-span-7 space-y-4`}>
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 space-y-4 shadow-sm">
            {/* Header Pratinjau & Tab Lembar Meteran */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                  <Printer size={16} className="text-emerald-500" />
                  <span>Hasil Susunan Roll</span>
                </h2>
                {hasil && (
                  <div className="flex gap-1">
                    {hasil.bins.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setBinAktif(i);
                          setTerpilih(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          binAktif === i
                            ? "bg-amber-400 text-black shadow-sm font-black"
                            : meterDiekspor.includes(i)
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                            : "bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {meterDiekspor.includes(i) ? `[OK] Meter ${i + 1}` : `Meter ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kontrol Kanvas (Zoom, Undo/Redo, & Background Pratinjau) */}
              {hasil && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector Warna Background Pratinjau (Gelap / Terang / Abu-abu / Transparan) */}
                  <div className="flex items-center p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleBgChange("dark")}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        bgPratinjau === "dark"
                          ? "bg-neutral-800 text-white shadow-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Latar Gelap (standar inspeksi desain putih/terang)"
                    >
                      <Moon size={12} />
                      <span>Gelap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBgChange("light")}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        bgPratinjau === "light"
                          ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Latar Terang (inspeksi desain hitam pekat / sablon gelap)"
                    >
                      <Sun size={12} />
                      <span>Terang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBgChange("gray")}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        bgPratinjau === "gray"
                          ? "bg-zinc-500 text-white shadow-sm font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Latar Abu-Abu Netral (standar RIP DTF: cek tinta putih & hitam sekaligus)"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-400" />
                      <span>Abu-abu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBgChange("checker")}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                        bgPratinjau === "checker"
                          ? "bg-amber-400 text-black shadow-sm font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Latar Transparan Catur (inspeksi batas alpha/transparansi)"
                    >
                      <Grid size={12} />
                      <span>Transparan</span>
                    </button>
                  </div>

                  {/* Kontrol Zoom Kanvas */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                      className="p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary"
                      title="Perkecil Kanvas"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="text-[11px] font-mono text-text-muted w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
                      className="p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary"
                      title="Perbesar Kanvas"
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>

                  {/* Tombol Undo & Redo (Mundur & Maju) */}
                  <div className="flex items-center gap-1 border-l border-border-subtle pl-2">
                    <button
                      type="button"
                      onClick={mundurSusun}
                      disabled={indeksRiwayat <= 0}
                      className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold transition-all"
                      title="Undo / Mundur (Ctrl+Z)"
                    >
                      <Undo2 size={13} />
                      <span className="hidden sm:inline">Mundur</span>
                    </button>
                    <button
                      type="button"
                      onClick={majuSusun}
                      disabled={indeksRiwayat >= riwayatSusun.length - 1}
                      className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold transition-all"
                      title="Redo / Maju (Ctrl+Y atau Ctrl+Shift+Z)"
                    >
                      <Redo2 size={13} />
                      <span className="hidden sm:inline">Maju</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetMeteranAktif}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1 text-[11px] font-bold transition-all ml-1 shadow-sm cursor-pointer"
                      title={`Hapus lembar Meter ${binAktif + 1} dan kembalikan semua desainnya ke daftar antrean`}
                    >
                      <Trash2 size={13} />
                      <span>Hapus Meter {binAktif + 1}</span>
                    </button>
                    {kotakEdit && kotakEdit.length > 1 && (
                      <button
                        type="button"
                        onClick={resetSemuaMeteran}
                        className="px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-text-muted hover:text-red-600 dark:hover:text-red-400 border border-border-subtle flex items-center gap-1 text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
                        title="Kosongkan seluruh meteran roll dan kembalikan semua desain ke daftar antrean"
                      >
                        <RotateCcw size={13} />
                        <span>Kosongkan Semua</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Metrik Utilisasi & Estimasi */}
            {hasil ? (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                  <p className="text-[10px] font-mono uppercase text-text-muted">Utilisasi Roll</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {utilLive.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">{isiBinAktif.length} kopi di meter ini</p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                  <p className="text-[10px] font-mono uppercase text-text-muted">Estimasi Biaya</p>
                  <p className="text-lg font-black text-text-primary">{fmtRp(totalBiaya)}</p>
                  <p className="text-[10px] text-text-muted font-mono">
                    {binCount} meter × {fmtRp(hargaPerMeter)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                  <p className="text-[10px] font-mono uppercase text-text-muted">Strategi Penyusunan</p>
                  <p className="text-xs font-bold text-text-primary truncate mt-1">
                    {hasil.strategyName || "Multi-Tournament 16x"}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    100% Ukuran Asli Terjaga
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-text-muted">
                Pilih desain di sebelah kiri lalu klik &ldquo;Auto-Susun&rdquo; untuk melihat pratinjau lembar film roll.
              </div>
            )}

            {/* ── KANVAS SVG PRATINJAU ROLL FILM (MURNI DESAIN TANPA FRAME / DISTORSI) ── */}
            {hasil && kotakEdit && (
              <div className="space-y-2">
                <div
                  className={`w-full overflow-auto max-h-[520px] rounded-2xl border border-border-subtle p-4 flex justify-center transition-colors ${
                    bgPratinjau === "light"
                      ? "bg-slate-200/90"
                      : bgPratinjau === "gray"
                      ? "bg-zinc-800/90"
                      : bgPratinjau === "checker"
                      ? "bg-neutral-900/80"
                      : "bg-neutral-900/60"
                  }`}
                >
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${hasil.binWmm} ${hasil.binHmm}`}
                    style={{
                      width: `${(hasil.binWmm / 2.5) * zoom}px`,
                      height: `${(hasil.binHmm / 2.5) * zoom}px`,
                      maxWidth: "none",
                    }}
                    onPointerMove={onSvgPointerMove}
                    onPointerUp={akhiriSeret}
                    className="select-none touch-none shadow-2xl rounded-lg"
                  >
                    <defs>
                      {/* Pola catur transparan khas software grafis untuk inspeksi alpha/transparansi */}
                      <pattern id="dtf-film-checker" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="10" height="10" fill="#f1f5f9" />
                        <rect x="10" width="10" height="10" fill="#cbd5e1" />
                        <rect y="10" width="10" height="10" fill="#cbd5e1" />
                        <rect x="10" y="10" width="10" height="10" fill="#f1f5f9" />
                      </pattern>
                    </defs>

                    {/* Background PET Film Transparan / Meja DTF (Hitam / Putih / Abu-abu / Catur Transparan) */}
                    <rect
                      x={0}
                      y={0}
                      width={hasil.binWmm}
                      height={hasil.binHmm}
                      fill={
                        bgPratinjau === "light"
                          ? "#ffffff"
                          : bgPratinjau === "gray"
                          ? "#71717a"
                          : bgPratinjau === "checker"
                          ? "url(#dtf-film-checker)"
                          : "#18181b"
                      }
                      stroke={bgPratinjau === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}
                      strokeWidth={1.5}
                      rx={2}
                    />

                    {/* Render Desain User (100% Ukuran Asli, Bebas Distorsi, Murni Tanpa Frame / Garis Potong) */}
                    {isiBinAktif.map((p, idx) => {
                      const isSelected = terpilih === idx;

                      return (
                        <g
                          key={`${p.id}-${p.copyIndex}-${idx}`}
                          onPointerDown={(e) => onKotakPointerDown(e, idx)}
                          className="cursor-move group"
                        >
                          {/* Gambar Murni Desain Pelanggan - Aspek Rasio Terkunci Sempurna */}
                          {p.masterUrl ? (
                            p.rot ? (
                              <g
                                transform={`translate(${p.xMm + p.wMm}, ${p.yMm}) rotate(90)`}
                              >
                                <image
                                  href={p.masterUrl}
                                  x={0}
                                  y={0}
                                  width={p.hMm}
                                  height={p.wMm}
                                  preserveAspectRatio="xMidYMid meet"
                                />
                              </g>
                            ) : (
                              <image
                                href={p.masterUrl}
                                x={p.xMm}
                                y={p.yMm}
                                width={p.wMm}
                                height={p.hMm}
                                preserveAspectRatio="xMidYMid meet"
                              />
                            )
                          ) : (
                            <rect
                              x={p.xMm}
                              y={p.yMm}
                              width={p.wMm}
                              height={p.hMm}
                              fill={bgPratinjau === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"}
                            />
                          )}

                          {/* Seleksi Emas / Handle HANYA Muncul Saat Item Dipilih */}
                          {isSelected && (
                            <g>
                              <rect
                                x={p.xMm}
                                y={p.yMm}
                                width={p.wMm}
                                height={p.hMm}
                                fill="rgba(245, 158, 11, 0.1)"
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                                strokeDasharray="4 2"
                              />
                              {/* 4 Titik Handle Sudut */}
                              <rect x={p.xMm - 2} y={p.yMm - 2} width={4} height={4} fill="#f59e0b" />
                              <rect x={p.xMm + p.wMm - 2} y={p.yMm - 2} width={4} height={4} fill="#f59e0b" />
                              <rect x={p.xMm - 2} y={p.yMm + p.hMm - 2} width={4} height={4} fill="#f59e0b" />
                              <rect x={p.xMm + p.wMm - 2} y={p.yMm + p.hMm - 2} width={4} height={4} fill="#f59e0b" />
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Toolbar Interaksi Kotak Terpilih */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-xs">
                  <div className="flex items-center gap-1.5">
                    {itemTerpilih ? (
                      <span className="font-mono text-text-primary">
                        Terpilih: <strong>{itemTerpilih.orderNumber}</strong> ({fmtCm(itemTerpilih.wMm / 10)}×{fmtCm(itemTerpilih.hMm / 10)} cm)
                      </span>
                    ) : (
                      <span className="text-text-muted">Klik desain pada kanvas untuk menggeser posisi atau memutar 90°</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={putarTerpilih}
                      disabled={!itemTerpilih}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary disabled:opacity-40 font-bold flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Putar 90°</span>
                    </button>
                    <button
                      onClick={hapusTerpilih}
                      disabled={!itemTerpilih}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-red-500/30 text-red-600 dark:text-red-400 disabled:opacity-40 font-bold flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Hapus</span>
                    </button>
                    {undoHapus && (
                      <button
                        onClick={undoHapusTerakhir}
                        className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <Undo2 size={12} />
                        <span>Undo Hapus</span>
                      </button>
                    )}
                    {undoReset && (
                      <button
                        onClick={undoResetMeteran}
                        className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1"
                        title="Batalkan reset dan pulihkan posisi sebelum direset"
                      >
                        <Undo2 size={12} />
                        <span>Undo Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PANEL EKSPOR & INTEGRASI KANBAN ── */}
            {hasil && (
              <div className="pt-2 border-t border-border-subtle space-y-3">
                {/* Opsi Ekspor & Nomor WhatsApp Maklon Tunggal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-text-muted block mb-1">
                      No. WhatsApp Vendor Maklon DTF:
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Contoh: 081234567890"
                        value={nomorMaklon}
                        onChange={(e) => handleWaChange(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border-subtle bg-surface text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-text-muted block mb-1">
                      Kode Batch SPK:
                    </label>
                    <input
                      type="text"
                      value={gangId}
                      onChange={(e) => setGangId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border-subtle bg-surface text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Toolbar Tombol Ekspor Lengkap */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* 1. Ekspor Semua (ZIP) */}
                  <button
                    onClick={() => void eksporSemuaZip()}
                    disabled={mengeksporZip || !kotakEdit || kotakEdit.length === 0}
                    className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Archive size={14} className={mengeksporZip ? "animate-spin" : ""} />
                    <span>{mengeksporZip ? "Mengemas ZIP..." : `Ekspor Semua (${kotakEdit?.length || 1} Mtr ZIP)`}</span>
                  </button>

                  {/* 2. Ekspor Meter Ini (PNG + TXT) */}
                  <button
                    onClick={() => void eksporPng()}
                    disabled={mengekspor || isiBinAktif.length === 0}
                    className="py-2.5 px-3 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated disabled:opacity-40 text-text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download size={14} className={mengekspor ? "animate-spin" : ""} />
                    <span>{mengekspor ? "Menyimpan PNG..." : `Ekspor Meter ${binAktif + 1} (PNG+TXT)`}</span>
                  </button>

                  {/* 3. Tombol Mandiri Majukan ke Kanban Pilar 3 (Siap Sablon) */}
                  <button
                    type="button"
                    onClick={() => void majukanKeKanban()}
                    disabled={memajukanKanban || isiBinAktif.length === 0}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title={`Majukan ${isiBinAktif.length} desain di Meter ${binAktif + 1} ke Kanban Pilar 3 (Siap Sablon / Sedang Dicetak)`}
                  >
                    <CheckCircle2 size={14} className={memajukanKanban ? "animate-spin" : ""} />
                    <span>{memajukanKanban ? "Memproses..." : "Masuk ke Kanban (Siap Sablon)"}</span>
                  </button>
                </div>

                {/* Sub-bar Salin WhatsApp SPK */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Format Rekap:</span>
                    <span className="font-mono font-bold text-text-primary">
                      SPK {gangId} · Meter {binAktif + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {nomorMaklon.trim() && (
                      <a
                        href={`https://wa.me/${nomorMaklon.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          rekapRingkas,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Phone size={11} />
                        <span>Buka WA Vendor</span>
                      </a>
                    )}
                    <button
                      onClick={() => void salinRekap()}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary hover:bg-surface-elevated font-bold flex items-center gap-1 text-[11px]"
                    >
                      {disalin ? <Check size={11} className="text-emerald-500" /> : <FileText size={11} />}
                      <span>{disalin ? "Tersalin!" : "Salin Rekap WA"}</span>
                    </button>
                  </div>
                </div>

                {/* Accordion Catatan Kualitas Ekspor */}
                {peringatanEkspor.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs space-y-1">
                    <button
                      onClick={() => setTampilCatatanKualitas(!tampilCatatanKualitas)}
                      className="w-full flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        <span>Catatan Kualitas Ekspor ({peringatanEkspor.length})</span>
                      </span>
                      {tampilCatatanKualitas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {tampilCatatanKualitas && (
                      <ul className="list-disc list-inside text-[11px] text-text-muted space-y-0.5 pt-1">
                        {peringatanEkspor.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Impor Desain E-Commerce / File Bebas */}
      {modalImporEcommerce && (
        <ModalImporEcommerce
          onClose={() => setModalImporEcommerce(false)}
          onImportItem={handleImportItemKeGangSheet}
        />
      )}
    </div>
  );
}
