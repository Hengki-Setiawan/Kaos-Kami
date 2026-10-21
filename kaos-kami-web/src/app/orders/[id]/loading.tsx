import React from "react";

export default function OrderLoading() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary px-4 py-8 sm:py-12 max-w-3xl mx-auto space-y-4 font-sans animate-pulse">
      {/* Top action bar placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-36 rounded-lg bg-surface border border-border-subtle" />
        <div className="h-8 w-28 rounded-xl bg-surface border border-border-subtle" />
      </div>

      {/* Main card skeleton */}
      <div className="rounded-2xl border border-border-subtle bg-surface/80 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col items-center space-y-3 pb-6 border-b border-border-subtle">
          <div className="w-12 h-12 rounded-full bg-brand-accent/20" />
          <div className="h-4 w-32 rounded-full bg-surface-elevated" />
          <div className="h-7 w-64 rounded-xl bg-surface-elevated" />
          <div className="h-4 w-44 rounded-lg bg-surface-elevated" />
        </div>

        {/* 2 grid boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-24 rounded-xl bg-surface-elevated/60 border border-border-subtle" />
          <div className="h-24 rounded-xl bg-surface-elevated/60 border border-border-subtle" />
        </div>

        {/* Items box */}
        <div className="h-40 rounded-xl bg-surface-elevated/60 border border-border-subtle" />
      </div>
    </div>
  );
}
