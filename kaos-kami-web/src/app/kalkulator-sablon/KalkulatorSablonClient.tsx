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

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/** Surcharge ketebalan kain (Blueprint 01 §10 — sama dengan pricingEngine). */
const FABRIC_ROWS: Array<{ kain: string; gsm: string; tambah: string; cocok: string }> = [
  { kain: "Combed 30s", gsm: "±150 GSM, tipis adem", tambah: "+Rp 0", cocok: "Coach jacket (poplin ringan)" },
  { kain: "Combed 24s", gsm: "±180 GSM, standar distro", tambah: "+Rp 10.000", cocok: "Kaos & longsleeve harian" },
  { kain: "Combed 20s", gsm: "±210 GSM, tebal", tambah: "+Rp 15.000", cocok: "Kaos heavyweight premium" },
  { kain: "Combed 16s", gsm: "240–280 GSM, sangat tebal", tambah: "+Rp 25.000", cocok: "Booxy tee flagship" },
  { kain: "French Terry 380", gsm: "330–380 GSM fleece", tambah: "+Rp 0", cocok: "Crewneck & hoodie" },
];

const APPAREL_ORDER: ApparelType[] = ["tshirt", "longsleeve", "crewneck", "hoodie", "shirt"];

function tierOf(maxCm: number): PrintTier {
  return classifyPrintTierByCm(maxCm);
}

export const KalkulatorSablonClient: React.FC = () => {
  const [lebar, setLebar] = useState("21");
  const [tinggi, setTinggi] = useState("29");

  const hasil = useMemo(() => {
    const w = Number(String(lebar).replace(",", "."));
    const h = Number(String(tinggi).replace(",", "."));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const maks = Math.max(w, h);
    const tier = tierOf(maks);
    return { w, h, maks, tier, biaya: PRINT_TIER_COST_IDR[tier], label: PRINT_TIER_LABEL[tier] };
  }, [lebar, tinggi]);

  const overLimit = hasil !== null && hasil.maks > 30;

  return (
    <main className="min-h-screen bg-canvas text-text-primary px-5 sm:px-10 py-10 max-w-4xl mx-auto space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-mono tracking-widest text-brand-accent font-bold uppercase">
          Kaos Kami Makassar — Panduan Sablon DTF
        </p>
        <h1 className="font-display font-black text-2xl sm:text-3xl uppercase">
          Kalkulator Sablon: Ukuran, GSM & Placement
        </h1>
        <p className="text-sm font-mono text-text-muted leading-relaxed">
          Semua angka di halaman ini dihitung dari standar produksi yang sama dengan mesin
          harga checkout: lebar cetak maks <strong className="text-text-primary">30 cm</strong> (batas
          printhead DTF), tier A6–A3, dan berat kain GSM per apparel.
        </p>
      </header>

      {/* 1 — Kalkulator ukuran print */}
      <section aria-label="Kalkulator ukuran print" className="p-5 rounded-2xl bg-surface/60 border border-border-subtle space-y-4">
        <h2 className="font-display font-black text-base uppercase">1 · Berapa tier desainmu?</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-[11px] font-mono text-text-muted font-bold uppercase">Lebar (cm)</span>
            <input
              value={lebar}
              onChange={(e) => setLebar(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
              inputMode="decimal"
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none focus:border-brand-accent"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-[11px] font-mono text-text-muted font-bold uppercase">Tinggi (cm)</span>
            <input
              value={tinggi}
              onChange={(e) => setTinggi(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
              inputMode="decimal"
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none focus:border-brand-accent"
            />
          </label>
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
          <table className="w-full text-xs font-mono">
            <caption className="text-left text-[11px] text-text-muted pb-2 font-bold uppercase">Tabel tier baku</caption>
            <thead>
              <tr className="text-left text-text-muted border-b border-border-subtle">
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Sisi maks</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 text-right">Biaya/lapis</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PRINT_TIER_COST_IDR) as PrintTier[]).map((t) => (
                <tr key={t} className={`border-b border-border-subtle ${hasil?.tier === t ? "text-brand-accent font-bold" : ""}`}>
                  <td className="py-2 pr-3">{t}</td>
                  <td className="py-2 pr-3">{t === "A6" ? "≤ 10 cm" : t === "A5" ? "≤ 15 cm" : t === "A4" ? "≤ 25 cm" : "≤ 30 cm"}</td>
                  <td className="py-2 pr-3">{PRINT_TIER_LABEL[t]}</td>
                  <td className="py-2 text-right">{fmtRp(PRINT_TIER_COST_IDR[t])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2 — Tabel GSM */}
      <section aria-label="Tabel kain GSM" className="p-5 rounded-2xl bg-surface/60 border border-border-subtle space-y-3">
        <h2 className="font-display font-black text-base uppercase">2 · Pilih ketebalan kain (GSM)</h2>
        <p className="text-xs font-mono text-text-muted leading-relaxed">
          Makin kecil angka benang (16s), makin tebal kain dan ada tambahan biaya bahan.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-text-muted border-b border-border-subtle">
                <th className="py-2 pr-3">Kain</th>
                <th className="py-2 pr-3">Ketebalan</th>
                <th className="py-2 pr-3">Tambahan</th>
                <th className="py-2">Cocok untuk</th>
              </tr>
            </thead>
            <tbody>
              {FABRIC_ROWS.map((r) => (
                <tr key={r.kain} className="border-b border-border-subtle">
                  <td className="py-2 pr-3 font-bold text-text-primary">{r.kain}</td>
                  <td className="py-2 pr-3">{r.gsm}</td>
                  <td className="py-2 pr-3 text-brand-accent font-bold">{r.tambah}</td>
                  <td className="py-2">{r.cocok}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <caption className="text-left text-[11px] text-text-muted pb-2 font-bold uppercase">Kain bawaan tiap apparel</caption>
            <thead>
              <tr className="text-left text-text-muted border-b border-border-subtle">
                <th className="py-2 pr-3">Apparel</th>
                <th className="py-2 pr-3">GSM bawaan</th>
                <th className="py-2 text-right">Harga dasar</th>
              </tr>
            </thead>
            <tbody>
              {APPAREL_ORDER.map((a) => (
                <tr key={a} className="border-b border-border-subtle">
                  <td className="py-2 pr-3 font-bold text-text-primary">{APPAREL_CATALOG[a].name}</td>
                  <td className="py-2 pr-3">{APPAREL_CATALOG[a].weightGsm}</td>
                  <td className="py-2 text-right">{fmtRp(APPAREL_CATALOG[a].basePriceIdr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3 — Tabel placement baku */}
      <section aria-label="Tabel placement baku" className="p-5 rounded-2xl bg-surface/60 border border-border-subtle space-y-3">
        <h2 className="font-display font-black text-base uppercase">3 · Placement baku (maks cm + tier)</h2>
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
              <table className="w-full text-xs font-mono">
                <caption className="text-left text-[11px] text-brand-accent pb-2 font-bold uppercase">
                  {APPAREL_CATALOG[a].name}
                </caption>
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="py-2 pr-3">Sisi</th>
                    <th className="py-2 pr-3">Maks (cm)</th>
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 text-right">Biaya/lapis</th>
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
                        <td className="py-2 text-right">{fmtRp(PRINT_TIER_COST_IDR[t])}</td>
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

      <footer className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/studio"
          className="flex-1 text-center py-3.5 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all"
        >
          Coba di Studio 3D
        </Link>
        <Link
          href="/catalog"
          className="flex-1 text-center py-3.5 rounded-xl bg-surface border border-border-subtle font-display font-black text-xs uppercase tracking-wider hover:border-brand-accent transition-all"
        >
          Lihat Katalog
        </Link>
      </footer>
    </main>
  );
};
