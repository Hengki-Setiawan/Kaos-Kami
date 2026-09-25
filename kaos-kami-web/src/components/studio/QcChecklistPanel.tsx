"use client";

import React, { useState } from "react";

export type QcDefect = "LUBANG" | "NODA" | "MISPRINT" | "CRACKING";
export type QcGrazingDeg = 15 | 30 | 45 | 90;

interface QcChecklistPanelProps {
  orderId?: string;
  productionTaskId?: string;
  onSaved?: (row: unknown) => void;
}

const DEFECT_LABELS: { id: QcDefect; label: string }[] = [
  { id: "LUBANG", label: "Lubang / bolong" },
  { id: "NODA", label: "Noda / kotor" },
  { id: "MISPRINT", label: "Misprint / gagal cetak" },
  { id: "CRACKING", label: "Cracking / sablon pecah" },
];

const GRAZING_PRESETS: QcGrazingDeg[] = [15, 30, 45, 90];

type Status = { kind: "idle" | "loading" | "success" | "error"; message: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal membaca hasil ekspor mockup"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gagal mengompres foto QC ke PNG"));
    }, "image/png");
  });
}

/**
 * Panel checklist QC: ekspor mockup 3D (PNG 2K) → overlay info QC di
 * canvas 2D → upload R2 → simpan jejak inspeksi. Bahasa Indonesia,
 * status sukses/gagal selalu jujur (tak ada demo diam-diam).
 */
export default function QcChecklistPanel({
  orderId,
  productionTaskId,
  onSaved,
}: QcChecklistPanelProps) {
  const [grazing, setGrazing] = useState<QcGrazingDeg>(45);
  const [lux, setLux] = useState<string>("500");
  const [side, setSide] = useState<string>("front");
  const [checks, setChecks] = useState<QcDefect[]>([]);
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });

  const loading = status.kind === "loading";

  const toggleCheck = (d: QcDefect) =>
    setChecks((prev) =>
      prev.includes(d) ? prev.filter((c) => c !== d) : [...prev, d],
    );

  const handleSave = async () => {
    if (!orderId) {
      setStatus({
        kind: "error",
        message: "Order belum dipilih — foto QC butuh orderId.",
      });
      return;
    }
    const luxNum = Number(lux);
    if (!Number.isInteger(luxNum) || luxNum < 0 || luxNum > 100000) {
      setStatus({
        kind: "error",
        message: "Estimasi lux harus angka bulat 0–100000.",
      });
      return;
    }
    if (note.length > 500) {
      setStatus({
        kind: "error",
        message: "Catatan maks 500 karakter.",
      });
      return;
    }

    setStatus({ kind: "loading", message: "Mengekspor mockup 3D…" });
    try {
      // 1) Ekspor mockup resolusi tinggi dari canvas WebGL studio.
      const canvas = document.querySelector(
        ".webgl-canvas-container canvas",
      ) as any;
      if (!canvas || typeof canvas.exportMockup !== "function") {
        throw new Error(
          "Canvas 3D tidak ditemukan — buka halaman studio 3D dulu lalu coba lagi.",
        );
      }
      const dataUrl: string = await canvas.exportMockup({ resolution: "2k" });
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
        throw new Error("Ekspor mockup gagal — coba lagi.");
      }

      // 2) Overlay 2D: preset grazing / lux / sisi / checklist / order / waktu.
      setStatus({ kind: "loading", message: "Menempel info QC ke foto…" });
      const img = await loadImage(dataUrl);
      const c2d = document.createElement("canvas");
      c2d.width = img.naturalWidth || img.width;
      c2d.height = img.naturalHeight || img.height;
      const ctx = c2d.getContext("2d");
      if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
      ctx.drawImage(img, 0, 0, c2d.width, c2d.height);

      const stamp = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const cekLine =
        checks.length === 0 ? "LOLOS (tanpa cacat)" : checks.join(", ");
      const lines = [
        `QC • ${orderId} • sisi ${side} • grazing ${grazing}° • ~${luxNum} lux`,
        `Cek: ${cekLine}`,
        note ? `Catatan: ${note.slice(0, 90)}` : "",
        stamp,
      ].filter(Boolean);

      const fontPx = Math.max(22, Math.round(c2d.width / 60));
      ctx.font = `bold ${fontPx}px monospace`;
      const lineH = fontPx * 1.5;
      const pad = fontPx * 0.8;
      const barH = lines.length * lineH + pad * 2;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, c2d.height - barH, c2d.width, barH);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      lines.forEach((ln, i) =>
        ctx.fillText(ln, pad, c2d.height - barH + pad + i * lineH),
      );

      // 3) Upload PNG hasil overlay ke R2 (pola upload yang ada).
      setStatus({ kind: "loading", message: "Mengunggah foto QC…" });
      const blob = await canvasToBlob(c2d);
      const form = new FormData();
      form.append(
        "file",
        new File([blob], `qc-${orderId}-${Date.now()}.png`, {
          type: "image/png",
        }),
      );
      const upRes = await fetch("/api/upload/r2", {
        method: "POST",
        body: form,
      });
      const upData = await upRes.json().catch(() => null);
      if (!upRes.ok || !upData?.success || !upData?.url) {
        throw new Error(upData?.error || `Upload gagal (${upRes.status}).`);
      }

      // 4) Simpan jejak inspeksi.
      setStatus({ kind: "loading", message: "Menyimpan jejak QC…" });
      const saveRes = await fetch("/api/qc/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          productionTaskId,
          photoUrl: upData.url,
          grazingDeg: grazing,
          luxEstimate: luxNum,
          side,
          checks,
          note: note || undefined,
        }),
      });
      const saveData = await saveRes.json().catch(() => null);
      if (!saveRes.ok || !saveData?.success) {
        throw new Error(saveData?.error || `Simpan gagal (${saveRes.status}).`);
      }

      setStatus({
        kind: "success",
        message: "Foto QC tersimpan ke jejak order.",
      });
      onSaved?.(saveData.data);
    } catch (e: any) {
      setStatus({
        kind: "error",
        message: e?.message || "Gagal menyimpan foto QC.",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4 space-y-4 font-mono text-xs">
      <div className="font-bold text-text-primary uppercase tracking-wider">
        Checklist QC — Foto Mockup
      </div>

      {/* Preset sudut grazing */}
      <div className="space-y-1.5">
        <span className="block text-text-muted">Sudut cahaya grazing:</span>
        <div className="flex flex-wrap gap-1.5">
          {GRAZING_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={loading}
              onClick={() => setGrazing(p)}
              aria-pressed={grazing === p}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                grazing === p
                  ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                  : "border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              {p}°
            </button>
          ))}
        </div>
      </div>

      {/* Lux + sisi */}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="block text-text-muted">Estimasi lux:</span>
          <input
            type="number"
            min={0}
            max={100000}
            value={lux}
            disabled={loading}
            onChange={(e) => setLux(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent"
          />
        </label>
        <label className="space-y-1 block">
          <span className="block text-text-muted">Sisi:</span>
          <select
            value={side}
            disabled={loading}
            onChange={(e) => setSide(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-brand-accent"
          >
            <option value="front">Depan</option>
            <option value="back">Belakang</option>
          </select>
        </label>
      </div>

      {/* Checklist cacat */}
      <fieldset className="space-y-1.5">
        <legend className="text-text-muted">
          Cacat ditemukan (kosong = lolos):
        </legend>
        {DEFECT_LABELS.map((d) => (
          <label
            key={d.id}
            className="flex items-center gap-2 cursor-pointer text-text-primary"
          >
            <input
              type="checkbox"
              checked={checks.includes(d.id)}
              disabled={loading}
              onChange={() => toggleCheck(d.id)}
              className="w-4 h-4 accent-current"
            />
            <span>
              <span className="font-bold">{d.id}</span>
              <span className="text-text-muted"> — {d.label}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* Catatan */}
      <label className="space-y-1 block">
        <span className="block text-text-muted">
          Catatan operator (maks 500):
        </span>
        <textarea
          value={note}
          disabled={loading}
          maxLength={500}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder="cth: tepi sablon rata, warna sesuai mockup"
          className="w-full px-3 py-2 rounded-xl bg-surface border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent"
        />
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
      >
        {loading ? "Menyimpan…" : "Simpan Foto QC (PNG 2K)"}
      </button>

      {status.kind !== "idle" && (
        <div
          role={status.kind === "error" ? "alert" : "status"}
          className={`p-3 rounded-xl border font-mono text-xs ${
            status.kind === "success"
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              : status.kind === "error"
                ? "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300"
                : "bg-brand-accent/10 border-brand-accent/40 text-text-primary"
          }`}
        >
          {status.kind === "loading" ? "⏳ " : status.kind === "success" ? "✅ " : "⚠️ "}
          {status.message}
        </div>
      )}
    </div>
  );
}
