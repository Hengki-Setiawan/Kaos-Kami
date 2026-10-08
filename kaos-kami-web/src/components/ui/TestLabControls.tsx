"use client";

import React, { useRef, useEffect } from "react";
import {
  Activity,
  Flashlight,
  Wind,
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
import type { DecalTargetSide } from "@/lib/constants";
import { QC_GRAZING_PRESETS } from "@/lib/qcLighting";
import { useShallow } from "zustand/shallow";
import {
  U_MAX_ELONG,
  elongationPercent,
  recoveryEstimate,
} from "@/lib/3d/stretchPhysics";

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
    qcGrazingDeg,
    setQcGrazingDeg,
    qcSide,
    setQcSide,
    qcAzimuth,
    setQcAzimuth,
    qcLux,
    materialFinish,
    studioTheme,
    setStudioTheme,
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
      qcGrazingDeg: s.qcGrazingDeg,
      setQcGrazingDeg: s.setQcGrazingDeg,
      qcSide: s.qcSide,
      setQcSide: s.setQcSide,
      qcAzimuth: s.qcAzimuth,
      setQcAzimuth: s.setQcAzimuth,
      qcLux: s.qcLux,
      materialFinish: s.materialFinish,
      studioTheme: s.studioTheme,
      setStudioTheme: s.setStudioTheme,
      setAnimationPreset: s.setAnimationPreset,
      setAnimationSpeed: s.setAnimationSpeed,
    }))
  );

  const prevThemeRef = useRef<typeof studioTheme | null>(null);

  const handleSelectMode = (mode: TestLabMode) => {
    if (mode === "flashlight") {
      if (testLabMode !== "flashlight") {
        prevThemeRef.current = studioTheme;
      }
      setStudioTheme("obsidian");
    } else if (testLabMode === "flashlight" && prevThemeRef.current) {
      setStudioTheme(prevThemeRef.current);
      prevThemeRef.current = null;
    }

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

  useEffect(() => {
    return () => {
      if (prevThemeRef.current) {
        useConfiguratorStore.getState().setStudioTheme(prevThemeRef.current);
      }
    };
  }, []);

  const stretchPercentage = Math.round(stretchIntensity * 100);
  const elongationPct = elongationPercent(stretchDirection, stretchIntensity);
  const elongationMaxPct = Math.round(U_MAX_ELONG[stretchDirection] * 100);
  const recoveryPctLabel = `${recoveryEstimate(stretchIntensity).toFixed(1)}%`;

  return (
    <div className="p-4 rounded-2xl glass-panel border border-border-subtle space-y-3.5 shadow-sm">
      {/* Header Test Lab */}
      <div className="flex justify-between items-center pb-2 border-b border-border-subtle/60">
        <span className="text-xs font-sans font-bold tracking-wider text-text-primary flex items-center gap-1.5">
          <Activity size={15} className="text-brand-accent animate-pulse" />
          <span>Simulasi Fisika &amp; Lingkungan 3D</span>
        </span>
        <span className="text-[10px] font-sans font-bold uppercase px-2.5 py-0.5 rounded-full border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
          {testLabMode === "none" ? "Standar" : testLabMode.toUpperCase()}
        </span>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { id: "none", label: "Standar", icon: Sliders },
          { id: "stretch", label: "Tarik Kain", icon: Activity },
          { id: "flashlight", label: "Senter 3D", icon: Flashlight },
          { id: "windtunnel", label: "Angin 3D", icon: Wind },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleSelectMode(id as TestLabMode)}
            aria-pressed={testLabMode === id}
            className={`py-2 px-1.5 rounded-xl text-center border font-sans text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${
              testLabMode === id
                ? "bg-brand-accent text-canvas border-brand-accent shadow-md scale-[1.02]"
                : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:border-border"
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* --- PANEL 1: UJI TARIK KAIN & ELASTISITAS --- */}
      {testLabMode === "stretch" && (
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border-subtle space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-sans font-bold text-text-primary flex items-center gap-1.5">
              <Activity size={13} className="text-brand-accent" />
              Kelenturan Bahan &amp; Tarikan Kain
            </span>
            <span className="text-xs font-mono font-bold text-brand-accent">
              {stretchPercentage}%
            </span>
          </div>

          {/* Pengatur Arah Tarik */}
          <div className="space-y-1">
            <span className="text-[11px] font-sans font-semibold text-text-muted">
              Arah Gaya Tarik:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "horizontal", label: "Horizontal", icon: ArrowRightLeft },
                { id: "vertical", label: "Vertikal", icon: ArrowUpDown },
                { id: "biaxial", label: "2 Arah", icon: Move },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStretchDirection(id as StretchDirection)}
                  aria-pressed={stretchDirection === id}
                  className={`py-1.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    stretchDirection === id
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-semibold"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Icon size={12} />
                  <span className="text-[10px] font-sans">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Slider Intensitas Tarikan */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>INTENSITAS TARIK:</span>
              <span className="text-brand-accent font-bold">{stretchPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={stretchIntensity}
              onChange={(e) => setStretchIntensity(parseFloat(e.target.value))}
              className="w-full accent-brand-accent cursor-pointer"
              aria-label="Intensitas tarikan kain"
              aria-valuetext={`${stretchPercentage} persen`}
            />
          </div>

          {/* Tombol Cepat Nilai Tarik */}
          <div className="grid grid-cols-4 gap-1">
            {[0, 0.35, 0.7, 1.0].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setStretchIntensity(v)}
                className={`py-1 rounded text-[10px] font-mono border transition-all ${
                  Math.abs(stretchIntensity - v) < 0.05
                    ? "bg-brand-accent text-canvas font-bold border-brand-accent"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {Math.round(v * 100)}%
              </button>
            ))}
          </div>

          {/* Telemetri elongasi & recovery */}
          <div className="p-2.5 rounded-lg bg-surface border border-border-subtle text-[10px] font-mono space-y-1">
            <div className="flex justify-between text-text-muted">
              <span>Elongasi Kain (maks {elongationMaxPct}%):</span>
              <span className="font-bold text-text-primary">
                {elongationPct.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Pemulihan Elastis:</span>
              <span className="font-bold text-emerald-400">{recoveryPctLabel}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- PANEL 2: SENTER 3D & INSPEKSI DARKROOM --- */}
      {testLabMode === "flashlight" && (
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border-subtle space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Flashlight size={13} className="text-brand-accent" />
              Inspeksi Senter 3D &amp; Detail Sablon
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              DARKROOM AKTIF
            </span>
          </div>

          {/* Pengatur Fokus Berkas Senter 3D */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>FOKUS BERKAS SENTER:</span>
              <span className="text-brand-accent font-bold">
                {Math.round((flashlightFocus * 180) / Math.PI)}°{" "}
                {flashlightFocus <= 0.35 ? "TAJAM" : flashlightFocus <= 0.55 ? "SEDANG" : "LUAS"}
              </span>
            </div>
            <input
              type="range"
              min="0.22"
              max="0.75"
              step="0.02"
              value={flashlightFocus}
              onChange={(e) => setFlashlightFocus(parseFloat(e.target.value))}
              className="w-full accent-brand-accent cursor-pointer"
              aria-label="Fokus berkas senter"
              aria-valuetext={`Cone ${Math.round((flashlightFocus * 180) / Math.PI)} derajat`}
            />

            {/* Tombol Preset Fokus Cepat */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { rad: 0.26, label: "15° TAJAM", sub: "Detail Mikro" },
                { rad: 0.45, label: "26° SEDANG", sub: "Standar Booth" },
                { rad: 0.70, label: "40° LUAS", sub: "Sorot Menyeluruh" },
              ].map(({ rad, label, sub }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFlashlightFocus(rad)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                    Math.abs(flashlightFocus - rad) < 0.08
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent font-bold"
                      : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <div className="text-[10px] font-mono">{label}</div>
                  <div className="text-[8.5px] opacity-70 font-normal">{sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- PANEL 3: TEROWONGAN ANGIN 3D --- */}
      {testLabMode === "windtunnel" && (
        <div className="p-3.5 rounded-xl bg-surface/80 border border-border-subtle space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Wind size={13} className="text-sky-400" />
              Uji Terowongan Angin &amp; Aerodinamika
            </span>
            <span className="text-xs font-mono font-bold text-sky-400">
              {windTunnelSpeed} km/jam
            </span>
          </div>

          {/* Pilihan Arah Terpaan Angin */}
          <div className="space-y-1">
            <span className="text-[10px] font-sans font-bold text-text-muted uppercase">
              ARAH TERPAAN ANGIN:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "front", label: "DEPAN", desc: "Menerpa Torso" },
                { id: "side", label: "SAMPING", desc: "Menyapu Lengan" },
                { id: "up", label: "BAWAH", desc: "Up-Draft Kelim" },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWindDirection(id as WindDirection)}
                  aria-pressed={windDirection === id}
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
              aria-valuetext={`${windTunnelSpeed} kilometer per jam`}
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
        </div>
      )}
    </div>
  );
};
