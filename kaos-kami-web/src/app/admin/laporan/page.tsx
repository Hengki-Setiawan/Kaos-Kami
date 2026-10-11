"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { maskPhone as maskPhoneLib } from "@/lib/mask";
import {
  AlertCircle,
  Lock,
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  Layers,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Package,
  Users,
  ChevronRight,
  DollarSign,
  Receipt,
  CheckCircle2,
  Info,
} from "lucide-react";

type Range = "today" | "7d" | "30d";
type TabSection = "financial" | "production" | "inventory";

interface ClosingDay {
  date: string;
  gross: number | null;
  refundTotal: number | null;
  discountTotal: number | null;
  net: number | null;
  orders: number;
}

interface DailyRow {
  date: string;
  gross: number | null;
  orders: number;
}

interface WorkloadRow {
  userId: string | null;
  name: string;
  phoneMasked: string;
  active: number;
  express: number;
  overdue: number;
}

interface ForecastRow {
  variantId: string;
  name: string;
  size: string;
  colorName: string;
  qty: number;
  burnPerWeek: number | null;
  weeksLeft: number | null;
  suggestOrder: number | null;
}

interface ReportData {
  success: boolean;
  range: string;
  gross: number | null;
  refundTotal: number | null;
  net: number | null;
  discountTotal: number | null;
  discountSource: string;
  counts: { orders: number; cancelled: number; refunded: number; completed: number };
  avgTurnaroundHours: number | null;
  avgTurnaroundMeta: { sample: number; source: string };
  defectRate: { total: number; lolos: number; perDefect: Record<string, number> };
  defectSource: string;
  defectUnparsed: number;
  overdueExpress: number;
  overdueSource: string;
  workload: WorkloadRow[];
  workloadSource: string;
  stockForecast: ForecastRow[];
  stockSource: string;
  channels?: {
    customStudio: { gross: number; orders: number };
    catalogEcommerce: { gross: number; orders: number };
  };
  payments?: {
    ipaymuQris: { gross: number; orders: number };
    otherMethods: { gross: number; orders: number };
  };
  daily: DailyRow[];
  closing: { today: ClosingDay; yesterday: ClosingDay };
}

function fmtRp(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `Rp ${v.toLocaleString("id-ID")}`;
}

function fmtNum(v: number | null, suffix = ""): string {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("id-ID")}${suffix}`;
}

function maskPhone(p?: string | null): string {
  if (!p) return "—";
  if (p.includes("****")) return p;
  return maskPhoneLib(p) || "—";
}

function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function buildReportCsv(r: ReportData): string {
  const lines: string[] = [];
  lines.push(csvCell("LAPORAN OPERASIONAL WORKSHOP KAOS KAMI MAKASSAR"));
  lines.push(csvCell(`Periode: ${r.range} | Diunduh: ${new Date().toISOString().slice(0, 10)}`));
  lines.push("");
  lines.push(["Metrik", "Nilai (Rp / Qty)"].map(csvCell).join(","));
  lines.push([csvCell("Omset Kotor (Gross)"), r.gross ?? "—"].join(","));
  lines.push([csvCell("Total Refund"), r.refundTotal ?? "—"].join(","));
  lines.push([csvCell("Total Diskon Kupon"), r.discountTotal ?? "—"].join(","));
  lines.push([csvCell("Omset Bersih (Net)"), r.net ?? "—"].join(","));
  lines.push([csvCell("Pesanan Selesai"), r.counts.completed].join(","));
  lines.push([csvCell("Pesanan Dibatalkan"), r.counts.cancelled].join(","));
  lines.push([csvCell("Pesanan Refund"), r.counts.refunded].join(","));
  lines.push([csvCell("Rata-rata Waktu Produksi (Jam)"), r.avgTurnaroundHours ?? "—"].join(","));
  lines.push("");
  lines.push(["Tanggal", "Omset Kotor", "Jumlah Order"].map(csvCell).join(","));
  for (const d of r.daily) {
    lines.push([csvCell(d.date), d.gross ?? "—", d.orders].join(","));
  }
  lines.push("");
  lines.push(["Operator Produksi", "Kontak", "Task Aktif", "Express", "Overdue"].map(csvCell).join(","));
  for (const w of r.workload) {
    lines.push([csvCell(w.name), csvCell(maskPhone(w.phoneMasked)), w.active, w.express, w.overdue].join(","));
  }
  lines.push("");
  lines.push(["Varian Bahan", "Ukuran", "Sisa Stok", "Pakai / Minggu", "Estimasi Sisa (Minggu)", "Saran Restock"].map(csvCell).join(","));
  for (const f of r.stockForecast) {
    lines.push([
      csvCell(`${f.name} (${f.colorName})`),
      csvCell(f.size),
      f.qty,
      f.burnPerWeek ?? "—",
      f.weeksLeft ?? "—",
      f.suggestOrder ?? "—",
    ].join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

function buildReportExcelXml(r: ReportData): string {
  const sanitize = (text: string | number | null) => {
    if (text === null || text === undefined) return "—";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="Rp\\ #,##0"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:Size="14" ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Ringkasan Finansial">
  <Table>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">LAPORAN WORKSHOP KAOS KAMI MAKASSAR</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Periode: ${sanitize(r.range)} | Tanggal: ${new Date().toISOString().slice(0, 10)}</Data></Cell></Row>
   <Row></Row>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Indikator Kinerja</Data></Cell>
    <Cell><Data ss:Type="String">Nilai</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String">Omset Kotor (Gross)</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${r.gross ?? 0}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Refund</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${r.refundTotal ?? 0}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Diskon Promosi</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${r.discountTotal ?? 0}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Omset Bersih (Net)</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${r.net ?? 0}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Pesanan Selesai</Data></Cell><Cell><Data ss:Type="Number">${r.counts.completed}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Pesanan Dibatalkan</Data></Cell><Cell><Data ss:Type="Number">${r.counts.cancelled}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Rata-rata Waktu Produksi (Jam)</Data></Cell><Cell><Data ss:Type="String">${sanitize(r.avgTurnaroundHours)}</Data></Cell></Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Tren Harian">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Tanggal</Data></Cell>
    <Cell><Data ss:Type="String">Omset Kotor</Data></Cell>
    <Cell><Data ss:Type="String">Jumlah Order</Data></Cell>
   </Row>
   ${r.daily.map((d) => `
   <Row>
    <Cell><Data ss:Type="String">${sanitize(d.date)}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${d.gross ?? 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${d.orders}</Data></Cell>
   </Row>`).join("")}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Forecast Stok Bahan">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Varian</Data></Cell>
    <Cell><Data ss:Type="String">Ukuran</Data></Cell>
    <Cell><Data ss:Type="String">Sisa Stok</Data></Cell>
    <Cell><Data ss:Type="String">Burn / Minggu</Data></Cell>
    <Cell><Data ss:Type="String">Estimasi Minggu</Data></Cell>
    <Cell><Data ss:Type="String">Saran Restock</Data></Cell>
   </Row>
   ${r.stockForecast.map((f) => `
   <Row>
    <Cell><Data ss:Type="String">${sanitize(`${f.name} (${f.colorName})`)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(f.size)}</Data></Cell>
    <Cell><Data ss:Type="Number">${f.qty}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(f.burnPerWeek)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(f.weeksLeft)}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(f.suggestOrder)}</Data></Cell>
   </Row>`).join("")}
  </Table>
 </Worksheet>
</Workbook>`;
  return xml;
}

function ClosingCard({
  title,
  day,
  accent,
}: {
  title: string;
  day: ClosingDay;
  accent: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border space-y-2.5 ${
        accent
          ? "bg-brand-accent/5 border-brand-accent/30"
          : "bg-surface border-border-subtle"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-text-muted">
          {title}
        </span>
        <span className="font-mono text-[11px] text-text-muted">{day.date}</span>
      </div>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Penjualan Kotor</span>
          <span className="font-semibold text-text-primary">{fmtRp(day.gross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Refund</span>
          <span className="font-semibold text-text-primary">{fmtRp(day.refundTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Potongan Kupon</span>
          <span className="font-semibold text-text-primary">{fmtRp(day.discountTotal)}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-border-subtle">
          <span className="font-bold text-text-primary">Uang Bersih Kasir</span>
          <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
            {fmtRp(day.net)}
          </span>
        </div>
        <span className="block text-[10px] text-text-muted pt-0.5">
          {day.orders} pesanan tercatat
        </span>
      </div>
    </div>
  );
}

export default function AdminLaporanPage() {
  const [range, setRange] = useState<Range>("7d");
  const [activeTab, setActiveTab] = useState<TabSection>("financial");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?range=${r}`);
      const body = (await res.json().catch(() => null)) as ReportData | null;
      if (!res.ok || !body?.success) {
        throw new Error(
          (body as unknown as { error?: string })?.error || `Server ${res.status}`,
        );
      }
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat laporan.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const maxDailyGross = useMemo(() => {
    if (!data) return 0;
    return data.daily.reduce((m, d) => Math.max(m, d.gross ?? 0), 0);
  }, [data]);

  const lowStockCount = useMemo(() => {
    if (!data?.stockForecast) return 0;
    return data.stockForecast.filter((f) => (f.suggestOrder ?? 0) > 0).length;
  }, [data]);

  const exportCsv = useCallback(() => {
    if (!data) return;
    const blob = new Blob([buildReportCsv(data)], {
      type: "text/csv; charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-workshop-kaos-kami-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data]);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const xml = buildReportExcelXml(data);
    const blob = new Blob([xml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-workshop-kaos-kami-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* HEADER SECTION (Print Hidden Elements) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle print:border-none">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp size={15} />
            <span>Dashboard Penjualan &amp; Produksi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary uppercase">
            Grafik &amp; Kinerja Workshop
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            Pantau uang masuk, tren penjualan harian, status sablon, dan sisa stok kaos secara visual &amp; ringkas.
          </p>
        </div>

        {/* CONTROLS & EXPORT ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Range Pills */}
          <div className="flex items-center p-1 rounded-xl bg-surface border border-border-subtle">
            {(
              [
                { id: "today", label: "Hari Ini" },
                { id: "7d", label: "7 Hari" },
                { id: "30d", label: "30 Hari" },
              ] as { id: Range; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  range === t.id
                    ? "bg-brand-accent text-canvas shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={exportExcel}
            disabled={!data}
            className="px-3 py-2 rounded-xl bg-surface border border-border-subtle hover:border-emerald-500/50 hover:bg-emerald-500/5 text-text-primary font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Download Spreadsheet Excel (.xls)"
          >
            <FileSpreadsheet size={14} className="text-emerald-500" />
            <span>Excel</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="px-3 py-2 rounded-xl bg-surface border border-border-subtle hover:border-border-strong text-text-muted hover:text-text-primary font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Download File CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!data}
            className="px-3.5 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:opacity-95 transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs cursor-pointer"
            title="Cetak Laporan atau Simpan sebagai PDF"
          >
            <Printer size={14} />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-text-muted">
          Memuat data laporan operasional...
        </div>
      )}

      {error && !loading && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-rose-500 shrink-0" />
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-300">Gagal memuat laporan</p>
              <p className="text-text-muted text-xs">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load(range)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-500/30 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* TAB NAVIGATION STRIP (Print Hidden) */}
          <div className="flex items-center gap-2 border-b border-border-subtle pb-1 print:hidden">
            <button
              type="button"
              onClick={() => setActiveTab("financial")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "financial"
                  ? "bg-surface text-brand-accent border border-border-subtle shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <TrendingUp size={14} />
              <span>Uang Masuk &amp; Penjualan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("production")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "production"
                  ? "bg-surface text-brand-accent border border-border-subtle shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Kualitas Sablon &amp; QC</span>
              {data.overdueExpress > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px]">
                  {data.overdueExpress} overdue
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-surface text-brand-accent border border-border-subtle shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Package size={14} />
              <span>Sisa Stok Kaos</span>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px]">
                  {lowStockCount} restock
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: FINANCIAL & SALES */}
          {(activeTab === "financial" || typeof window === "undefined") && (() => {
            const rangeLabel = range === "today" ? "Hari Ini" : range === "7d" ? "7 Hari Terakhir" : "30 Hari Terakhir";
            const periodGross = data.gross ?? 0;
            const customStudioGross = data.channels?.customStudio.gross ?? 0;
            const customStudioOrders = data.channels?.customStudio.orders ?? 0;
            const catalogGross = data.channels?.catalogEcommerce.gross ?? 0;
            const catalogOrders = data.channels?.catalogEcommerce.orders ?? 0;
            const qrisGross = data.payments?.ipaymuQris.gross ?? 0;
            const qrisOrders = data.payments?.ipaymuQris.orders ?? 0;
            const otherGross = data.payments?.otherMethods.gross ?? 0;
            const otherOrders = data.payments?.otherMethods.orders ?? 0;
            const totalChannelOrders = customStudioOrders + catalogOrders;

            const customStudioPct = periodGross > 0 ? Math.round((customStudioGross / periodGross) * 100) : 0;
            const catalogPct = periodGross > 0 ? Math.round((catalogGross / periodGross) * 100) : 0;
            const qrisPct = periodGross > 0 ? Math.round((qrisGross / periodGross) * 100) : 0;
            const otherPct = periodGross > 0 ? Math.round((otherGross / periodGross) * 100) : 0;

            const totalPotongan = (data.refundTotal ?? 0) + (data.discountTotal ?? 0);
            const successRate = data.counts.orders > 0 ? Math.round((data.counts.completed / data.counts.orders) * 100) : 100;

            return (
              <div className="space-y-6">
                {/* 1. Primary KPI Summary Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-text-muted">
                      Ringkasan Penjualan ({rangeLabel})
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      {data.counts.orders} total pesanan
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Uang Masuk Bersih */}
                    <div className="p-4 rounded-xl bg-surface border border-emerald-500/30 space-y-1 relative overflow-hidden">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                          Uang Bersih (Net)
                        </span>
                        <DollarSign size={15} className="text-emerald-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                        {fmtRp(data.net)}
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Total bersih setelah refund &amp; kupon
                      </span>
                    </div>

                    {/* Total Penjualan Kotor */}
                    <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[11px] text-text-muted uppercase tracking-wide">
                          Penjualan Kotor
                        </span>
                        <TrendingUp size={15} className="text-brand-accent" />
                      </div>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-text-primary block">
                        {fmtRp(data.gross)}
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        {data.counts.completed} pesanan sukses selesai
                      </span>
                    </div>

                    {/* Potongan & Diskon */}
                    <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[11px] text-text-muted uppercase tracking-wide">
                          Potongan &amp; Refund
                        </span>
                        <Receipt size={15} className="text-amber-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-text-primary block">
                        {fmtRp(totalPotongan)}
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Refund: {fmtRp(data.refundTotal)} • Kupon: {fmtRp(data.discountTotal)}
                      </span>
                    </div>

                    {/* Pesanan Selesai */}
                    <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[11px] text-text-muted uppercase tracking-wide">
                          Pesanan Berhasil
                        </span>
                        <CheckCircle2 size={15} className="text-sky-500" />
                      </div>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-text-primary block">
                        {successRate}%
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        {data.counts.completed} selesai ({data.counts.cancelled} batal)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Visual Bagan Batang Tren Penjualan Harian (DI ATAS) */}
                <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border-subtle">
                    <div>
                      <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                        <span>Bagan Penjualan Harian ({rangeLabel})</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent font-bold">
                          Grafik Batang
                        </span>
                      </h3>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Arahkan kursor atau sentuh batang grafik untuk melihat rincian omset &amp; jumlah pesanan
                      </p>
                    </div>
                    {maxDailyGross > 0 && (
                      <span className="text-[11px] font-mono text-text-muted">
                        Puncak tertinggi: <strong className="text-brand-accent">{fmtRp(maxDailyGross)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto pt-2">
                    <svg
                      viewBox="0 0 600 210"
                      className="w-full min-w-[480px]"
                      role="img"
                      aria-label="Grafik batang omset harian"
                    >
                      <line x1="8" y1="170" x2="592" y2="170" stroke="currentColor" strokeOpacity="0.15" />
                      {data.daily.map((d, i) => {
                        const n = data.daily.length || 1;
                        const slot = 584 / n;
                        const barW = Math.max(8, Math.min(32, slot * 0.55));
                        const cx = 8 + i * slot + slot / 2;
                        const h =
                          maxDailyGross > 0 && d.gross !== null
                            ? Math.max(d.gross > 0 ? 5 : 0, ((d.gross ?? 0) / maxDailyGross) * 140)
                            : 0;
                        const y = 170 - h;
                        const showLabel = n <= 10 || i % Math.ceil(n / 10) === 0;
                        return (
                          <g key={d.date} className="group cursor-pointer">
                            <title>{`${d.date}: ${fmtRp(d.gross)} (${d.orders} pesanan)`}</title>
                            <rect
                              x={cx - barW / 2}
                              y={y}
                              width={barW}
                              height={Math.max(h, 2)}
                              rx={4}
                              className="fill-brand-accent opacity-85 hover:opacity-100 transition-all filter hover:brightness-110"
                            />
                            {/* Hover tooltip bubble */}
                            <text
                              x={cx}
                              y={Math.max(y - 8, 14)}
                              textAnchor="middle"
                              fontSize="10"
                              className="fill-text-primary font-mono font-bold opacity-0 group-hover:opacity-100 transition"
                            >
                              {fmtRp(d.gross)}
                            </text>
                            {showLabel && (
                              <text
                                x={cx}
                                y={188}
                                textAnchor="middle"
                                fontSize="9"
                                className="fill-text-muted font-mono"
                              >
                                {d.date.slice(5) || d.date}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* 3. Visual Gauge: Proporsi Saluran Penjualan & Pembayaran */}
                {data.channels && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Visual Bar Proporsi Saluran */}
                    <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">
                          Sumber Penjualan
                        </span>
                        <span className="text-[11px] text-text-muted font-mono">
                          {totalChannelOrders} pesanan
                        </span>
                      </div>
                      {/* Bar Gauge */}
                      <div className="h-3 w-full bg-border-subtle rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${customStudioPct}%` }}
                          className="bg-brand-accent transition-all duration-500"
                          title={`Studio Kustom 3D: ${customStudioPct}%`}
                        />
                        <div
                          style={{ width: `${catalogPct}%` }}
                          className="bg-emerald-500 transition-all duration-500"
                          title={`Katalog Baju Jadi: ${catalogPct}%`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-surface-elevated border border-brand-accent/20">
                          <span className="text-[10px] text-brand-accent font-bold uppercase block">
                            Studio Kustom 3D ({customStudioPct}%)
                          </span>
                          <span className="font-mono font-bold text-text-primary text-sm">
                            {fmtRp(customStudioGross)}
                          </span>
                          <span className="text-[10px] text-text-muted block mt-0.5">
                            {customStudioOrders} pesanan kaos kustom
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface-elevated border border-emerald-500/20">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">
                            Baju Jadi Katalog ({catalogPct}%)
                          </span>
                          <span className="font-mono font-bold text-text-primary text-sm">
                            {fmtRp(catalogGross)}
                          </span>
                          <span className="text-[10px] text-text-muted block mt-0.5">
                            {catalogOrders} pesanan baju ready
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Bar Proporsi Pembayaran */}
                    <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">
                          Metode Pembayaran
                        </span>
                        <span className="text-[11px] text-text-muted font-mono">
                          {qrisOrders + otherOrders} transaksi
                        </span>
                      </div>
                      {/* Bar Gauge */}
                      <div className="h-3 w-full bg-border-subtle rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${qrisPct}%` }}
                          className="bg-sky-500 transition-all duration-500"
                          title={`QRIS Dinamis: ${qrisPct}%`}
                        />
                        <div
                          style={{ width: `${otherPct}%` }}
                          className="bg-purple-500 transition-all duration-500"
                          title={`Transfer / Tunai: ${otherPct}%`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-surface-elevated border border-sky-500/20">
                          <span className="text-[10px] text-sky-500 font-bold uppercase block">
                            QRIS Otomatis ({qrisPct}%)
                          </span>
                          <span className="font-mono font-bold text-text-primary text-sm">
                            {fmtRp(qrisGross)}
                          </span>
                          <span className="text-[10px] text-text-muted block mt-0.5">
                            {qrisOrders} transaksi iPaymu
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface-elevated border border-purple-500/20">
                          <span className="text-[10px] text-purple-500 font-bold uppercase block">
                            Transfer / Kasir ({otherPct}%)
                          </span>
                          <span className="font-mono font-bold text-text-primary text-sm">
                            {fmtRp(otherGross)}
                          </span>
                          <span className="text-[10px] text-text-muted block mt-0.5">
                            {otherOrders} transaksi konfirmasi
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Daily Closing Cards (Buku Kasir Kas Hari Ini & Kemarin) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-text-muted">
                      Buku Kasir Harian (Tutup Kas)
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Otomatis tutup buku per 24 jam WITA
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ClosingCard title="Kasir Hari Ini" day={data.closing.today} accent />
                    <ClosingCard title="Kasir Kemarin" day={data.closing.yesterday} accent={false} />
                  </div>
                </div>

                {/* 5. Catatan Unduhan Lengkap */}
                <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border-subtle flex items-center justify-between gap-3 text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <Info size={15} className="text-brand-accent shrink-0" />
                    <span>
                      Data laporan lengkap dapat diunduh kapan saja melalui tombol <strong>Excel (.xls)</strong>, <strong>CSV</strong>, atau <strong>Cetak PDF</strong> di kanan atas.
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 2: PRODUCTION & QC */}
          {activeTab === "production" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-text-primary">Quality Control (QC) Sablon</h3>
                    <span className="text-[11px] font-mono text-text-muted">{data.defectRate.total} pemeriksaan</span>
                  </div>
                  <p className="font-mono font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                    {data.defectRate.lolos} pesanan lolos
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {Object.entries(data.defectRate.perDefect).map(([k, v]) => (
                      <div key={k} className="flex justify-between font-mono text-xs">
                        <span className="text-text-muted uppercase">{k}</span>
                        <span className="font-semibold text-text-primary">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-text-primary">Waktu Penyelesaian Produksi</h3>
                    <span className="text-[11px] font-mono text-text-muted">{data.avgTurnaroundMeta.sample} sampel</span>
                  </div>
                  <p className="font-mono font-bold text-2xl text-text-primary">
                    {fmtNum(data.avgTurnaroundHours, " jam")}
                  </p>
                  <div className="space-y-1.5 pt-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Pesanan selesai</span>
                      <span className="font-semibold text-text-primary">{data.counts.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Pesanan batal</span>
                      <span className="font-semibold text-text-primary">{data.counts.cancelled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-600 font-medium">Express terlambat (&gt;24 jam)</span>
                      <span className="font-bold text-rose-600">{data.overdueExpress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workload Table (Constrained Scrollable) */}
              <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">Beban Operator Produksi</h3>
                    <p className="text-[11px] text-text-muted">Distribusi penugasan sablon, press, dan packaging tim</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border-subtle overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-elevated/70 sticky top-0 border-b border-border-subtle z-10 text-[10px] uppercase text-text-muted">
                      <tr>
                        <th className="p-3">Penanggung Jawab</th>
                        <th className="p-3">Kontak</th>
                        <th className="p-3 text-right">Aktif</th>
                        <th className="p-3 text-right">Express</th>
                        <th className="p-3 text-right">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {data.workload.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-5 text-center text-text-muted">
                            Tidak ada tugas aktif di antrean produksi saat ini.
                          </td>
                        </tr>
                      )}
                      {data.workload.map((w) => (
                        <tr key={w.userId ?? "UNASSIGNED"} className="hover:bg-surface-elevated/40 transition">
                          <td className="p-3 font-bold text-text-primary">{w.name}</td>
                          <td className="p-3 text-text-muted">{w.phoneMasked}</td>
                          <td className="p-3 text-right font-semibold">{w.active}</td>
                          <td className="p-3 text-right">{w.express}</td>
                          <td className={`p-3 text-right font-bold ${w.overdue > 0 ? "text-rose-600" : ""}`}>
                            {w.overdue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY FORECAST */}
          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-surface border border-border-subtle">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Proyeksi Kebutuhan Restock Bahan Baku</h3>
                  <p className="text-[11px] text-text-muted">
                    Varian yang diprediksi habis dalam waktu kurang dari 2 minggu
                  </p>
                </div>
                <Link
                  href="/admin/inventory"
                  className="px-3.5 py-1.5 rounded-lg bg-brand-accent text-canvas font-bold text-xs hover:opacity-90 transition flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Buka Inventaris Kaos Polos</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Inventory Table with Sticky Header & Constrained Height */}
              <div className="rounded-2xl border border-border-subtle overflow-hidden bg-surface max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface-elevated/80 sticky top-0 border-b border-border-subtle z-10 text-[10px] uppercase text-text-muted">
                    <tr>
                      <th className="p-3">Varian Bahan</th>
                      <th className="p-3">Ukuran</th>
                      <th className="p-3 text-right">Sisa Stok</th>
                      <th className="p-3 text-right">Burn / Minggu</th>
                      <th className="p-3 text-right">Estimasi (Minggu)</th>
                      <th className="p-3 text-right">Saran Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.stockForecast.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-text-muted">
                          Belum ada data varian bahan yang tercatat.
                        </td>
                      </tr>
                    )}
                    {data.stockForecast.map((f) => {
                      const needsRestock = (f.suggestOrder ?? 0) > 0;
                      return (
                        <tr
                          key={f.variantId}
                          className={`hover:bg-surface-elevated/40 transition ${
                            needsRestock ? "bg-amber-500/5" : ""
                          }`}
                        >
                          <td className="p-3 font-semibold text-text-primary">
                            {f.name}{" "}
                            <span className="text-text-muted font-normal">({f.colorName})</span>
                          </td>
                          <td className="p-3">{f.size}</td>
                          <td className="p-3 text-right font-bold">{f.qty}</td>
                          <td className="p-3 text-right">{fmtNum(f.burnPerWeek)}</td>
                          <td className="p-3 text-right">{fmtNum(f.weeksLeft)}</td>
                          <td className="p-3 text-right">
                            {needsRestock ? (
                              <span className="px-2 py-0.5 rounded font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                +{fmtNum(f.suggestOrder)} pcs
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRIVACY FOOTER */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-text-muted text-[11px] print:hidden">
            <div className="flex items-center gap-1.5">
              <Lock size={12} />
              <span>Privasi data pelanggan dan staf terlindungi sesuai kebijakan sistem.</span>
            </div>
            <Link href="/admin" className="text-brand-accent hover:underline font-semibold">
              Kembali ke Ikhtisar
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
