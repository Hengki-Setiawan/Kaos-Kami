"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ruler, Camera, Layers } from 'lucide-react';
import { MobilePrecisionPanel } from '@/components/pattern';
import { MobileQcPanel } from '@/components/qc';
import { GangSheetViewer } from '@/components/gang';
import { Toast } from '@/components/ui/Toast';
import { NativeHeader } from '@/components/ui/NativeHeader';

/**
 * Rute /workshop — PATTERN (presisi-cm) + QC + GANG mobile.
 * Sengaja rute TERPISAH agar misi ini TANPA menyentuh renderer / gizmo /
 * checkout / admin / TestLab / native config. Pola web yang dicerminkan:
 * PatternStudio (Fabric, magnet-snap, master-registry, gate DPI, tiled A3),
 * QcChecklistPanel (foto 2K→overlay→R2→/api/qc/inspections), gang-pack/export.
 */
export default function MobileWorkshopPage() {
  const [tab, setTab] = useState<'presisi' | 'qc' | 'gang'>('presisi');
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => setToast(m);

  return (
    <div className="flex-1 flex flex-col min-h-dvh bg-canvas text-text-primary select-none">
      <NativeHeader
        title="WORKSHOP HP"
        subtitle="Presisi-cm • QC foto • Gang viewer"
        actions={
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-white flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Studio
          </Link>
        }
      />
      <main className="flex-1 px-4 pt-2 pb-10 space-y-3 max-w-xl w-full mx-auto">
        <div className="flex gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800" role="tablist" aria-label="Workshop HP">
          {(
            [
              { key: 'presisi', label: 'Presisi-cm', icon: Ruler },
              { key: 'qc', label: 'QC Foto', icon: Camera },
              { key: 'gang', label: 'Gang', icon: Layers },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  active ? 'bg-[#FF6B35] text-white' : 'text-zinc-400'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'presisi' && <MobilePrecisionPanel onNotify={notify} />}
        {tab === 'qc' && <MobileQcPanel onNotify={notify} />}
        {tab === 'gang' && <GangSheetViewer onNotify={notify} />}

        <p className="text-[10px] text-zinc-600 leading-relaxed text-center">
          Batas DTF 30.0cm • DPI gate &lt;150 ditolak • master https siap checkout • gang read-only.
        </p>
      </main>
      <Toast show={!!toast} message={toast || ''} onClose={() => setToast(null)} />
    </div>
  );
}
