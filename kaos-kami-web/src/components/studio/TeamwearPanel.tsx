"use client";

/**
 * TEAMWEAR / JERSEY REGU (M4.1) — 1 desain studio → tabel roster
 * (nama + nomor + ukuran) → tiap baris jadi 1 item keranjang dengan 2 teks
 * personal punggung (raster via generateTextDecalDataUrl) → checkout normal
 * lewat keranjang (harga FINAL dihitung server, task produksi lahir otomatis
 * per decal saat pembayaran terkonfirmasi).
 */

import React, { useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart, Users, Loader2, Info } from "lucide-react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useCartStore } from "@/store/useCartStore";
import { useShallow } from "zustand/shallow";
import { APPAREL_CATALOG, type DecalLayer } from "@/lib/constants";
import { generateTextDecalDataUrl } from "@/lib/typography/textDecalGenerator";
import { getImageSize, uploadMasterDataUrlToR2 } from "@/lib/imageEditPipeline";
import { materialFinishToPricing } from "@/lib/pricingEngine";
import {
  TEAMWEAR_MAX_ROWS,
  TEAMWEAR_MAX_BASE_DECALS,
  TEAMWEAR_NAME_DECAL,
  TEAMWEAR_NUMBER_DECAL,
  TEAMWEAR_LARGE_DATAURL_CHARS,
  TEAMWEAR_PAYLOAD_GUARD_BYTES,
  estimatePayloadBytes,
  estimateTeamwearPerRowIdr,
  newRosterRow,
  sizesFor,
  validateRosterRow,
  type RosterRow,
} from "@/lib/teamwear";

const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const TeamwearPanel: React.FC = () => {
  const {
    activeApparel,
    selectedColor,
    activeColorName,
    materialFinish,
    baseDecals,
    defaultSize,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      selectedColor: s.selectedColor,
      activeColorName: s.activeColorName,
      materialFinish: s.materialFinish,
      baseDecals: s.decals,
      defaultSize: s.selectedSize,
    }))
  );
  const addItem = useCartStore((s) => s.addItem);

  const sizes = useMemo(() => sizesFor(activeApparel), [activeApparel]);
  const [rows, setRows] = useState<RosterRow[]>(() => [
    { ...newRosterRow("L"), nama: "", nomor: "", size: "L" },
  ]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const apparelInfo = APPAREL_CATALOG[activeApparel];
  const rowErrors = useMemo(
    () => rows.map((r) => validateRosterRow(r, sizes)),
    [rows, sizes]
  );
  const validCount = rowErrors.filter((e) => e === null).length;

  const perRowEstimate = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const r of rows) {
      if (validateRosterRow(r, sizes) !== null) {
        out[r.key] = null;
        continue;
      }
      out[r.key] = estimateTeamwearPerRowIdr({
        apparel: activeApparel,
        colorHex: selectedColor,
        materialFinish,
        size: r.size,
        baseDecals,
        rows,
      });
    }
    return out;
  }, [rows, sizes, activeApparel, selectedColor, materialFinish, baseDecals]);

  const totalEstimate = useMemo(
    () =>
      rows.reduce((a, r) => {
        const v = perRowEstimate[r.key];
        return a + (typeof v === "number" ? v : 0);
      }, 0),
    [rows, perRowEstimate]
  );

  const patchRow = (key: string, patch: Partial<RosterRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleMasukKeranjang = async () => {
    setStatus(null);
    if (baseDecals.length > TEAMWEAR_MAX_BASE_DECALS) {
      setStatus({
        ok: false,
        msg: `Desain dasar punya ${baseDecals.length} lapis sablon, maks ${TEAMWEAR_MAX_BASE_DECALS} agar muat ditambah nama + nomor (batas server 10 lapis per item). Kurangi lapis di tab SABLON dulu.`,
      });
      return;
    }
    const validRows = rows.filter((r) => validateRosterRow(r, sizes) === null);
    if (validRows.length === 0) {
      setStatus({ ok: false, msg: "Belum ada baris valid. Isi nama (maks 24 huruf), nomor (1–2 digit), dan ukuran." });
      return;
    }
    if (validRows.length > TEAMWEAR_MAX_ROWS) {
      setStatus({ ok: false, msg: `Maks ${TEAMWEAR_MAX_ROWS} pemain per pengiriman. Bagi jadi beberapa checkout.` });
      return;
    }
    setBusy(true);
    try {
      // 1. Hosting-kan decal dasar yang besar ke R2 (best-effort, login saja)
      // agar payload checkout massal tetap ringan. Guest → tetap dataURL
      // (server yang mengarsipkan ke R2), dengan guard ukuran di bawah.
      // printPx WAJIB ikut ({...d}) agar aspek server tak fallback 1.0.
      const hostedBase: DecalLayer[] = await Promise.all(
        baseDecals.map(async (d) => {
          if (
            typeof d.url === "string" &&
            d.url.startsWith("data:image") &&
            d.url.length > TEAMWEAR_LARGE_DATAURL_CHARS
          ) {
            const https = await uploadMasterDataUrlToR2(d.url).catch(() => null);
            if (https) return { ...d, url: https };
          }
          return { ...d };
        })
      );

      // 2. Raster teks personal per baris (nama + nomor punggung).
      const batchKey = Date.now().toString(36);
      const built: Array<{ row: RosterRow; decals: DecalLayer[] }> = [];
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]!;
        const nama = row.nama.trim().toUpperCase().slice(0, 24);
        const nomor = row.nomor.trim();
        const [namaUrl, nomorUrl] = await Promise.all([
          generateTextDecalDataUrl({
            text: nama,
            fontFamily: "varsity-college",
            textColor: "#FFFFFF",
            fontSizePx: 88,
          }),
          generateTextDecalDataUrl({
            text: nomor,
            fontFamily: "streetwear-bold",
            textColor: "#FFFFFF",
            fontSizePx: 160,
          }),
        ]);
        if (!namaUrl || !nomorUrl) {
          throw new Error(`Gagal membuat teks personal untuk "${row.nama}". Coba lagi.`);
        }
        const [namaSize, nomorSize] = await Promise.all([
          getImageSize(namaUrl).catch(() => ({ w: 800, h: 200 })),
          getImageSize(nomorUrl).catch(() => ({ w: 400, h: 400 })),
        ]);
        const personal: DecalLayer[] = [
          {
            id: `team-${batchKey}-${i}-nama`,
            url: namaUrl,
            name: `Nama ${nama}`,
            ...TEAMWEAR_NAME_DECAL,
            printPx: { w: namaSize.w, h: namaSize.h },
          },
          {
            id: `team-${batchKey}-${i}-nomor`,
            url: nomorUrl,
            name: `Nomor ${nomor}`,
            ...TEAMWEAR_NUMBER_DECAL,
            printPx: { w: nomorSize.w, h: nomorSize.h },
          },
        ];
        built.push({ row, decals: [...hostedBase, ...personal] });
      }

      // 3. Guard payload <2MB (server 413) sebelum masuk keranjang.
      const probe = built.map((b) => ({
        decals: b.decals,
        title: `Jersey ${b.row.nama}`,
      }));
      if (estimatePayloadBytes(probe) > TEAMWEAR_PAYLOAD_GUARD_BYTES) {
        setStatus({
          ok: false,
          msg: "Ukuran file desain terlalu besar untuk checkout massal. Login agar file di-hosting otomatis, atau kurangi jumlah pemain / kecilkan gambar desain dasar.",
        });
        return;
      }

      // 4. Masuk keranjang massal (tiap baris qty 1; harga tampil = estimasi,
      // FINAL dihitung server saat checkout — klien tak menghitung diskon).
      const mat = materialFinishToPricing(materialFinish);
      const thumb =
        hostedBase.find((d) => d.url.startsWith("http"))?.url ??
        hostedBase[0]?.url ??
        "/lookbook/look-01.jpg";
      built.forEach((b, i) => {
        const est = estimateTeamwearPerRowIdr({
          apparel: activeApparel,
          colorHex: selectedColor,
          materialFinish,
          size: b.row.size,
          baseDecals,
          rows: validRows,
        });
        addItem({
          id: `team-${batchKey}-${i}`,
          name: `Jersey ${b.row.nama.trim()} #${b.row.nomor.trim()}`,
          priceIdr: typeof est === "number" ? est : 0,
          size: b.row.size,
          colorName: activeColorName,
          colorHex: selectedColor,
          image: thumb,
          quantity: 1,
          isCustom: true,
          apparelSlug: activeApparel,
          decals: b.decals,
          teamwearLabel: `${b.row.nama.trim()} #${b.row.nomor.trim()}`,
          materialFinishSlug: materialFinish,
          fabricThicknessSlug: mat.fabricThicknessSlug,
        });
      });
      setStatus({
        ok: true,
        msg: `${built.length} jersey masuk keranjang. Lanjut PROSES CHECKOUT di keranjang — harga final dihitung server & task produksi dibuat otomatis per sablon.`,
      });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Gagal memproses roster. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="p-4 rounded-xl glass-panel border border-border-subtle space-y-2">
        <span className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5">
          <Users size={14} className="text-brand-accent" />
          JERSEY REGU — 1 DESAIN, BANYAK NAMA
        </span>
        <p className="text-[11px] font-mono text-text-muted leading-relaxed">
          Desain aktif: <strong className="text-text-primary">{apparelInfo.name}</strong> ·{" "}
          {activeColorName} · {baseDecals.length} lapis sablon (depan). Tiap baris roster
          ditambah <strong className="text-text-primary">nama + nomor di punggung</strong> lalu
          masuk keranjang sebagai item terpisah.
        </p>
        <p className="text-[10px] font-mono text-text-muted leading-relaxed flex gap-1">
          <Info size={12} className="shrink-0 mt-0.5" />
          <span>Harga di bawah estimasi tampil; final dihitung server saat checkout (termasuk diskon volume bila memenuhi syarat).</span>
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r, idx) => {
          const err = rowErrors[idx];
          return (
            <div key={r.key} className="p-3 rounded-xl bg-surface/70 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-text-muted">PEMAIN {idx + 1}</span>
                <button
                  onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== r.key) : prev))}
                  disabled={rows.length <= 1}
                  aria-label={`Hapus baris pemain ${idx + 1}`}
                  className="p-2 rounded-lg text-text-muted hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <input
                  value={r.nama}
                  onChange={(e) => patchRow(r.key, { nama: e.target.value })}
                  placeholder="Nama (mis. HENGKI)"
                  maxLength={24}
                  aria-label={`Nama pemain ${idx + 1}`}
                  className="col-span-3 px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
                />
                <input
                  value={r.nomor}
                  onChange={(e) => patchRow(r.key, { nomor: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })}
                  placeholder="No"
                  inputMode="numeric"
                  aria-label={`Nomor pemain ${idx + 1}`}
                  className="col-span-1 px-2 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-white text-center placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
                />
                <select
                  value={r.size}
                  onChange={(e) => patchRow(r.key, { size: e.target.value })}
                  aria-label={`Ukuran pemain ${idx + 1}`}
                  className="col-span-1 px-1 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-white focus:outline-none focus:border-brand-accent"
                >
                  {sizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {err ? (
                <p className="text-[10px] font-mono text-amber-400" role="status">{err}</p>
              ) : (
                <p className="text-[10px] font-mono text-text-muted">
                  Estimasi: <strong className="text-brand-accent">
                    {typeof perRowEstimate[r.key] === "number" ? fmtRp(perRowEstimate[r.key] as number) : "—"}
                  </strong>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          setStatus(null);
          setRows((prev) =>
            prev.length >= TEAMWEAR_MAX_ROWS
              ? prev
              : [...prev, newRosterRow(sizes.includes(defaultSize) ? defaultSize : sizes[0] ?? "L")]
          );
        }}
        disabled={rows.length >= TEAMWEAR_MAX_ROWS}
        className="w-full py-2.5 rounded-xl bg-surface border border-dashed border-white/15 text-xs font-mono font-bold text-text-muted hover:text-white hover:border-brand-accent transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> TAMBAH BARIS ({rows.length}/{TEAMWEAR_MAX_ROWS})
      </button>

      {status && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-[11px] font-mono font-bold leading-relaxed ${
            status.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          {status.msg}
        </div>
      )}

      <button
        onClick={() => void handleMasukKeranjang()}
        disabled={busy || validCount === 0}
        className="w-full py-3.5 rounded-xl bg-brand-accent text-canvas font-display font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(230,81,0,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
        <span>{busy ? "MEMBUAT TEKS PERSONAL…" : `MASUK KERANJANG (${validCount} JERSEY)`}</span>
      </button>
      {totalEstimate > 0 && (
        <p className="text-center text-[11px] font-mono text-text-muted">
          Estimasi total tampil: <strong className="text-white">{fmtRp(totalEstimate)}</strong> (final di server)
        </p>
      )}
    </div>
  );
};
