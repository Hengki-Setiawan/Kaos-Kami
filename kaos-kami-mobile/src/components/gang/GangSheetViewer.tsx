"use client";

import React, { useEffect, useState } from 'react';
import { Layers, Search, RefreshCw } from 'lucide-react';
import { mobileApiClient } from '@/lib/api/mobileApiClient';
import { haptic } from '@/lib/bridge/haptics';

interface GangRow {
  taskId: string;
  orderId: string;
  orderNumber: string;
  stage: string;
  printWidthCm: number;
  printHeightCm: number;
  gangNote: string | null;
  createdAt: string;
}

/**
 * P3 — Gang-sheet VIEWER read-only (daftar task + status, TANPA builder).
 * Cermin pola web gang-pack/export: konsumen mobile WAJIB baca tiles[] bila
 * ada (di sini ditampilkan sebagai catatan [GANG:…] dari ProductionTask.notes
 * via buildGangNote). Tanpa builder, tanpa ekspor PNG, tanpa mutasi —
 * perakitan tiled tetap tugas halaman admin web (client).
 */
export function GangSheetViewer({ onNotify }: { onNotify?: (msg: string) => void }) {
  const [rows, setRows] = useState<GangRow[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const tasks = await mobileApiClient.getGangViewerTasks();
      setRows(tasks);
      setDemo(false);
      if (tasks.length === 0) setMsg('Antrean kosong — belum ada task produksi.');
    } catch (e: any) {
      // Fallback demo lokal yang JUJUR (401 tanpa sesi admin / offline).
      setDemo(true);
      setRows([
        { taskId: 'demo-1', orderId: 'ord-1', orderNumber: '#KK-2026-101', stage: 'PRINTING', printWidthCm: 28.5, printHeightCm: 22, gangNote: '[GANG:demo:M1:12,34]', createdAt: '' },
        { taskId: 'demo-2', orderId: 'ord-2', orderNumber: '#KK-2026-098', stage: 'PRESSING', printWidthCm: 26, printHeightCm: 26, gangNote: null, createdAt: '' },
      ]);
      setMsg('Mode demo lokal (butuh sesi staf / offline). Builder gang-sheet tetap di halaman admin web.');
      onNotify?.('Gang viewer: mode demo (tanpa sesi staf).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter(
    (r) =>
      r.orderNumber.toLowerCase().includes(q.toLowerCase()) ||
      r.stage.toLowerCase().includes(q.toLowerCase()) ||
      (r.gangNote || '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#FF6B35]" /> Gang-Sheet Viewer (read-only)
        </h3>
        <button
          onClick={() => {
            haptic.tap();
            load();
          }}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-50"
          title="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">
        {demo ? '● Mode demo lokal' : '● Live server'} — tanpa builder (buat/rakit lembar di admin web).
      </p>

      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari order / stage / [GANG:…]"
          aria-label="Cari gang task"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-[#FF6B35]"
        />
      </div>

      {msg && <p className="text-[10px] text-zinc-400">{msg}</p>}

      <div className="space-y-2">
        {filtered.length === 0 && !loading && (
          <p className="text-[11px] text-zinc-500 text-center py-4">Tidak ada task yang cocok.</p>
        )}
        {filtered.map((r) => (
          <div key={r.taskId} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono">{r.orderNumber}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30">
                {r.stage}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Sablon {r.printWidthCm}×{r.printHeightCm}cm {r.gangNote ? `• ${r.gangNote}` : '• belum masuk gang'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
