"use client";

/**
 * M4.2 — Kalkulator sablon statis. Murni hitung lokal (tanpa fetch/API):
 * input cm → tier SSOT → biaya sablon per lapis. Tabel GSM + placement baku
 * di-render dari SSOT fisik yang sama dengan mesin harga.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { APPAREL_CATALOG, type ApparelType } from "@/lib/constants";
import {
  PRINT_TIER_COST_IDR,
  PRINT_TIER_LABEL,
  classifyPrintTierByCm,
  type PrintTier,
} from "@/lib/printTiers";
import { APPAREL_PHYSICAL_SPECS } from "@/lib/scaleCalibration";
import { Sparkles, Calculator, Percent, ArrowRight, Check } from "lucide-react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** Surcharge ketebalan kain (Blueprint 01 §10 — sama dengan pricingEngine). */
const FABRIC_ROWS: Array<{ kain: string; gsm: string; tambah: string; cocok: string }> = [
  { kain: "Combed 30s", gsm: "±150 GSM, tipis adem", tambah: "+Rp 0", cocok: "Coach jacket (poplin ringan)" },
  { kain: "Combed 24s", gsm: "±180 GSM, standar distro", tambah: "+Rp 10.000", cocok: "Kaos & longsleeve harian" },
  { kain: "Combed 20s", gsm: "±210 GSM, tebal", tambah: "+Rp 15.000", cocok: "Kaos heavyweight premium" },
  { kain: "Combed 16s", gsm: "240–280 GSM, sangat tebal", tambah: "+Rp 25.000", cocok: "Booxy tee flagship" },
  { kain: "French Terry 380", gsm: "330–380 GSM fleece", tambah: "+Rp 0", cocok: "Crewneck & hoodie" },
];

/** Nilai rupiah surcharge kain — cerminan string `tambah` di atas, khusus
 *  estimasi tampilan lokal (mesin harga TAK diubah). */
const FABRIC_SURCHARGE_IDR = [0, 10000, 15000, 25000, 0];

const APPAREL_ORDER: ApparelType[] = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"];

function tierOf(maxCm: number): PrintTier {
  return classifyPrintTierByCm(maxCm);
}

export const KalkulatorSablonClient: React.FC = () => {
  const [lebar, setLebar] = useState("21");
  const [tinggi, setTinggi] = useState("29");

  // Wholesale bulk discount simulator state
  const [bulkQty, setBulkQty] = useState("24");
  const [bulkApparel, setBulkApparel] = useState<ApparelType>("tshirt");
  const [bulkTier, setBulkTier] = useState<PrintTier>("A4");

  // Kartu GSM terpilih — state lokal estimasi tampilan (mesin harga TAK diubah).
  const [selFabric, setSelFabric] = useState(1);

  const hasil = useMemo(() => {
    const w = Number(String(lebar).replace(",", "."));
    const h = Number(String(tinggi).replace(",", "."));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const maks = Math.max(w, h);
    const tier = tierOf(maks);
    return { w, h, maks, tier, biaya: PRINT_TIER_COST_IDR[tier], label: PRINT_TIER_LABEL[tier] };
  }, [lebar, tinggi]);

  const bulkCalc = useMemo(() => {
    const qty = Math.max(1, parseInt(bulkQty, 10) || 1);
    const baseApparelPrice = APPAREL_CATALOG[bulkApparel]?.basePriceIdr || 165000;
    const sablonCost = PRINT_TIER_COST_IDR[bulkTier] || 25000;
    const unitBefore = baseApparelPrice + sablonCost;

    let discountPct = 0;
    let tierName = "Satuan (Tanpa Min. Order)";
    if (qty > 50) {
      discountPct = 20;
      tierName = "Partai Besar / Event (>50 Pcs)";
    } else if (qty >= 13) {
      discountPct = 12;
      tierName = "Komunitas / Lusinan (13-50 Pcs)";
    } else if (qty >= 6) {
      discountPct = 5;
      tierName = "Mini-Bulk (6-12 Pcs)";
    }

    const unitDiscount = Math.round((unitBefore * discountPct) / 100);
    const unitAfter = unitBefore - unitDiscount;
    const totalBefore = unitBefore * qty;
    const totalAfter = unitAfter * qty;
    const totalSavings = totalBefore - totalAfter;

    return {
      qty,
      unitBefore,
      unitAfter,
      totalBefore,
      totalAfter,
      totalSavings,
      discountPct,
      tierName,
    };
  }, [bulkQty, bulkApparel, bulkTier]);

  const overLimit = hasil !== null && hasil.maks > 30;

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-5 sm:px-10 py-10 max-w-4xl mx-auto space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-sans tracking-widest text-brand-accent font-bold uppercase">
          Kaos Kami Makassar · Panduan Sablon DTF
        </p>
        <h1 className="font-sans font-bold text-2xl sm:text-3xl uppercase">
          Kalkulator Sablon: Ukuran, GSM & Placement
        </h1>
        <p className="text-sm font-mono text-text-muted leading-relaxed">
          Semua angka di halaman ini dihitung dari standar produksi yang sama dengan mesin
          harga checkout: lebar cetak maks <strong className="text-text-primary">30 cm</strong> (batas
          sablon DTF), tier A6–A3, dan berat kain GSM per apparel.
        </p>
      </header>

      {/* 1 — Kalkulator ukuran print */}
      <section aria-label="Kalkulator ukuran print" className="p-5 rounded-2xl bg-surface/60 border border-border-subtle space-y-4">
        <h2 className="font-sans font-bold text-base uppercase">1 · Berapa tier desainmu?</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-[11px] font-sans text-text-muted font-bold uppercase">Lebar (cm)</span>
            <input
              value={lebar}
              onChange={(e) => setLebar(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
              inputMode="decimal"
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none focus:border-brand-accent"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-[11px] font-sans text-text-muted font-bold uppercase">Tinggi (cm)</span>
            <input
              value={tinggi}
              onChange={(e) => setTinggi(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
              inputMode="decimal"
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none focus:border-brand-accent"
            />
          </label>
        </div>
        {/* Slider ukuran sablon interaktif (0–30 cm, sinkron dgn input angka) */}
        <div className="space-y-3 pt-1">
          {(
            [
              { label: "Geser lebar", val: lebar, set: setLebar },
              { label: "Geser tinggi", val: tinggi, set: setTinggi },
            ] as const
          ).map((s) => {
            const num = Number(String(s.val).replace(",", "."));
            return (
              <label key={s.label} className="block space-y-1">
                <span className="flex justify-between text-[11px] font-sans text-text-muted font-bold uppercase">
                  <span>{s.label}</span>
                  <span className="text-brand-accent font-mono">
                    {Number.isFinite(num) && num > 0 ? `${num} cm` : "—"}
                  </span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={Number.isFinite(num) ? Math.min(30, Math.max(1, num)) : 21}
                  onChange={(e) => s.set(e.target.value)}
                  aria-label={s.label}
                  className="w-full accent-orange-600"
                />
              </label>
            );
          })}
          <p className="text-[11px] font-mono text-text-muted">
            Batas rel geser 30 cm = batas fisik cetak DTF (maks heat press).
          </p>
        </div>
        {hasil ? (
          <div
            role="status"
            className={`p-4 rounded-xl border font-mono text-sm leading-relaxed ${
              overLimit ? "bg-red-500/10 border-red-500/40 text-red-200" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
            }`}
          >
            {overLimit ? (
              <span>
                Sisi terpanjang <strong>{hasil.maks} cm</strong> melebihi batas cetak DTF{" "}
                <strong>30 cm</strong>. Kecilkan desain atau bagi jadi dua sisi (depan + punggung).
              </span>
            ) : (
              <span>
                Sisi terpanjang <strong>{hasil.maks} cm</strong> → tier{" "}
                <strong>{hasil.tier} ({hasil.label})</strong> · biaya sablon{" "}
                <strong>{fmtRp(hasil.biaya)}/lapis</strong>.
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs font-mono text-text-muted" role="status">Isi lebar & tinggi dalam cm (angka saja).</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <caption className="text-left text-[11px] text-text-muted pb-2 font-bold uppercase">Tabel tier baku</caption>
            <thead>
              <tr className="text-left text-text-muted border-b border-border-subtle">
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Sisi maks</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 text-right tabular-nums">Biaya/lapis</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PRINT_TIER_COST_IDR) as PrintTier[]).map((t) => (
                <tr key={t} className={`border-b border-border-subtle ${hasil?.tier === t ? "text-brand-accent font-bold" : ""}`}>
                  <td className="py-2 pr-3">{t}</td>
                  <td className="py-2 pr-3">{t === "A6" ? "≤ 10 cm" : t === "A5" ? "≤ 20 cm" : t === "A4" ? "≤ 25 cm" : "≤ 30 cm"}</td>
                  <td className="py-2 pr-3">{PRINT_TIER_LABEL[t]}</td>
                  <td className="py-2 text-right tabular-nums">{fmtRp(PRINT_TIER_COST_IDR[t])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2 — Tabel GSM */}
      <section aria-label="Tabel kain GSM" className="p-5 rounded-2xl bg-surface/60 border border-border-subtle space-y-3">
        <h2 className="font-sans font-bold text-base uppercase">2 · Pilih ketebalan kain (GSM)</h2>
        <p className="text-xs font-mono text-text-muted leading-relaxed">
          Makin kecil angka benang (16s), makin tebal kain dan ada tambahan biaya bahan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Pilih ketebalan kain">
          {FABRIC_ROWS.map((r, i) => {
            const aktif = selFabric === i;
            return (
              <button
                key={r.kain}
                type="button"
                onClick={() => setSelFabric(i)}
                aria-pressed={aktif}
                className={`p-3 rounded-xl border text-left transition-all ${
                  aktif
                    ? "bg-brand-accent/10 border-brand-accent shadow-sm"
                    : "bg-surface border-border-subtle hover:border-brand-accent/50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold text-text-primary text-xs font-mono">{r.kain}</span>
                  {aktif && <Check size={14} className="text-brand-accent shrink-0" />}
                </span>
                <span className="block text-[11px] font-mono text-text-muted mt-0.5">{r.gsm}</span>
                <span className="block text-[11px] font-mono font-bold text-brand-accent mt-0.5">{r.tambah}</span>
                <span className="block text-[11px] font-mono text-text-muted">{r.cocok}</span>
              </button>
            );
          })}
        </div>
        <div
          role="status"
          className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/30 font-mono text-xs leading-relaxed"
        >
          Estimasi per lapis dgn kain <strong>{FABRIC_ROWS[selFabric]?.kain}</strong>:{" "}
          {hasil && !overLimit ? (
            <span>
              {fmtRp(hasil.biaya)} (sablon {hasil.tier}) + {fmtRp(FABRIC_SURCHARGE_IDR[selFabric] ?? 0)}{" "}
              (kain) = <strong className="text-brand-accent">{fmtRp(hasil.biaya + (FABRIC_SURCHARGE_IDR[selFabric] ?? 0))}</strong>.
            </span>
          ) : (
            <span>isi ukuran valid (≤ 30 cm) di bagian 1 untuk melihat total.</span>
          )}{" "}
          <span className="text-text-muted">Angka estimasi tampilan. Harga final tetap dari mesin checkout.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <caption className="text-left text-[11px] text-text-muted pb-2 font-bold uppercase">Kain bawaan tiap apparel</caption>
            <thead>
              <tr className="text-left text-text-muted border-b border-border-subtle">
                <th className="py-2 pr-3">Apparel</th>
                <th className="py-2 pr-3">GSM bawaan</th>
                <th className="py-2 text-right tabular-nums">Harga dasar</th>
              </tr>
            </thead>
            <tbody>
              {APPAREL_ORDER.map((a) => (
                <tr key={a} className="border-b border-border-subtle">
                  <td className="py-2 pr-3 font-bold text-text-primary">{APPAREL_CATALOG[a].name}</td>
                  <td className="py-2 pr-3">{APPAREL_CATALOG[a].weightGsm}</td>
                  <td className="py-2 text-right tabular-nums">{fmtRp(APPAREL_CATALOG[a].basePriceIdr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3 — Tabel placement baku */}
      <section aria-label="Tabel placement baku" className="p-5 rounded-2xl bg-surface/60 border border-border-subtle space-y-3">
        <h2 className="font-sans font-bold text-base uppercase">3 · Placement baku (maks cm + tier)</h2>
        <p className="text-xs font-mono text-text-muted leading-relaxed">
          Ukuran maksimum tiap sisi dalam cm (terkalibrasi 1:1 dengan mesin cetak) beserta
          tier-nya. Nama saku (A6) di dada kiri, logo dada (A4), gambar punggung (A3).
        </p>
        {APPAREL_ORDER.map((a) => {
          const spec = APPAREL_PHYSICAL_SPECS[a];
          if (!spec) return null;
          const rows: Array<{ sisi: string; w: number; h: number }> = [
            { sisi: "Dada depan", w: spec.maxFrontWidthCm, h: spec.maxFrontHeightCm },
            { sisi: "Punggung", w: spec.maxBackWidthCm, h: spec.maxBackHeightCm },
            { sisi: "Lengan", w: spec.maxSleeveWidthCm, h: spec.maxSleeveHeightCm },
          ];
          if (spec.maxHoodWidthCm && spec.maxHoodHeightCm) {
            rows.push({ sisi: "Tudung (hoodie)", w: spec.maxHoodWidthCm, h: spec.maxHoodHeightCm });
          }
          return (
            <div key={a} className="overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <caption className="text-left text-[11px] text-brand-accent pb-2 font-bold uppercase">
                  {APPAREL_CATALOG[a].name}
                </caption>
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="py-2 pr-3">Sisi</th>
                    <th className="py-2 pr-3">Maks (cm)</th>
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 text-right tabular-nums">Biaya/lapis</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const t = tierOf(Math.max(r.w, r.h));
                    return (
                      <tr key={r.sisi} className="border-b border-border-subtle">
                        <td className="py-2 pr-3 font-bold text-text-primary">{r.sisi}</td>
                        <td className="py-2 pr-3">{r.w} × {r.h}</td>
                        <td className="py-2 pr-3">{t} · {PRINT_TIER_LABEL[t]}</td>
                        <td className="py-2 text-right tabular-nums">{fmtRp(PRINT_TIER_COST_IDR[t])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        <p className="text-[11px] font-mono text-text-muted leading-relaxed">
          Catatan: hoodie depan maks 28 × 26 cm (terbatas saku kanguru), coach jacket depan
          maks 14 cm per panel (terpisah resleting). Tinggi badan & lebar dada tiap apparel
          tercantum agar ukuran sablon proporsional dengan badan pemakai.
        </p>
      </section>

      {/* 4 — Diskon Grosir DTF & Lusinan (Volume Wholesale) */}
      <section aria-label="Diskon grosir lusinan" className="p-5 sm:p-6 rounded-2xl bg-surface/60 border border-border-subtle space-y-6">
        <div>
          <span className="text-[11px] font-sans text-brand-accent font-bold uppercase tracking-wider block mb-1">
            SSOT PRICING ENGINE // DISKON OTOMATIS
          </span>
          <h2 className="font-sans font-bold text-xl uppercase">4 · Diskon Grosir Sablon & Lusinan</h2>
          <p className="text-xs font-mono text-text-muted mt-1 leading-relaxed">
            Semakin banyak jumlah pesanan kaos/hoodie yang Anda buat, semakin hemat biaya per lembar.
            Diskon volume langsung terpotong otomatis saat checkout.
          </p>
        </div>

        {/* Wholesale Tier Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted font-bold">6 – 12 Pcs</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
                HEMAT 5%
              </span>
            </div>
            <p className="font-sans font-bold text-sm text-text-primary">Lusinan Mini-Bulk</p>
            <p className="font-mono text-[11px] text-text-muted">
              Cocok untuk seragam panitia kecil, tim divisi, atau squad olahraga.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-brand-accent/40 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted font-bold">13 – 50 Pcs</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-brand-accent text-canvas shadow-sm">
                HEMAT 12%
              </span>
            </div>
            <p className="font-sans font-bold text-sm text-text-primary">Komunitas & Kelas</p>
            <p className="font-mono text-[11px] text-text-muted">
              Pilihan terfavorit mahasiswa kampus Makassar, komunitas mobil/motor, dan paguyuban.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted font-bold">&gt; 50 Pcs</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HEMAT 20%
              </span>
            </div>
            <p className="font-sans font-bold text-sm text-text-primary">Partai Besar & Event</p>
            <p className="font-mono text-[11px] text-text-muted">
              Festival kampus, gathering instansi/BUMN, kampanye organisasi, atau merchandise band.
            </p>
          </div>
        </div>

        {/* Interactive Bulk Calculation Simulator */}
        <div className="p-4 rounded-xl bg-surface/80 border border-border-subtle space-y-4">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-brand-accent" />
            <h3 className="font-sans font-bold text-sm uppercase">Simulasi Estimasi Biaya Grosir</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 block">
              <span className="text-[11px] font-sans text-text-muted font-bold uppercase">Jumlah Kaos (Pcs)</span>
              <input
                value={bulkQty}
                onChange={(e) => setBulkQty(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none focus:border-brand-accent"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-[11px] font-sans text-text-muted font-bold uppercase">Jenis Busana</span>
              <select
                value={bulkApparel}
                onChange={(e) => setBulkApparel(e.target.value as ApparelType)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-xs text-text-primary focus:outline-none focus:border-brand-accent"
              >
                {APPAREL_ORDER.map((a) => (
                  <option key={a} value={a}>
                    {APPAREL_CATALOG[a].name} ({fmtRp(APPAREL_CATALOG[a].basePriceIdr)})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-[11px] font-sans text-text-muted font-bold uppercase">Ukuran Sablon DTF</span>
              <select
                value={bulkTier}
                onChange={(e) => setBulkTier(e.target.value as PrintTier)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-xs text-text-primary focus:outline-none focus:border-brand-accent"
              >
                {(Object.keys(PRINT_TIER_COST_IDR) as PrintTier[]).map((t) => (
                  <option key={t} value={t}>
                    {t} - {PRINT_TIER_LABEL[t]} (+{fmtRp(PRINT_TIER_COST_IDR[t])})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Bulk Summary Output */}
          <div className="p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/30 space-y-2 font-mono tabular-nums text-xs">
            <div className="flex justify-between items-center text-text-muted">
              <span>Tier Diskon Aktif:</span>
              <span className="font-sans font-bold text-text-primary">{bulkCalc.tierName}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span>Harga Normal per Pcs:</span>
              <span className="line-through tabular-nums">{fmtRp(bulkCalc.unitBefore)}</span>
            </div>
            <div className="flex justify-between items-center text-brand-accent font-bold">
              <span>Harga Grosir per Pcs ({bulkCalc.discountPct > 0 ? `-${bulkCalc.discountPct}%` : "Normal"}):</span>
              <span className="text-sm tabular-nums">{fmtRp(bulkCalc.unitAfter)}</span>
            </div>
            <div className="pt-2 border-t border-brand-accent/20 flex justify-between items-center text-text-primary font-bold text-sm">
              <span>Total Estimasi ({bulkCalc.qty} Pcs):</span>
              <span className="text-base text-brand-accent tabular-nums">{fmtRp(bulkCalc.totalAfter)}</span>
            </div>
            {bulkCalc.totalSavings > 0 && (
              <p className="text-[11px] text-emerald-400 font-bold text-right">
                ✨ Anda Berhasil Berhemat {fmtRp(bulkCalc.totalSavings)}!
              </p>
            )}
          </div>
        </div>
      </section>


      <footer className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/studio"
          className="flex-1 text-center py-3.5 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all"
        >
          Coba di Studio 3D
        </Link>
        <Link
          href="/catalog"
          className="flex-1 text-center py-3.5 rounded-xl bg-surface border border-border-subtle font-sans font-bold text-xs uppercase tracking-wider hover:border-brand-accent active:scale-[0.98] transition-all"
        >
          Lihat Katalog
        </Link>
      </footer>
    </main>
  );
};
