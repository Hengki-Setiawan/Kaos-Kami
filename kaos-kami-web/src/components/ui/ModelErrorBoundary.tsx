"use client";

import React from "react";

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ModelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    // Tampilkan error asli ke console (audit #14 — sebelumnya ditelan).
    console.error("[kaos-kami] Model 3D gagal:", error);
  }

  private retry = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;
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
