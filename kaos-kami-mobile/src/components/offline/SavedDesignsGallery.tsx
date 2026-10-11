"use client";

import React, { useState } from 'react';
import { Layers, Share2, Trash2, ArrowUpRight, Plus, Cloud, RefreshCw } from 'lucide-react';
import { GlassCard, HapticButton, Badge } from '@/components/ui';
import { useSavedDesignsStore, SavedDesign } from '@/lib/offline/savedDesignsStore';
import { useMobileStudioStore, sanitizeMobileDecal, ApparelType } from '@/store/useMobileStudioStore';
import { useShallow } from 'zustand/shallow';
import { shareCustomDesign } from '@/lib/bridge/share';
import { removeDecalPxForDesign, getStoredUserId } from '@/lib/offline/persistentKeys';
import { mobileApiClient } from '@/lib/api/mobileApiClient';
import { haptic } from '@/lib/bridge/haptics';

export function SavedDesignsGallery({
  onSelectDesign,
  onNewDesign,
}: {
  onSelectDesign: () => void;
  onNewDesign: () => void;
}) {
  const { designs, deleteDesign, mergeCloudDesigns } = useSavedDesignsStore(
    useShallow((s) => ({
      designs: s.designs,
      deleteDesign: s.deleteDesign,
      mergeCloudDesigns: s.mergeCloudDesigns,
    }))
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleCloudSync = async () => {
    const userId = await getStoredUserId();
    if (!userId) {
      haptic.warning();
      setSyncMessage('Login akun Google terlebih dahulu untuk sinkronisasi draf cloud.');
      setTimeout(() => setSyncMessage(null), 3500);
      return;
    }
    setIsSyncing(true);
    haptic.tap();
    try {
      const res = await mobileApiClient.fetchCloudDesigns(userId);
      if (res.success && Array.isArray(res.designs)) {
        const mapped: SavedDesign[] = res.designs.map((cd: any) => ({
          id: cd.id,
          title: cd.title || 'Desain Kaos Kami',
          apparelType: (cd.apparelSlug === 'longsleeve' ? 'longsleeve' : cd.apparelSlug === 'hoodie' ? 'hoodie' : cd.apparelSlug === 'crewneck' ? 'crewneck' : cd.apparelSlug === 'jacket' ? 'jacket' : 'tshirt') as ApparelType,
          colorHex: cd.colorHex || '#0E0E10',
          colorName: cd.colorName || 'Obsidian Black',
          decalDataUrl: cd.decals?.[0]?.url || null,
          decals: cd.decals || [],
          printWidthCm: cd.decals?.[0]?.scale ? Math.round(cd.decals[0].scale * 100) : 28.0,
          printHeightCm: cd.decals?.[0]?.scale ? Math.round(cd.decals[0].scale * 100) : 22.0,
          savedAt: cd.updatedAt || new Date().toISOString(),
          syncedCloud: true,
        }));
        mergeCloudDesigns(mapped);
        haptic.success();
        setSyncMessage(`Tersinkron ${mapped.length} desain dari akun web.`);
      } else {
        setSyncMessage(res.error || 'Draf lokal sudah terupdate.');
      }
    } catch {
      setSyncMessage('Gagal menghubungi server.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3500);
    }
  };

  const handleDelete = (id: string) => {
    deleteDesign(id);
    try {
      void removeDecalPxForDesign(id);
    } catch {}
  };

  const handleLoadDesign = (design: SavedDesign) => {
    haptic.tapHeavy();
    const st = useMobileStudioStore.getState();
    st.setApparelType(design.apparelType);
    st.setColor(design.colorHex);
    const source =
      Array.isArray(design.decals) && design.decals.length > 0
        ? design.decals
        : design.decalDataUrl
          ? [{ id: `decal-${design.id}`, url: design.decalDataUrl, targetSide: 'front' as const, x: 0, y: 0.04, scale: 0.22, rotation: 0, opacity: 1 }]
          : [];
    st.clearDecals();
    for (const d of source.slice(0, 10)) {
      if (typeof d.url !== 'string' || d.url.length === 0) continue;
      const clean = sanitizeMobileDecal(design.apparelType, d);
      st.addDecal({
        url: clean.url,
        targetSide: clean.targetSide,
        x: clean.x,
        y: clean.y,
        scale: clean.scale,
        rotation: clean.rotation,
        opacity: clean.opacity,
      });
    }
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
          <h3 className="text-sm font-bold text-white font-sans">Draf Desain Tersimpan</h3>
          <p className="text-[11px] text-zinc-400">Tersinkron dengan Web & dapat dibuka offline</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCloudSync}
            disabled={isSyncing}
            title="Sinkronkan Desain dengan Web"
            className="px-2.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#FF6B35]' : 'text-zinc-400'}`} />
            <span>{isSyncing ? 'Sinkron…' : 'Sinkron Cloud'}</span>
          </button>
          <button
            onClick={onNewDesign}
            className="w-8 h-8 rounded-xl bg-[#FF6B35] text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {syncMessage && (
        <p className="text-[10px] text-[#FF6B35] font-mono">{syncMessage}</p>
      )}

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
                  <h4 className="text-xs font-bold text-white truncate font-sans">
                    {design.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {design.apparelType.toUpperCase()} • Sablon {design.printWidthCm}x{design.printHeightCm} cm
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {design.syncedCloud ? (
                      <Badge variant="success" className="text-[9px] py-0 px-1.5 flex items-center gap-0.5">
                        <Cloud className="w-2.5 h-2.5 inline" /> Cloud
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[9px] py-0 px-1.5">
                        Offline HP
                      </Badge>
                    )}
                    {design.isSample && (
                      <Badge variant="neutral" className="text-[9px] py-0 px-1.5">
                        Contoh
                      </Badge>
                    )}
                  </div>
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
                  onClick={() => handleDelete(design.id)}
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
