"use client";

import React from 'react';
import {
  Activity,
  Flashlight,
  Wind,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  useMobileStudioStore,
  type SpecialInkEffect,
  type StretchDirection,
  type TestLabMode,
  type WindDirection,
} from '@/store/useMobileStudioStore';
import { useMobileDeviceTier } from '@/hooks/useMobileDeviceTier';
import { useShallow } from 'zustand/shallow';
import { haptic } from '@/lib/bridge/haptics';
import {
  U_MAX_ELONG,
  elongationPercent,
  recoveryEstimate,
} from '@/lib/3d/stretchPhysics';

// Telemetri CFM KONSTANTA: mobile tak punya materialFinish (pilihan kain web),
// jadi permeabilitas memakai default Katun Combed 24s cermin web (98 CFM).
const MOBILE_FABRIC_BREATHABILITY = { cfm: 98, desc: 'Katun Combed 24s (Sangat Sejuk & Bernapas)' };

/**
 * F3 Test Lab — panel kontrol BottomSheet (cermin web TestLabControls).
 * Tab 4 mode + slider rentang cermin web (tarik 0–1/0.02, fokus 0.18–0.75/0.03,
 * angin 0–100/5) + telemetri beban N + CFM konstanta.
 * Commit store HANYA dari slider/preset/mode (diskrit); drag kanvas & spring
 * memakai tulis-langsung ref (MobileStretchController) tanpa set-store per-frame.
 */
export function MobileTestLabControls() {
  const {
    testLabMode,
    setTestLabMode,
    specialInkEffect,
    setSpecialInkEffect,
    windTunnelSpeed,
    setWindTunnelSpeed,
    windDirection,
    setWindDirection,
    stretchIntensity,
    setStretchIntensity,
    stretchDirection,
    setStretchDirection,
    flashlightFocus,
    setFlashlightFocus,
    setActiveAnimation,
  } = useMobileStudioStore(
    useShallow((s) => ({
      testLabMode: s.testLabMode,
      setTestLabMode: s.setTestLabMode,
      specialInkEffect: s.specialInkEffect,
      setSpecialInkEffect: s.setSpecialInkEffect,
      windTunnelSpeed: s.windTunnelSpeed,
      setWindTunnelSpeed: s.setWindTunnelSpeed,
      windDirection: s.windDirection,
      setWindDirection: s.setWindDirection,
      stretchIntensity: s.stretchIntensity,
      setStretchIntensity: s.setStretchIntensity,
      stretchDirection: s.stretchDirection,
      setStretchDirection: s.setStretchDirection,
      flashlightFocus: s.flashlightFocus,
      setFlashlightFocus: s.setFlashlightFocus,
      setActiveAnimation: s.setActiveAnimation,
    }))
  );

  const { tier } = useMobileDeviceTier();
  // GATING senter: goldfoil/holo disembunyikan di low (bayangan tetap mati di
  // low via MobileStudioLighting shadows per-tier).
  const allowFancyInk = tier === 'high' || tier === 'mid';

  const handleSelectMode = (mode: TestLabMode) => {
    try {
      haptic.selection();
    } catch {}
    setTestLabMode(mode);
    if (mode === 'windtunnel') {
      // Kopling speed/35 → waving (cermin web setAnimationPreset wind + speed).
      setActiveAnimation('waving');
    } else if (mode === 'none') {
      setActiveAnimation('none');
      setStretchIntensity(0);
    } else {
      setActiveAnimation('none');
    }
  };

  const stretchPercentage = Math.round(stretchIntensity * 100);
  // Telemetri jujur (tiru web TestLabControls): elongasi/recovery dari SSOT
  // stretchPhysics — BUKAN tensile N/cm² lab. Recovery = estimasi visual
  // D2594: 96 - 14*intensity.
  const elongationPct = elongationPercent(stretchDirection, stretchIntensity);
  const elongationMaxPct = Math.round(U_MAX_ELONG[stretchDirection] * 100);
  const recoveryPctLabel = `${recoveryEstimate(stretchIntensity).toFixed(1)}% estimasi`;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <span className="text-xs font-mono font-bold tracking-wider text-white flex items-center gap-1.5">
          <Activity size={15} className="text-[#FF6B35] animate-pulse" />
          <span>3D TEST LAB & SIMULASI FISIKA</span>
        </span>
        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35]">
          {testLabMode === 'none' ? 'STANDAR' : testLabMode.toUpperCase()}
        </span>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { id: 'none', label: 'STANDAR', Icon: Sliders },
          { id: 'stretch', label: 'TARIK KAIN', Icon: Activity },
          { id: 'flashlight', label: 'SENTER 3D', Icon: Flashlight },
          { id: 'windtunnel', label: 'ANGIN 3D', Icon: Wind },
        ].map(({ id, label, Icon }) => {
          const isActive = testLabMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectMode(id as TestLabMode)}
              className={`py-2.5 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all flex flex-col items-center gap-1 text-center ${
                isActive
                  ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-md scale-[1.02]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 active:bg-zinc-800'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* PANEL 1: UJI TARIK (semua tier) */}
      {testLabMode === 'stretch' && (
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity size={13} className="text-[#FF6B35]" />
              Uji Regangan Tarik & Elastisitas Sablon
            </span>
            <span className="text-xs font-mono font-bold text-[#FF6B35]">{stretchPercentage}%</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
              ARAH REGANGAN FISIKA:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'horizontal', label: 'DADA', desc: 'Melintang' },
                { id: 'vertical', label: 'KERAH', desc: 'Membujur' },
                { id: 'biaxial', label: 'BIAXIAL', desc: 'Radial 360°' },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStretchDirection(id as StretchDirection)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center ${
                    stretchDirection === id
                      ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold">{label}</div>
                  <span className="text-[8.5px] opacity-75">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-[#FF6B35] to-amber-500 transition-all duration-75"
              style={{ width: `${Math.max(4, stretchPercentage)}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={stretchIntensity}
              onChange={(e) => setStretchIntensity(parseFloat(e.target.value))}
              className="flex-1 accent-[#FF6B35]"
              aria-label="Intensitas tarikan kain"
            />
            <button
              type="button"
              onClick={() => setStretchIntensity(0)}
              className="px-2 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-[10px] font-mono font-bold flex items-center gap-1"
              title="Lepas / Reset Pegas"
            >
              <RefreshCw size={11} />
              <span>LEPAS</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-bold">
            {[
              { val: 0.1, label: '10% SANTAI' },
              { val: 0.25, label: '25% AKTIF' },
              { val: 0.5, label: '50% MAKS' },
              { val: 0, label: '0% RECOIL' },
            ].map(({ val, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setStretchIntensity(val)}
                className={`py-1 rounded border transition-all text-center ${
                  Math.abs(stretchIntensity - val) < 0.05
                    ? 'bg-[#FF6B35]/20 border-[#FF6B35] text-[#FF6B35]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Telemetri elongasi & recovery — estimasi visual ala ASTM D2594 */}
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Elongasi Kain (maks {elongationMaxPct}%):</span>
              <span className="font-bold text-white">{elongationPct.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Pemulihan Elastis (D2594):</span>
              <span className="font-bold text-emerald-400">{recoveryPctLabel}</span>
            </div>
          </div>
          <p className="text-[9px] font-mono font-bold tracking-wide text-zinc-500">
            ESTIMASI VISUAL — bukan sertifikasi lab
          </p>

          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-emerald-300">
              <span className="font-bold block">Tinta DTF Polyurethane Elastis (ASTM D2594 · knit stretch &amp; recovery)</span>
              Sablon ikut melar lentur mengikuti serat kain tanpa retak (cracking), sobek, atau mengelupas.
            </div>
          </div>

          <p className="text-[9px] font-mono font-bold tracking-wide text-zinc-500 text-center border border-zinc-800 rounded-lg py-1 bg-zinc-950">
            SIMULASI VISUAL — produksi DTF standar
          </p>

          <p className="text-[9.5px] text-zinc-500 leading-relaxed italic">
            Tips: sentuh & drag langsung pada pakaian di kanvas 3D untuk tarikan pegas interaktif (orbit
            terkunci otomatis selama mode tarik).
          </p>
        </div>
      )}

      {/* PANEL 2: SENTER 3D & TINTA */}
      {testLabMode === 'flashlight' && (
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Flashlight size={13} className="text-[#FF6B35]" />
              Inspeksi Senter 3D & Tinta Spesial
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              DARKROOM AKTIF
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'standard', label: 'DTF Standar', desc: 'Matte Katun Alami' },
              { id: 'reflective3m', label: '3M Reflective', desc: 'Retro-Refleksi Flash HP' },
              { id: 'glow', label: 'Glow in Dark', desc: 'Fosfor Neon Berpendar' },
              ...(allowFancyInk
                ? [
                    { id: 'goldfoil', label: 'Gold Foil', desc: 'Kilau Logam Emas Mewah' },
                    { id: 'holographic', label: 'Holo Prism', desc: 'Spektrum Pelangi Iridescence' },
                  ]
                : []),
            ].map(({ id, label, desc }) => {
              const isSelected = specialInkEffect === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSpecialInkEffect(id as SpecialInkEffect)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-[#FF6B35]/15 border-[#FF6B35] text-[#FF6B35] shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  } ${id === 'holographic' ? 'col-span-2' : ''}`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{label}</span>
                    {isSelected && <Sparkles size={11} />}
                  </div>
                  <div className="text-[10px] font-mono opacity-70 mt-0.5">{desc}</div>
                </button>
              );
            })}
          </div>
          {!allowFancyInk && (
            <p className="text-[10px] text-zinc-500 italic">
              Gold Foil & Holo Prism disembunyikan di tier rendah (hemat shader HP).
            </p>
          )}

          <div className="pt-2 border-t border-zinc-800 space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>FOKUS BERKAS SENTER:</span>
              <span className="text-[#FF6B35] font-bold">
                {flashlightFocus <= 0.3
                  ? 'SPOTLIGHT TAJAM (18°)'
                  : flashlightFocus <= 0.55
                    ? 'SOROT SEDANG (32°)'
                    : 'FLOODLIGHT LUAS (45°)'}
              </span>
            </div>
            <input
              type="range"
              min="0.18"
              max="0.75"
              step="0.03"
              value={flashlightFocus}
              onChange={(e) => setFlashlightFocus(parseFloat(e.target.value))}
              className="w-full accent-[#FF6B35]"
              aria-label="Fokus berkas senter"
            />
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed italic">
            Studio otomatis menggelap ke mode ruang inspeksi QC. Sentuh & geser kanvas untuk mengarahkan
            sorotan berkas senter 3D ke detail sablon (gyro parallax nonaktif selama mode senter).
          </p>
        </div>
      )}

      {/* PANEL 3: TEROWONGAN ANGIN */}
      {testLabMode === 'windtunnel' && (
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Wind size={13} className="text-sky-400" />
              Uji Terowongan Angin & Aerodinamika
            </span>
            <span className="text-xs font-mono font-bold text-sky-400">{windTunnelSpeed} km/jam</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
              ARAH TERPAAN ANGIN:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'front', label: 'DEPAN', desc: 'Menerpa Dada' },
                { id: 'side', label: 'SAMPING', desc: 'Menyapu Lengan' },
                { id: 'up', label: 'BAWAH', desc: 'Up-Draft Kelim' },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWindDirection(id as WindDirection)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                    windDirection === id
                      ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold">{label}</div>
                  <span className="text-[8.5px] opacity-75 block">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={windTunnelSpeed}
              onChange={(e) => {
                const spd = parseInt(e.target.value, 10);
                setWindTunnelSpeed(spd);
                // Kopling: kecepatan berapa pun menjaga preset waving.
                setActiveAnimation('waving');
              }}
              className="flex-1 accent-sky-400"
              aria-label="Kecepatan angin terowongan"
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { spd: 20, label: 'Sepoi (20)' },
              { spd: 50, label: 'Kencang (50)' },
              { spd: 85, label: 'Badai (85)' },
            ].map(({ spd, label }) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  setWindTunnelSpeed(spd);
                  setActiveAnimation('waving');
                }}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold border transition-all text-center ${
                  windTunnelSpeed === spd
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="opacity-80 text-[10px]">Permeabilitas Udara Kain:</span>
              <span className="font-bold text-[10.5px]">{MOBILE_FABRIC_BREATHABILITY.cfm} CFM</span>
            </div>
            <div className="text-[9.5px] opacity-75 italic pl-1 border-l-2 border-sky-400">
              {MOBILE_FABRIC_BREATHABILITY.desc}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-sky-400/20">
              <span className="opacity-80 text-[10px]">Stabilitas Adhesi Sablon:</span>
              <span className="font-bold text-emerald-400 text-[10.5px]">Simulasi: adhesi mengikuti kain (validasi produksi: uji cuci)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
