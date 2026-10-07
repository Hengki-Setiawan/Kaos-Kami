import React from "react";

export default function AdminLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-black/[0.08] dark:bg-white/[0.08] rounded-md" />
          <div className="h-3.5 w-72 bg-black/[0.04] dark:bg-white/[0.04] rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-black/[0.06] dark:bg-white/[0.06] rounded-lg" />
          <div className="h-9 w-28 bg-black/[0.06] dark:bg-white/[0.06] rounded-lg" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border-subtle bg-surface space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-black/[0.05] dark:bg-white/[0.05] rounded" />
              <div className="h-6 w-6 bg-black/[0.06] dark:bg-white/[0.06] rounded-md" />
            </div>
            <div className="h-7 w-28 bg-black/[0.09] dark:bg-white/[0.09] rounded-md" />
            <div className="h-3 w-36 bg-black/[0.04] dark:bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="h-4 w-36 bg-black/[0.07] dark:bg-white/[0.07] rounded" />
          <div className="h-7 w-20 bg-black/[0.05] dark:bg-white/[0.05] rounded-md" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between py-2 border-b border-border-subtle/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-black/[0.06] dark:bg-white/[0.06]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 bg-black/[0.07] dark:bg-white/[0.07] rounded" />
                  <div className="h-2.5 w-24 bg-black/[0.04] dark:bg-white/[0.04] rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-black/[0.06] dark:bg-white/[0.06] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
