"use client";

// Halaman builder gang-sheet DTF (kolektor + review + ekspor).
// RBAC: ikut layout /admin (server gate ADMIN/SUPER_ADMIN/PRODUCTION_STAFF) —
// halaman ini tidak menambah logika auth sendiri.
// Kontrak (impor langsung, tanpa shim):
// - packGangSheet + konstanta dari "@/lib/gangPacker"
// - exportGangSheetPNG dari "@/lib/gangExport"
//
// KONTRAK TILED-MASTER (titik pakai — baca bareng gangExport.ts):
// - JANGAN bikin endpoint compose server (Workers tak bisa: tanpa DOM Canvas,
//   batas Worker 3MB, kanvas raksasa = OOM). Rakit ulang SELALU di client.
// - Panel A3/besar tersimpan di LS `kaoskami_master_assets["<apparel>:<panel>"]`
//   = { url (= tile0), tiles[] (set lengkap R2), cols, rows, tiled:true }.
// - tile0 (= `url`) = pratinjau/kompatibel-legacy; `tiles[]` = cetak penuh.
//   Task produksi (`printFileUrl`) membawa tile0; perakitan penuh tiled =
//   tugas halaman admin ini (client) bila butuh resolusi penuh.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { exportGangSheetPNG } from "@/lib/gangExport";

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
  notes: string | null;
  order: {
    orderNumber: string;
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

/** Qty bawaan: join ke item induk via orderItemId; fallback 1 bila tak ketemu. */
function qtyDariItemInduk(t: TaskRow): number {
  const q = t.order?.items?.find((it) => it.id === t.orderItemId)?.quantity;
  return Number.isInteger(q) && (q as number) >= 1 ? (q as number) : 1;
}

/** Label baris: snapshot item induk, lalu notes, lalu fallback. */
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

// ─── Halaman ───

export default function GangSheetBuilderPage() {
  // (1) KOLEKTOR
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [centang, setCentang] = useState<Record<string, boolean>>({});
  const [qtyEdit, setQtyEdit] = useState<Record<string, number>>({});
  const [hargaPerMeter, setHargaPerMeter] = useState(35000);

  // (2) HASIL SUSUN
  const [hasil, setHasil] = useState<GangPackResult | null>(null);
  const [binAktif, setBinAktif] = useState(0);
  const [kotakEdit, setKotakEdit] = useState<GangPlacement[][] | null>(null);

  // (3) REVIEW
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tampilPotong, setTampilPotong] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const seretRef = useRef<{
    idx: number;
    awalCX: number;
    awalCY: number;
    asalX: number;
    asalY: number;
    pxPerMm: number;
  } | null>(null);

  // (4) EKSPOR
  const [gangId, setGangId] = useState(() => `GANG-${todayLocalYYYYMMDD()}`);
  const [dpi, setDpi] = useState<150 | 300>(300);
  const [nomorMaklon, setNomorMaklon] = useState("");
  const [mengekspor, setMengekspor] = useState(false);
  const [galatEkspor, setGalatEkspor] = useState<string | null>(null);
  const [rekap, setRekap] = useState<string | null>(null);
  const [namaFile, setNamaFile] = useState<string | null>(null);
  const [unduhUrl, setUnduhUrl] = useState<string | null>(null);
  const [peringatanEkspor, setPeringatanEkspor] = useState<string[]>([]);
  const [disalin, setDisalin] = useState(false);

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
        setTasks(list.filter((x) => x && x.order));
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

  // Bersihkan URL objek lama saat diganti / unmount (hindari bocor memori).
  useEffect(() => {
    return () => {
      if (unduhUrl) URL.revokeObjectURL(unduhUrl);
    };
  }, [unduhUrl]);

  // ── Turunan kolektor ──
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) =>
      `${t.order?.orderNumber || ""} ${labelBaris(t)}`.toLowerCase().includes(q),
    );
  }, [tasks, cari]);

  const qtyEfektif = useCallback(
    (t: TaskRow) => {
      const v = qtyEdit[t.id] ?? qtyDariItemInduk(t);
      return Number.isInteger(v) && v >= 1 ? Math.min(99, v) : 1;
    },
    [qtyEdit],
  );

  const idSiap = useMemo(() => tasks.filter((t) => siapCetak(t).ok).map((t) => t.id), [tasks]);

  const dipilihValid = useMemo(
    () => tasks.filter((t) => centang[t.id] && siapCetak(t).ok),
    [tasks, centang],
  );

  const totalKopiDiminta = useMemo(
    () => dipilihValid.reduce((s, t) => s + qtyEfektif(t), 0),
    [dipilihValid, qtyEfektif],
  );

  // ── (2) AUTO-SUSUN ──
  function susunOtomatis() {
    const rects: GangRect[] = dipilihValid.map((t) => ({
      id: t.id,
      wMm: cmToMm(t.printWidthCm as number),
      hMm: cmToMm(t.printHeightCm as number),
      qty: qtyEfektif(t),
      label: labelBaris(t),
      orderNumber: t.order?.orderNumber || "—",
      masterUrl: t.printFileUrl,
      allowRotation: true,
    }));
    if (rects.length === 0) return;
    const r = packGangSheet(rects); // default 1000×580 mm, gap & margin kontrak
    setHasil(r);
    setKotakEdit(r.bins.map((b) => b.map((p) => ({ ...p }))));
    setBinAktif(0);
    setTerpilih(null);
  }

  function pilihSemuaSiap() {
    setCentang((prev) => {
      const next = { ...prev };
      for (const id of idSiap) next[id] = true;
      return next;
    });
  }

  function bersihkanPilihan() {
    setCentang({});
  }

  // ── Turunan hasil ──
  const binCount = hasil?.bins.length ?? 0;
  const kopiTerpasang = useMemo(
    () => (kotakEdit ?? []).reduce((s, b) => s + b.length, 0),
    [kotakEdit],
  );
  const totalBiaya = binCount * (Number.isFinite(hargaPerMeter) ? Math.max(0, hargaPerMeter) : 0);
  const biayaPerDesain = kopiTerpasang > 0 ? totalBiaya / kopiTerpasang : 0;

  const isiBinAktif: GangPlacement[] = useMemo(
    () => (kotakEdit && kotakEdit[binAktif]) || [],
    [kotakEdit, binAktif],
  );

  const utilLive = useMemo(() => {
    if (!hasil) return 0;
    const luas = isiBinAktif.reduce((s, p) => s + p.wMm * p.hMm, 0);
    const total = hasil.binWmm * hasil.binHmm;
    return total > 0 ? (luas / total) * 100 : 0;
  }, [hasil, isiBinAktif]);

  const itemTerpilih: GangPlacement | null =
    terpilih !== null ? (isiBinAktif[terpilih] ?? null) : null;

  // ── (3) REVIEW: geser / putar / hapus ──
  function perbaruiKotak(idx: number, patch: Partial<GangPlacement>) {
    setKotakEdit((prev) => {
      if (!prev) return prev;
      const cur = prev[binAktif];
      if (!cur || !cur[idx]) return prev;
      const next = prev.map((b) => [...b]);
      const nb: GangPlacement[] = [...cur];
      const lama = nb[idx] as GangPlacement;
      nb[idx] = { ...lama, ...patch };
      next[binAktif] = nb;
      return next;
    });
  }

  function putarTerpilih() {
    if (!hasil || terpilih === null) return;
    const p = isiBinAktif[terpilih];
    if (!p) return;
    const w = p.hMm;
    const h = p.wMm;
    const x = Math.min(Math.max(0, p.xMm), Math.max(0, hasil.binWmm - w));
    const y = Math.min(Math.max(0, p.yMm), Math.max(0, hasil.binHmm - h));
    perbaruiKotak(terpilih, { wMm: w, hMm: h, xMm: x, yMm: y, rot: !p.rot });
  }

  function hapusTerpilih() {
    if (terpilih === null) return;
    setKotakEdit((prev) => {
      if (!prev) return prev;
      const cur = prev[binAktif];
      if (!cur) return prev;
      const next = prev.map((b) => [...b]);
      next[binAktif] = cur.filter((_, i) => i !== terpilih);
      return next;
    });
    setTerpilih(null);
  }

  function resetBinAktif() {
    if (!hasil) return;
    setKotakEdit((prev) => {
      if (!prev) return prev;
      const next = prev.map((b) => [...b]);
      next[binAktif] = (hasil.bins[binAktif] || []).map((p) => ({ ...p }));
      return next;
    });
    setTerpilih(null);
  }

  // Drag pointer → geser kotak, snap 1 mm, jepit di dalam lembar.
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
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* abaikan */
    }
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
    seretRef.current = null;
  }

  // ── (4) EKSPOR ──
  async function eksporPng() {
    if (!hasil || isiBinAktif.length === 0 || mengekspor) return;
    setMengekspor(true);
    setGalatEkspor(null);
    setDisalin(false);
    try {
      const out = await exportGangSheetPNG({
        placements: isiBinAktif,
        binWmm: hasil.binWmm,
        binHmm: hasil.binHmm,
        dpi,
        cutLines: tampilPotong,
        gangId: gangId.trim() || undefined,
      });
      if (unduhUrl) URL.revokeObjectURL(unduhUrl);
      const url = URL.createObjectURL(out.blob);
      setUnduhUrl(url);
      setRekap(out.recapText);
      setNamaFile(out.filename);
      setPeringatanEkspor(out.warnings);
      // Unduh otomatis sekali; tautan unduh-ulang tetap tersedia.
      const a = document.createElement("a");
      a.href = url;
      a.download = out.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setGalatEkspor(e instanceof Error ? e.message : "Gagal mengekspor PNG");
    } finally {
      setMengekspor(false);
    }
  }

  async function salinRekap() {
    if (!rekap) return;
    try {
      await navigator.clipboard.writeText(rekap);
      setDisalin(true);
      window.setTimeout(() => setDisalin(false), 2000);
    } catch {
      setGalatEkspor("Gagal menyalin — blokir izin clipboard browser, salin manual dari kotak rekap.");
    }
  }

  const digitMaklon = nomorMaklon.replace(/\D/g, "");
  const waHref =
    rekap && digitMaklon
      ? `https://wa.me/${digitMaklon}?text=${encodeURIComponent(rekap)}`
      : null;

  // ── Render ──
  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Kepala */}
      <div className="pb-4 border-b border-white/5">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
          Gang-Sheet Builder
        </h1>
        <p className="font-mono text-xs text-text-muted mt-1">
          Kumpulkan desain siap-cetak → susun otomatis ke roll film{" "}
          {GANG_BIN_W_MM}×{GANG_BIN_H_MM}mm (gap {GANG_GAP_MM}mm, margin {GANG_MARGIN_MM}mm) →
          review → ekspor PNG ke maklon.
        </p>
      </div>

      {/* (1) KOLEKTOR */}
      <section className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <h2 className="font-bold text-white">1 — Kolektor desain siap-cetak</h2>
          <div className="flex gap-2">
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nomor order / desain…"
              className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-500 w-56"
            />
            <button
              onClick={() => void muatTask()}
              disabled={memuat}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-bold disabled:opacity-50"
            >
              {memuat ? "Memuat…" : "Muat ulang"}
            </button>
          </div>
        </div>

        {galatMuat && (
          <p className="text-sm text-red-400 font-mono">
            {galatMuat}{" "}
            <button onClick={() => void muatTask()} className="underline">
              coba lagi
            </button>
          </p>
        )}

        {!memuat && !galatMuat && tersaring.length === 0 && (
          <p className="text-sm text-text-muted font-mono py-6 text-center">
            Belum ada task produksi — tunggu order masuk / settlement.
          </p>
        )}

        {tersaring.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left font-mono text-[11px] uppercase text-zinc-500 border-b border-white/10">
                  <th className="py-2 pr-2 w-10">Pilih</th>
                  <th className="py-2 pr-2">Desain</th>
                  <th className="py-2 pr-2">Order</th>
                  <th className="py-2 pr-2">Ukuran</th>
                  <th className="py-2 pr-2 w-24">Qty</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tersaring.map((t) => {
                  const st = siapCetak(t);
                  const orderNo = t.order?.orderNumber || "—";
                  return (
                    <tr key={t.id} className="border-b border-white/5 align-middle">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${orderNo}`}
                          checked={!!centang[t.id]}
                          disabled={!st.ok}
                          onChange={(e) =>
                            setCentang((prev) => ({ ...prev, [t.id]: e.target.checked }))
                          }
                          className="h-4 w-4 accent-amber-400"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2.5">
                          {t.printFileUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- thumbnail eksternal/R2; next/image tak menambah nilai di panel admin
                            <img
                              src={t.printFileUrl}
                              alt={labelBaris(t)}
                              className="h-11 w-11 rounded-lg object-cover bg-black/50 border border-white/10 shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-lg bg-black/50 border border-dashed border-white/15 text-[9px] text-zinc-500 flex items-center justify-center text-center shrink-0">
                              tanpa
                              <br />
                              file
                            </div>
                          )}
                          <span className="text-white font-medium line-clamp-2">{labelBaris(t)}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs text-zinc-300 whitespace-nowrap">
                        {orderNo}
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs text-zinc-300 whitespace-nowrap">
                        {fmtCm(t.printWidthCm)}×{fmtCm(t.printHeightCm)} cm
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          aria-label={`Qty ${orderNo}`}
                          min={1}
                          max={99}
                          value={qtyEfektif(t)}
                          disabled={!st.ok}
                          onChange={(e) => {
                            const v = Math.round(Number(e.target.value));
                            setQtyEdit((prev) => ({
                              ...prev,
                              [t.id]: Number.isFinite(v) ? Math.min(99, Math.max(1, v)) : 1,
                            }));
                          }}
                          title={`Bawaan dari item induk: ${qtyDariItemInduk(t)}`}
                          className="w-20 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2">
                        {st.ok ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Siap
                          </span>
                        ) : (
                          <span
                            className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/10"
                            title={st.alasan}
                          >
                            {st.alasan}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 lg:items-end justify-between pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={pilihSemuaSiap}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-bold"
            >
              Pilih semua siap ({idSiap.length})
            </button>
            <button
              onClick={bersihkanPilihan}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400"
            >
              Bersihkan
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-zinc-400 font-mono">
              Harga film /meter (Rp)
              <input
                type="number"
                min={0}
                step={500}
                value={hargaPerMeter}
                onChange={(e) => setHargaPerMeter(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="ml-2 w-32 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
              />
            </label>
            <button
              onClick={susunOtomatis}
              disabled={dipilihValid.length === 0}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-sm uppercase tracking-wide disabled:opacity-40"
            >
              Auto-susun ({dipilihValid.length} desain · {totalKopiDiminta} kopi)
            </button>
          </div>
        </div>
      </section>

      {/* (2) HASIL SUSUN */}
      {hasil && (
        <section className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-3">
          <h2 className="font-bold text-white">2 — Hasil susunan</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-black/40 border border-white/10 p-3">
              <p className="font-mono text-[11px] uppercase text-zinc-500">Utilisasi (packer)</p>
              <p className="text-2xl font-black text-amber-400">{hasil.utilizationPct.toFixed(1)}%</p>
              <p className="font-mono text-[11px] text-zinc-500">
                Review meter ini: {utilLive.toFixed(1)}% · {kopiTerpasang} kopi terpasang
              </p>
              <div className="h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, hasil.utilizationPct))}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-3">
              <p className="font-mono text-[11px] uppercase text-zinc-500">Estimasi biaya film</p>
              <p className="text-2xl font-black text-white">{fmtRp(totalBiaya)}</p>
              <p className="font-mono text-[11px] text-zinc-500">
                ≈ {fmtRp(biayaPerDesain)}/desain · {binCount} meter × {fmtRp(hargaPerMeter)}
              </p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-3">
              <p className="font-mono text-[11px] uppercase text-zinc-500">Lembar</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {hasil.bins.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setBinAktif(i);
                      setTerpilih(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                      i === binAktif
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-white/5 text-white border-white/10"
                    }`}
                  >
                    Meter {i + 1}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[11px] text-zinc-500 mt-1.5">
                {hasil.binWmm}×{hasil.binHmm}mm per meter
              </p>
            </div>
          </div>

          {binCount > 1 && (
            <p className="text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-2">
              Muatan meluber ke meter-2 (total {binCount} meter film). Siapkan roll {binCount} meter;
              tiap meter diekspor sebagai PNG terpisah.
            </p>
          )}
          {hasil.unplaced.length > 0 && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <p className="font-bold">{hasil.unplaced.length} desain tak muat di lembar kosong (cek dimensi):</p>
              <ul className="list-disc ml-5 font-mono text-xs mt-1">
                {hasil.unplaced.map((u) => (
                  <li key={u.id}>
                    Order {u.orderNumber} — {labelBaris({ id: u.id, orderId: "", orderItemId: "", stage: "", printWidthCm: u.wMm / 10, printHeightCm: u.hMm / 10, printFileUrl: u.masterUrl, notes: u.label, order: null })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* (3) REVIEW */}
      {hasil && kotakEdit && (
        <section className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <h2 className="font-bold text-white">3 — Review meter {binAktif + 1}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="font-mono text-xs text-zinc-400 flex items-center gap-1.5">
                Zoom
                <input
                  type="range"
                  min={0.4}
                  max={2}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-28"
                />
                <span className="w-10">{Math.round(zoom * 100)}%</span>
              </label>
              <label className="font-mono text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tampilPotong}
                  onChange={(e) => setTampilPotong(e.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
                Garis potong
              </label>
              <button
                onClick={putarTerpilih}
                disabled={terpilih === null}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-bold disabled:opacity-40"
              >
                Putar 90°
              </button>
              <button
                onClick={hapusTerpilih}
                disabled={terpilih === null}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 font-bold disabled:opacity-40"
              >
                Hapus
              </button>
              <button
                onClick={resetBinAktif}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300"
              >
                Reset
              </button>
            </div>
          </div>

          <p className="font-mono text-[11px] text-zinc-500">
            Klik kotak untuk memilih · seret untuk geser (snap 1mm, tertahan di dalam lembar) ·{" "}
            {itemTerpilih
              ? `terpilih: Order ${itemTerpilih.orderNumber} — ${(itemTerpilih.wMm / 10).toFixed(1)}×${(itemTerpilih.hMm / 10).toFixed(1)}cm @ ${itemTerpilih.xMm},${itemTerpilih.yMm}mm${itemTerpilih.rot ? " (diputar)" : ""}`
              : "belum ada yang dipilih"}
          </p>

          <div className="overflow-auto rounded-xl bg-black/60 border border-white/10 p-3 touch-none select-none">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${hasil.binWmm} ${hasil.binHmm}`}
              role="application"
              aria-label={`Review gang-sheet meter ${binAktif + 1}`}
              onPointerMove={onSvgPointerMove}
              onPointerUp={akhiriSeret}
              onPointerCancel={akhiriSeret}
              onPointerLeave={akhiriSeret}
              onClick={() => setTerpilih(null)}
              className="block h-auto mx-auto"
              style={{ width: `${Math.round(zoom * 100)}%`, minWidth: "320px", cursor: "default" }}
            >
              {/* Latar + panduan margin aman */}
              <rect x={0} y={0} width={hasil.binWmm} height={hasil.binHmm} fill="#101014" />
              <rect
                x={GANG_MARGIN_MM}
                y={GANG_MARGIN_MM}
                width={hasil.binWmm - GANG_MARGIN_MM * 2}
                height={hasil.binHmm - GANG_MARGIN_MM * 2}
                fill="none"
                stroke="#3f3f46"
                strokeWidth={2}
                strokeDasharray="10 8"
              />
              {isiBinAktif.map((p, idx) => {
                const aktif = idx === terpilih;
                const labelCm = `${(p.wMm / 10).toFixed(1)}×${(p.hMm / 10).toFixed(1)}cm`;
                const muatTeks = p.wMm >= 90 && p.hMm >= 60;
                return (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- klik mouse + tombol Putar/Hapus sebagai alternatif keyboard
                  <g
                    key={`${p.id}-${p.copyIndex}-${idx}`}
                    onPointerDown={(e) => onKotakPointerDown(e, idx)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: "grab" }}
                  >
                    <rect
                      x={p.xMm}
                      y={p.yMm}
                      width={p.wMm}
                      height={p.hMm}
                      fill={aktif ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.07)"}
                      stroke={aktif ? "#fbbf24" : "#e4e4e7"}
                      strokeWidth={aktif ? 4 : 2}
                      strokeDasharray={tampilPotong ? "12 8" : undefined}
                    />
                    {p.masterUrl && (
                      <image
                        href={p.masterUrl}
                        x={p.xMm + 2}
                        y={p.yMm + 2}
                        width={Math.max(1, p.wMm - 4)}
                        height={Math.max(1, p.hMm - 4)}
                        preserveAspectRatio="xMidYMid meet"
                        opacity={0.85}
                      />
                    )}
                    {muatTeks ? (
                      <>
                        <text
                          x={p.xMm + p.wMm / 2}
                          y={p.yMm + 26}
                          textAnchor="middle"
                          fontSize={20}
                          fontWeight={800}
                          fill="#ffffff"
                          stroke="#000000"
                          strokeWidth={4}
                          paintOrder="stroke"
                        >
                          {p.orderNumber}
                        </text>
                        <text
                          x={p.xMm + p.wMm / 2}
                          y={p.yMm + 50}
                          textAnchor="middle"
                          fontSize={17}
                          fill="#fde68a"
                          stroke="#000000"
                          strokeWidth={4}
                          paintOrder="stroke"
                        >
                          {labelCm}
                        </text>
                      </>
                    ) : (
                      <text
                        x={p.xMm + p.wMm / 2}
                        y={p.yMm + p.hMm / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={Math.max(14, Math.min(22, p.wMm / 4))}
                        fontWeight={800}
                        fill="#ffffff"
                        stroke="#000000"
                        strokeWidth={3}
                        paintOrder="stroke"
                      >
                        {idx + 1}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="font-mono text-[11px] text-zinc-500">
            Kotak sempit hanya menampilkan nomor urut — detail order tetap ada di rekap ekspor. Gambar
            pratinjau bisa kosong bila file R2 menolak hotlink; PNG ekspor mencatatnya jujur di
            peringatan.
          </p>
        </section>
      )}

      {/* (4) EKSPOR */}
      {hasil && kotakEdit && (
        <section className="rounded-2xl border border-white/10 bg-[#141416] p-4 space-y-3">
          <h2 className="font-bold text-white">4 — Ekspor ke maklon</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <label className="font-mono text-xs text-zinc-400">
              ID gang
              <input
                value={gangId}
                onChange={(e) => setGangId(e.target.value)}
                className="mt-1 w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              />
            </label>
            <div className="font-mono text-xs text-zinc-400">
              Resolusi
              <div className="mt-1 flex gap-1.5">
                {([150, 300] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDpi(d)}
                    className={`px-3 py-2 rounded-lg border font-bold ${
                      dpi === d
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-white/5 text-white border-white/10"
                    }`}
                  >
                    {d} DPI
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">
                300 = HD maksimal (±puluhan MB, wajar). 150 bila browser/HP macet.
              </p>
            </div>
            <label className="font-mono text-xs text-zinc-400">
              Nomor WA maklon (cth 62812…)
              <input
                value={nomorMaklon}
                onChange={(e) => setNomorMaklon(e.target.value)}
                inputMode="tel"
                placeholder="6281234567890"
                className="mt-1 w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={() => void eksporPng()}
                disabled={mengekspor || isiBinAktif.length === 0}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm uppercase disabled:opacity-40"
              >
                {mengekspor ? "Merender PNG…" : `Ekspor meter ${binAktif + 1} → PNG`}
              </button>
            </div>
          </div>

          {isiBinAktif.length === 0 && (
            <p className="text-sm text-amber-300 font-mono">
              Meter ini kosong (semua kotak dihapus) — pilih meter lain atau Reset.
            </p>
          )}
          {galatEkspor && <p className="text-sm text-red-400 font-mono">{galatEkspor}</p>}

          {rekap && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {unduhUrl && namaFile && (
                  <a
                    href={unduhUrl}
                    download={namaFile}
                    className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold"
                  >
                    Unduh ulang {namaFile}
                  </a>
                )}
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold"
                  >
                    Kirim rekap via WA
                  </a>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-500 text-sm font-mono">
                    Isi nomor WA maklon untuk tombol kirim
                  </span>
                )}
                <button
                  onClick={() => void salinRekap()}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold"
                >
                  {disalin ? "Tersalin ✓" : "Salin rekap"}
                </button>
              </div>
              {peringatanEkspor.length > 0 && (
                <ul className="text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-2 list-disc ml-5">
                  {peringatanEkspor.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-200 bg-black/50 border border-white/10 rounded-xl p-3 max-h-72 overflow-auto">
                {rekap}
              </pre>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
