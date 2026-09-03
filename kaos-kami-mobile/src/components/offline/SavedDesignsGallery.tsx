"use client";

import React from 'react';
import { Layers, Share2, Trash2, ArrowUpRight, Plus } from 'lucide-react';
import { GlassCard, HapticButton, Badge } from '@/components/ui';
import { useSavedDesignsStore, SavedDesign } from '@/lib/offline/savedDesignsStore';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { shareCustomDesign } from '@/lib/bridge/share';
import { haptic } from '@/lib/bridge/haptics';

export function SavedDesignsGallery({
  onSelectDesign,
  onNewDesign,
}: {
  onSelectDesign: () => void;
  onNewDesign: () => void;
}) {
  const { designs, deleteDesign } = useSavedDesignsStore();
  const { setApparelType, setColor, setDecalUrl } = useMobileStudioStore();

  const handleLoadDesign = (design: SavedDesign) => {
    haptic.tapHeavy();
    setApparelType(design.apparelType);
    setColor(design.colorHex);
    setDecalUrl(design.decalDataUrl);
    onSelectDesign();
  };

  const handleShare = (design: SavedDesign) => {
    haptic.tap();
    shareCustomDesign(design.id, design.title);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-['Syne']">Galeri Desain Offline</h3>
          <p className="text-[11px] text-zinc-400">Tersimpan di memori HP, dapat dibuka tanpa internet</p>
        </div>
        <button
          onClick={onNewDesign}
          className="w-8 h-8 rounded-xl bg-[#FF6B35] text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {designs.length === 0 ? (
        <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-zinc-500 text-xs">
          Belum ada desain tersimpan. Buat desain pertama Anda di Studio 3D!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {designs.map((design) => (
            <GlassCard key={design.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl border flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: design.colorHex }}
                >
                  <Layers className="w-5 h-5 text-white/40" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate font-['Syne']">
                    {design.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {design.apparelType.toUpperCase()} • Sablon {design.printWidthCm}x{design.printHeightCm} cm
                  </p>
                  <Badge variant="neutral" className="mt-1 text-[9px] py-0 px-1.5">
                    Offline Ready
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleShare(design)}
                  title="Bagikan"
                  className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center active:scale-90"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => deleteDesign(design.id)}
                  title="Hapus"
                  className="w-8 h-8 rounded-xl bg-zinc-800 text-red-400 hover:text-red-300 flex items-center justify-center active:scale-90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <HapticButton
                  variant="primary"
                  onClick={() => handleLoadDesign(design)}
                  className="px-3 py-1.5 text-xs font-semibold"
                >
                  <span>Buka 3D</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </HapticButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
