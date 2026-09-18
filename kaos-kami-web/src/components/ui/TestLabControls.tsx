"use client";

import React from "react";
import {
  Activity,
  Flashlight,
  Wind,
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  Gauge,
  Sliders,
  Maximize2,
  ArrowRightLeft,
  ArrowUpDown,
  Move,
  Eye,
  Compass,
} from "lucide-react";
import {
  useConfiguratorStore,
  type TestLabMode,
  type SpecialInkEffect,
  type StretchDirection,
  type WindDirection,
} from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";

export const TestLabControls: React.FC = () => {
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
    materialFinish,
    setAnimationPreset,
    setAnimationSpeed,
  } = useConfiguratorStore(
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
      materialFinish: s.materialFinish,
      setAnimationPreset: s.setAnimationPreset,
      setAnimationSpeed: s.setAnimationSpeed,
    }))
  );

  const handleSelectMode = (mode: TestLabMode) => {
    setTestLabMode(mode);
    if (mode === "windtunnel") {
      setAnimationPreset("wind");
      setAnimationSpeed(Math.max(0.6, windTunnelSpeed / 35));
    } else if (mode === "none") {
      setAnimationPreset("static");
      setStretchIntensity(0);
    } else {
      setAnimationPreset("static");
    }
  };

  const stretchPercentage = Math.round(stretchIntensity * 100);
  const tensileForceN = (stretchIntensity * 36.4).toFixed(1);

  // Telemetri permeabilitas udara berdasarkan bahan kain yang dipilih
  const fabricBreathability =
    materialFinish === "french-terry"
      ? { cfm: 64, desc: "Fleece 380 GSM (Retensi Hangat)" }
      : materialFinish === "poplin"
      ? { cfm: 82, desc: "Poplin Kalis (Aliran Udara Sedang)" }
      : { cfm: 98, desc: "Katun Combed 24s (Sangat Sejuk & Bernapas)" };

  return (
    <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3.5 shadow-sm">
      {/* Header Test Lab */}
      <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
        <span className="text-xs font-mono font-bold tracking-wider text-text-primary flex items-center gap-1.5">
          <Activity size={15} className="text-brand-accent animate-pulse" />
          <span>3D TEST LAB & SIMULASI FISIKA</span>
        </span>
        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
          {testLabMode === "none" ? "STANDAR" : testLabMode.toUpperCase()}
        </span>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { id: "none", label: "STANDAR", icon: Sliders },
          { id: "stretch", label: "TARIK KAIN", icon: Activity },
          { id: "flashlight", label: "SENTER 3D", icon: Flashlight },
          { id: "windtunnel", label: "ANGIN 3D", icon: Wind },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = testLabMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectMode(id as TestLabMode)}
              className={`py-2.5 px-1 rounded-xl font-mono text-[10px] font-bold border transition-all flex flex-col items-center gap-1 text-center ${
                isActive
                  ? "bg-brand-accent text-canvas border-brand-accent shadow-md scale-[1.02]"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-border"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* --- PANEL 1: UJI TARIK & ELASTISITAS KAIN (MAXIMAL) --- */}
      {testLabMode === "stretch" && (
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border-subtle space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Activity size={13} className="text-brand-accent" />
              Uji Regangan Tarik & Elastisitas Sablon
            </span>
            <span className="text-xs font-mono font-bold text-brand-accent">
              {stretchPercentage}%
            </span>
          </div>

          {/* Pemilih Arah Tarikan Fisika */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
              ARAH REGANGAN FISIKA:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "horizontal", label: "DADA", icon: ArrowRightLeft, desc: "Melintang" },
                { id: "vertical", label: "KERAH", icon: ArrowUpDown, desc: "Membujur" },
                { id: "biaxial", label: "BIAXIAL", icon: Move, desc: "Radial 360°" },
              ].map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStretchDirection(id as StretchDirection)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center ${
                    stretchDirection === id
                      ? "bg-brand-accent text-canvas border-brand-accent shadow-sm"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                    <Icon size={11} />
                    <span>{label}</span>
                  </div>
                  <span className="text-[8.5px] opacity-75">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar Tegangan */}
          <div className="w-full bg-border-subtle/50 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-brand-accent to-amber-500 transition-all duration-75"
              style={{ width: `${Math.max(4, stretchPercentage)}%` }}
            />
          </div>

          {/* Slider Tarikan & Reset Pegas */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={stretchIntensity}
              onChange={(e) => setStretchIntensity(parseFloat(e.target.value))}
              className="flex-1 accent-brand-accent cursor-pointer"
              aria-label="Intensitas tarikan kain"
            />
            <button
              type="button"
              onClick={() => setStretchIntensity(0)}
              className="px-2 py-1.5 rounded-lg border border-border-subtle hover:bg-surface text-text-muted hover:text-text-primary text-[10px] font-mono font-bold flex items-center gap-1"
              title="Lepas / Reset Pegas"
            >
              <RefreshCw size={11} />
              <span>LEPAS</span>
            </button>
          </div>

          {/* Preset Cepat Tarikan */}
          <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-bold">
            {[
              { val: 0.1, label: "10% SANTAI" },
              { val: 0.25, label: "25% AKTIF" },
              { val: 0.5, label: "50% MAKS" },
              { val: 0, label: "0% RECOIL" },
            ].map(({ val, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setStretchIntensity(val)}
                className={`py-1 rounded border transition-all text-center ${
                  Math.abs(stretchIntensity - val) < 0.05
                    ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                    : "bg-surface/70 border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Telemetri Uji Tarik ASTM D5034 */}
          <div className="p-2.5 rounded-lg bg-surface border border-border-subtle text-[10px] font-mono space-y-1">
            <div className="flex justify-between text-text-muted">
              <span>Estimasi Beban Tarik:</span>
              <span className="font-bold text-text-primary">{tensileForceN} N/cm²</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Daya Pemulihan Elastis:</span>
              <span className="font-bold text-emerald-400">99.8% Spring Recoil</span>
            </div>
          </div>

          {/* Badge Jaminan Ketahanan DTF */}
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-emerald-300">
              <span className="font-bold block">Tinta DTF Polyurethane Elastis (ASTM D5034)</span>
              Sablon ikut melar lentur mengikuti serat kain tanpa retak (cracking), sobek, atau mengelupas.
            </div>
          </div>

          <p className="text-[9.5px] text-text-muted/80 leading-relaxed italic">
            💡 Tips: Anda juga bisa mengklik & men-drag langsung pada permukaan pakaian di kanvas 3D untuk merasakan tarikan pegas interaktif.
          </p>
        </div>
      )}

      {/* --- PANEL 2: SENTER 3D & EFEK TINTA KHUSUS (MAXIMAL) --- */}
      {testLabMode === "flashlight" && (
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border-subtle space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Flashlight size={13} className="text-brand-accent" />
              Inspeksi Senter 3D & Tinta Spesial
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              DARKROOM AKTIF
            </span>
          </div>

          {/* Opsi 5 Tinta Khusus */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "standard", label: "DTF Standar", desc: "Matte Katun Alami" },
              { id: "reflective3m", label: "3M Reflective", desc: "Retro-Refleksi Flash HP" },
              { id: "glow", label: "Glow in Dark", desc: "Fosfor Neon Berpendar" },
              { id: "goldfoil", label: "Gold Foil", desc: "Kilau Logam Emas Mewah" },
              { id: "holographic", label: "Holo Prism", desc: "Spektrum Pelangi Iridescence" },
            ].map(({ id, label, desc }) => {
              const isSelected = specialInkEffect === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSpecialInkEffect(id as SpecialInkEffect)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "bg-brand-accent/15 border-brand-accent text-brand-accent shadow-sm"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  } ${id === "holographic" ? "col-span-2" : ""}`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>{label}</span>
                    {isSelected && <Sparkles size={11} className="text-brand-accent" />}
                  </div>
                  <div className="text-[10px] font-mono opacity-70 mt-0.5">{desc}</div>
                </button>
              );
            })}
          </div>

          {/* Pengatur Fokus Berkas Senter 3D */}
          <div className="pt-2 border-t border-border-subtle/50 space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>FOKUS BERKAS SENTER:</span>
              <span className="text-brand-accent font-bold">
                {flashlightFocus <= 0.3
                  ? "SPOTLIGHT TAJAM (18°)"
                  : flashlightFocus <= 0.55
                  ? "SOROT SEDANG (32°)"
                  : "FLOODLIGHT LUAS (45°)"}
              </span>
            </div>
            <input
              type="range"
              min="0.18"
              max="0.75"
              step="0.03"
              value={flashlightFocus}
              onChange={(e) => setFlashlightFocus(parseFloat(e.target.value))}
              className="w-full accent-brand-accent cursor-pointer"
              aria-label="Fokus berkas senter"
            />
          </div>

          <p className="text-[10px] text-text-muted/80 leading-relaxed italic">
            💡 Studio otomatis menggelap ke mode ruang inspeksi QC. Gerakkan kursor atau sentuh kanvas untuk mengarahkan sorotan berkas senter 3D langsung ke detail sablon.
          </p>
        </div>
      )}

      {/* --- PANEL 3: TEROWONGAN ANGIN 3D (MAXIMAL) --- */}
      {testLabMode === "windtunnel" && (
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border-subtle space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Wind size={13} className="text-sky-400" />
              Uji Terowongan Angin & Aerodinamika
            </span>
            <span className="text-xs font-mono font-bold text-sky-400">
              {windTunnelSpeed} km/jam
            </span>
          </div>

          {/* Pilihan Arah Terpaan Angin */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
              ARAH TERPAAN ANGIN:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "front", label: "DEPAN", desc: "Menerpa Dada" },
                { id: "side", label: "SAMPING", desc: "Menyapu Lengan" },
                { id: "up", label: "BAWAH", desc: "Up-Draft Kelim" },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWindDirection(id as WindDirection)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                    windDirection === id
                      ? "bg-sky-500 text-white border-sky-400 shadow-sm"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold">{label}</div>
                  <span className="text-[8.5px] opacity-75 block">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Slider Kecepatan Angin */}
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
                setAnimationSpeed(Math.max(0.4, spd / 35));
              }}
              className="flex-1 accent-sky-400 cursor-pointer"
              aria-label="Kecepatan angin terowongan"
            />
          </div>

          {/* Preset Cepat Kecepatan */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { spd: 20, label: "Sepoi (20)" },
              { spd: 50, label: "Kencang (50)" },
              { spd: 85, label: "Badai (85)" },
            ].map(({ spd, label }) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  setWindTunnelSpeed(spd);
                  setAnimationSpeed(spd / 35);
                }}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold border transition-all text-center ${
                  windTunnelSpeed === spd
                    ? "bg-sky-500 text-white border-sky-400"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Telemetri Aerodinamika & Sirkulasi Bahan */}
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="opacity-80 text-[10px]">Permeabilitas Udara Kain:</span>
              <span className="font-bold text-[10.5px]">{fabricBreathability.cfm} CFM</span>
            </div>
            <div className="text-[9.5px] opacity-75 italic pl-1 border-l-2 border-sky-400">
              {fabricBreathability.desc}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-sky-400/20">
              <span className="opacity-80 text-[10px]">Stabilitas Adhesi Sablon:</span>
              <span className="font-bold text-emerald-400 text-[10.5px]">100% Anti-Tear / No Peeling</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
