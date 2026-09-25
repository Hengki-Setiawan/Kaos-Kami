"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { maskPhone as maskPhoneLib } from "@/lib/mask"; // SSOT PII (S-045)

// ---------------------------------------------------------------------------
// /admin/laporan — Halaman reporting workshop (read-only).
// Data dari GET /api/admin/reports. Semua angka null / tak-ada-data tampil
// "—" + catatan sumber, BUKAN 0 palsu.
// ---------------------------------------------------------------------------

type Range = "today" | "7d" | "30d";

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

/** Mask WA defensif (pola admin/customers). Nilai dari API sudah termask
 *  server-side; fungsi ini idempoten untuk lapis kedua saat ekspor CSV. */
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
  lines.push(csvCell("LAPORAN WORKSHOP KAOS KAMI MAKASSAR"));
  lines.push(csvCell(`Periode range=${r.range}, diunduh ${new Date().toISOString().slice(0, 10)}`));
  lines.push("");
  lines.push(["Metrik", "Nilai (Rp/kuantitas)"].map(csvCell).join(","));
  lines.push([csvCell("Omset kotor (gross)"), r.gross ?? "—"].join(","));
  lines.push([csvCell("Refund"), r.refundTotal ?? "—"].join(","));
  lines.push([csvCell("Diskon (estimasi kupon)"), r.discountTotal ?? "—"].join(","));
  lines.push([csvCell("Omset bersih (net)"), r.net ?? "—"].join(","));
  lines.push([csvCell("Order batal"), r.counts.cancelled].join(","));
  lines.push([csvCell("Order refund"), r.counts.refunded].join(","));
  lines.push([csvCell("Order selesai"), r.counts.completed].join(","));
  lines.push(
    [csvCell("Rata-rata turnaround (jam)"), r.avgTurnaroundHours ?? "—"].join(","),
  );
  lines.push("");
  lines.push(["Tanggal", "Gross", "Order"].map(csvCell).join(","));
  for (const d of r.daily) {
    lines.push([csvCell(d.date), d.gross ?? "—", d.orders].join(","));
  }
  lines.push("");
  lines.push(
    ["Penanggung jawab", "Kontak (mask)", "Aktif", "Express", "Overdue"]
      .map(csvCell)
      .join(","),
  );
  for (const w of r.workload) {
    lines.push(
      [csvCell(w.name), csvCell(maskPhone(w.phoneMasked)), w.active, w.express, w.overdue].join(
        ",",
      ),
    );
  }
  lines.push("");
  lines.push(
    ["Varian", "Ukuran", "Sisa", "Burn/minggu", "Sisa (minggu)", "Saran order"]
      .map(csvCell)
      .join(","),
  );
  for (const f of r.stockForecast) {
    lines.push(
      [
        csvCell(`${f.name} (${f.colorName})`),
        csvCell(f.size),
        f.qty,
        f.burnPerWeek ?? "—",
        f.weeksLeft ?? "—",
        f.suggestOrder ?? "—",
      ].join(","),
    );
  }
  // Pola export existing: BOM agar Excel Indonesia baca UTF-8 + CRLF.
  return "﻿" + lines.join("\r\n");
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
      className={`p-5 rounded-2xl border space-y-3 ${
        accent
          ? "bg-brand-accent/10 border-brand-accent/40"
          : "bg-surface border-border-subtle"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          {title}
        </span>
        <span className="font-mono text-[11px] text-text-muted">{day.date}</span>
      </div>
      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Gross</span>
          <span className="font-bold text-text-primary">{fmtRp(day.gross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">− Refund</span>
          <span className="font-bold text-text-primary">{fmtRp(day.refundTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">− Diskon kupon</span>
          <span className="font-bold text-text-primary">{fmtRp(day.discountTotal)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-border-subtle">
          <span className="font-bold text-text-primary">= NET</span>
          <span className="font-display font-black text-lg text-emerald-700 dark:text-emerald-400">
            {fmtRp(day.net)}
          </span>
        </div>
        <span className="block text-[10px] text-text-muted">
          {day.orders} order tercatat (batal/refund tak masuk gross)
        </span>
      </div>
    </div>
  );
}

export default function AdminLaporanPage() {
  const [range, setRange] = useState<Range>("7d");
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

  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary">
            LAPORAN WORKSHOP
          </h1>
          <p className="text-text-muted mt-0.5">
            Tutup harian, tren, defect QC, workload & forecast stok — angka “—” berarti
            tak-ada-data, bukan nol.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              className={`px-3 py-1.5 rounded-lg border transition-all text-[11px] font-bold ${
                range === t.id
                  ? "bg-brand-accent text-canvas border-brand-accent"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            EXPORT LAPORAN (CSV)
          </button>
          <a
            href="/api/admin/orders/export"
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-surface text-text-muted hover:text-text-primary text-[11px] font-bold"
          >
            EXPORT PESANAN (CSV)
          </a>
        </div>
      </div>

      {loading && (
        <p className="text-text-muted">Memuat laporan workshop…</p>
      )}

      {error && !loading && (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
          <p className="font-bold text-red-700 dark:text-red-300">
            ⚠️ Gagal memuat laporan: {error}
          </p>
          <button
            type="button"
            onClick={() => void load(range)}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 font-bold text-red-700 dark:text-red-300"
          >
            COBA LAGI
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* 1. Tutup harian */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              TUTUP HARIAN — GROSS − REFUND − DISKON = NET
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ClosingCard title="HARI INI" day={data.closing.today} accent />
              <ClosingCard title="KEMARIN" day={data.closing.yesterday} accent={false} />
            </div>
            <p className="text-[10px] text-text-muted">{data.discountSource}</p>
          </section>

          {/* 2. Tren sederhana */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              TREN HARIAN (TABEL + BAR CSS, TANPA LIB CHART)
            </h2>
            <div className="bg-surface border border-border-subtle rounded-2xl divide-y divide-border-subtle overflow-hidden">
              {data.daily.map((d) => (
                <div key={d.date} className="p-3 flex items-center gap-3">
                  <span className="w-24 shrink-0 text-text-muted">{d.date}</span>
                  <div className="flex-1 h-3 rounded bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded bg-brand-accent/70"
                      style={{
                        width:
                          maxDailyGross > 0 && d.gross !== null
                            ? `${Math.max(2, Math.round(((d.gross ?? 0) / maxDailyGross) * 100))}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="w-40 shrink-0 text-right font-bold text-text-primary">
                    {fmtRp(d.gross)}
                  </span>
                  <span className="w-20 shrink-0 text-right text-text-muted">
                    {d.orders} order
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Defect & turnaround */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                DEFECT QC ({data.defectRate.total} inspeksi)
              </h2>
              <p className="font-display font-black text-2xl text-emerald-700 dark:text-emerald-400">
                {data.defectRate.lolos} lolos
              </p>
              <div className="space-y-1">
                {Object.entries(data.defectRate.perDefect).map(([k, v]) => (
                  <div key={k} className="flex justify-between font-mono text-xs">
                    <span className="text-text-muted uppercase">{k}</span>
                    <span className="font-bold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-text-muted">
                {data.defectSource}
                {data.defectUnparsed > 0 &&
                  ` ${data.defectUnparsed} baris tak-terbaca (tidak dihitung lolos).`}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                RATA-RATA TURNAROUND COMPLETED
              </h2>
              <p className="font-display font-black text-2xl text-text-primary">
                {fmtNum(data.avgTurnaroundHours, " jam")}
              </p>
              <p className="text-[10px] text-text-muted">
                Sampel {data.avgTurnaroundMeta.sample} order. {data.avgTurnaroundMeta.source}.
              </p>
              <div className="pt-2 border-t border-border-subtle space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Order selesai</span>
                  <span className="font-bold">{data.counts.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Order batal</span>
                  <span className="font-bold">{data.counts.cancelled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Order refund</span>
                  <span className="font-bold">{data.counts.refunded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">
                    Express overdue (&gt;24 jam)
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {data.overdueExpress}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-text-muted">{data.overdueSource}</p>
            </div>
          </section>

          {/* 4. Workload */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              WORKLOAD TIM PRODUKSI
            </h2>
            <div className="bg-surface border border-border-subtle rounded-2xl overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <thead>
                  <tr className="text-[10px] uppercase text-text-muted border-b border-border-subtle">
                    <th className="p-3">Penanggung jawab</th>
                    <th className="p-3">Kontak (mask)</th>
                    <th className="p-3 text-right">Aktif</th>
                    <th className="p-3 text-right">Express</th>
                    <th className="p-3 text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.workload.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-text-muted">
                        — Tak ada task aktif di kanban saat ini —
                      </td>
                    </tr>
                  )}
                  {data.workload.map((w) => (
                    <tr key={w.userId ?? "UNASSIGNED"}>
                      <td className="p-3 font-bold text-text-primary">{w.name}</td>
                      <td className="p-3 text-text-muted">{w.phoneMasked}</td>
                      <td className="p-3 text-right font-bold">{w.active}</td>
                      <td className="p-3 text-right">{w.express}</td>
                      <td
                        className={`p-3 text-right font-bold ${w.overdue > 0 ? "text-amber-700 dark:text-amber-400" : ""}`}
                      >
                        {w.overdue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-text-muted">{data.workloadSource}</p>
          </section>

          {/* 5. Forecast stok */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              FORECAST STOK (SARAN ORDER BILA SISA &lt; 2 MINGGU)
            </h2>
            <div className="bg-surface border border-border-subtle rounded-2xl overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead>
                  <tr className="text-[10px] uppercase text-text-muted border-b border-border-subtle">
                    <th className="p-3">Varian</th>
                    <th className="p-3">Ukuran</th>
                    <th className="p-3 text-right">Sisa</th>
                    <th className="p-3 text-right">Burn/minggu</th>
                    <th className="p-3 text-right">Sisa (minggu)</th>
                    <th className="p-3 text-right">Saran order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.stockForecast.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-5 text-center text-text-muted">
                        — Belum ada varian aktif tercatat —
                      </td>
                    </tr>
                  )}
                  {data.stockForecast.map((f) => (
                    <tr key={f.variantId}>
                      <td className="p-3 font-bold text-text-primary">
                        {f.name}{" "}
                        <span className="font-normal text-text-muted">({f.colorName})</span>
                      </td>
                      <td className="p-3">{f.size}</td>
                      <td className="p-3 text-right font-bold">{f.qty}</td>
                      <td className="p-3 text-right">{fmtNum(f.burnPerWeek)}</td>
                      <td className="p-3 text-right">{fmtNum(f.weeksLeft)}</td>
                      <td
                        className={`p-3 text-right font-bold ${(f.suggestOrder ?? 0) > 0 ? "text-amber-700 dark:text-amber-400" : ""}`}
                      >
                        {fmtNum(f.suggestOrder)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-text-muted">{data.stockSource}</p>
          </section>

          {/* Catatan privasi */}
          <p className="text-[10px] text-text-muted border-t border-border-subtle pt-4">
            Privasi (UU PDP): laporan ini TIDAK memuat nomor WA mentah — kontak tim
            tampil termask dari server. Tombol EXPORT PESANAN memakai pola CSV existing
            (berisi nomor pemesan penuh, khusus ADMIN) — unduh & gunakan seperlunya.{" "}
            <Link href="/admin" className="text-brand-accent hover:underline">
              Kembali ke overview
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
