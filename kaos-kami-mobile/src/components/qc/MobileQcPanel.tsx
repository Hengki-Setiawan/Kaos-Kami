"use client";

import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { mobileApiClient } from '@/lib/api/mobileApiClient';
import { overlayQcInfo } from '@/lib/qc/qcOverlay';
import { haptic } from '@/lib/bridge/haptics';

export type QcDefect = 'LUBANG' | 'NODA' | 'MISPRINT' | 'CRACKING';
export type QcGrazingDeg = 15 | 30 | 45 | 90;

const DEFECT_LABELS: Array<{ id: QcDefect; label: string }> = [
  { id: 'LUBANG', label: 'Lubang / bolong' },
  { id: 'NODA', label: 'Noda / kotor' },
  { id: 'MISPRINT', label: 'Misprint / gagal cetak' },
  { id: 'CRACKING', label: 'Cracking / sablon pecah' },
];

const GRAZING_PRESETS: QcGrazingDeg[] = [15, 30, 45, 90];

type Status = { kind: 'idle' | 'loading' | 'success' | 'error'; message: string };

/**
 * P3 — QC mobile: foto via kamera → overlay sederhana (teks/graffiti) →
 * upload R2 (endpoint existing) → POST /api/qc/inspections dari HP.
 * Kontrak web dibaca dari kaos-kami-web/src/app/api/qc/inspections/route.ts:
 * orderId* + photoUrl https* + grazing/lux/side/checks/note. RBAC staf —
 * 401/403 dilaporkan jujur (tanpa klaim tersimpan).
 * FOLLOW-UP graffiti jari: saat ini teks overlay (bukan coret bebas) —
 * freehand butuh kanvas sentuh penuh (misi lanjutan).
 */
export function MobileQcPanel({
  initialOrderId = '',
  onSaved,
  onNotify,
}: {
  initialOrderId?: string;
  onSaved?: (row: unknown) => void;
  onNotify?: (msg: string) => void;
}) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [productionTaskId, setProductionTaskId] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [grazing, setGrazing] = useState<QcGrazingDeg>(45);
  const [lux, setLux] = useState('500');
  const [side, setSide] = useState('front');
  const [checks, setChecks] = useState<QcDefect[]>([]);
  const [note, setNote] = useState('');
  const [graffiti, setGraffiti] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle', message: '' });
  const loading = status.kind === 'loading';

  const toggleCheck = (d: QcDefect) =>
    setChecks((prev) => (prev.includes(d) ? prev.filter((c) => c !== d) : [...prev, d]));

  const takePhoto = async () => {
    haptic.tapMedium();
    try {
      const { pickOrCaptureDecalImage } = await import('@/lib/bridge/camera');
      const url = await pickOrCaptureDecalImage();
      if (url) {
        setPhoto(url);
        setStatus({ kind: 'idle', message: '' });
        onNotify?.('Foto QC siap — tambah overlay lalu simpan.');
      }
    } catch (e: any) {
      setStatus({ kind: 'error', message: e?.message || 'Kamera gagal dibuka.' });
    }
  };

  const save = async () => {
    if (!orderId.trim()) {
      setStatus({ kind: 'error', message: 'Order belum diisi — foto QC butuh orderId.' });
      return;
    }
    if (!photo) {
      setStatus({ kind: 'error', message: 'Ambil foto dulu via kamera.' });
      return;
    }
    const luxNum = Number(lux);
    if (!Number.isInteger(luxNum) || luxNum < 0 || luxNum > 100000) {
      setStatus({ kind: 'error', message: 'Estimasi lux harus angka bulat 0–100000.' });
      return;
    }
    if (note.length > 500) {
      setStatus({ kind: 'error', message: 'Catatan maks 500 karakter.' });
      return;
    }
    setStatus({ kind: 'loading', message: 'Menempel info QC ke foto…' });
    try {
      const stamp = new Date().toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      const cekLine = checks.length === 0 ? 'LOLOS (tanpa cacat)' : checks.join(', ');
      const blob = await overlayQcInfo(photo, {
        lines: [
          `QC • ${orderId.trim()} • sisi ${side} • grazing ${grazing}° • ~${luxNum} lux`,
          `Cek: ${cekLine}`,
          note ? `Catatan: ${note.slice(0, 90)}` : '',
          stamp,
        ].filter(Boolean),
        graffiti,
      });

      setStatus({ kind: 'loading', message: 'Mengunggah foto QC…' });
      const up = await mobileApiClient.uploadQcPhoto(blob, `qc-${orderId.trim()}-${Date.now()}.png`);
      if (!up.ok || !up.url) throw new Error(up.error || 'Upload gagal.');

      setStatus({ kind: 'loading', message: 'Menyimpan jejak QC…' });
      const saveRes = await mobileApiClient.postQcInspection({
        orderId: orderId.trim(),
        productionTaskId: productionTaskId.trim() || undefined,
        photoUrl: up.url,
        grazingDeg: grazing,
        luxEstimate: luxNum,
        side,
        checks,
        note: note || undefined,
      });
      if (!saveRes.ok) throw new Error(saveRes.error || 'Simpan gagal.');
      haptic.success();
      setStatus({ kind: 'success', message: 'Foto QC tersimpan ke jejak order.' });
      onNotify?.('Foto QC tersimpan ke jejak order.');
      onSaved?.(saveRes.data);
    } catch (e: any) {
      haptic.error();
      setStatus({ kind: 'error', message: e?.message || 'Gagal menyimpan foto QC.' });
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
        <Camera className="w-4 h-4 text-[#FF6B35]" /> QC Mobile — Foto → Overlay → Jejak
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Order ID*</span>
          <input
            value={orderId}
            disabled={loading}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="cth: ord-123"
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Task ID (opsional)</span>
          <input
            value={productionTaskId}
            disabled={loading}
            onChange={(e) => setProductionTaskId(e.target.value)}
            placeholder="productionTaskId"
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          />
        </label>
      </div>

      <button
        onClick={takePhoto}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Camera className="w-4 h-4" /> {photo ? 'Ambil Ulang Foto' : 'Ambil Foto via Kamera'}
      </button>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Foto QC" className="w-full rounded-xl border border-zinc-700 max-h-56 object-contain bg-black" />
      )}

      <div className="space-y-1.5">
        <span className="block text-[10px] text-zinc-400">Sudut cahaya grazing:</span>
        <div className="flex gap-1.5">
          {GRAZING_PRESETS.map((p) => (
            <button
              key={p}
              disabled={loading}
              onClick={() => setGrazing(p)}
              aria-pressed={grazing === p}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold ${grazing === p ? 'bg-[#FF6B35]/20 border-[#FF6B35] text-[#FF6B35]' : 'border-zinc-700 text-zinc-400'}`}
            >
              {p}°
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Estimasi lux:</span>
          <input
            type="number"
            min={0}
            max={100000}
            value={lux}
            disabled={loading}
            onChange={(e) => setLux(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] text-zinc-400">Sisi:</span>
          <select
            value={side}
            disabled={loading}
            onChange={(e) => setSide(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
          >
            <option value="front">Depan</option>
            <option value="back">Belakang</option>
          </select>
        </label>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-[10px] text-zinc-400">Cacat ditemukan (kosong = lolos):</legend>
        {DEFECT_LABELS.map((d) => (
          <label key={d.id} className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input type="checkbox" checked={checks.includes(d.id)} disabled={loading} onChange={() => toggleCheck(d.id)} className="w-4 h-4" />
            <span><span className="font-bold">{d.id}</span> <span className="text-zinc-400">— {d.label}</span></span>
          </label>
        ))}
      </fieldset>

      <label className="space-y-1 block">
        <span className="text-[10px] text-zinc-400">Teks overlay/graffiti (opsional, maks 120):</span>
        <input
          value={graffiti}
          disabled={loading}
          maxLength={120}
          onChange={(e) => setGraffiti(e.target.value)}
          placeholder="cth: NODA di lengan kiri!"
          className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-[10px] text-zinc-400">Catatan operator (maks 500):</span>
        <textarea
          value={note}
          disabled={loading}
          maxLength={500}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder="cth: tepi sablon rata, warna sesuai mockup"
          className="w-full px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
        />
      </label>

      <button
        onClick={save}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Upload className="w-4 h-4" /> {loading ? 'Menyimpan…' : 'Simpan Foto QC'}
      </button>

      {status.kind !== 'idle' && (
        <div
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-1.5 ${
            status.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : status.kind === 'error'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-[#FF6B35]/10 border-[#FF6B35]/40 text-zinc-200'
          }`}
        >
          {status.kind === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : status.kind === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : null}
          <span>{status.kind === 'loading' ? `⏳ ${status.message}` : status.message}</span>
        </div>
      )}
    </div>
  );
}
