"use client";

import React from "react";

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  // Key remount: retry tanpa ini = cache drei lempar error yang sama lagi
  // (audit: loop crash instan). Key baru = pohon 3D dibangun ulang bersih.
  retryKey: number;
}

/**
 * Fase 13 — Fallback DIAM antar file GLB (tanpa chrome error/retry):
 * mesh utama gagal (draco/master hilang atau korup) → render komponen
 * fallback (file lama) seolah tak terjadi apa-apa. Error tetap ke console.
 * Dipakai BERLAPIS: draco → master → legacy (lihat TshirtModel/HoodieModel).
 */
export class SilentModelFallback extends React.Component<Props, State> {
  state: State = { hasError: false, message: "", retryKey: 0 };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error("[kaos-kami] Model 3D utama gagal, pakai fallback:", error);
  }

  render() {
    if (!this.state.hasError) return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    return <>{this.props.fallback}</>;
  }
}

export class ModelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "", retryKey: 0 };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    // Tampilkan error asli ke console (audit #14 — sebelumnya ditelan).
    console.error("[kaos-kami] Model 3D gagal:", error);
  }

  private retry = () => {
    // Bersihkan cache GLB drei agar fetch+parse diulang (bukan rethrow).
    import("@react-three/drei")
      .then((m: any) => m?.useGLTF?.clear?.())
      .catch(() => {});
    this.setState((s) => ({ hasError: false, message: "", retryKey: s.retryKey + 1 }));
  };

  render() {
    if (!this.state.hasError) return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    // Retry dulu; fallback hanya bila user menyerah.
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center font-mono text-xs">
        <p className="text-text-muted">Model 3D gagal dimuat{this.state.message ? `: ${this.state.message.slice(0, 120)}` : "."}</p>
        <button
          onClick={this.retry}
          className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold uppercase"
        >
          Coba lagi
        </button>
        <div className="w-full">{this.props.fallback}</div>
      </div>
    );
  }
}
