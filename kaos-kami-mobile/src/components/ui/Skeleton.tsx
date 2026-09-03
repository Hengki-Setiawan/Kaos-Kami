import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/80 rounded-2xl ${className}`}
    />
  );
}

export function GarmentCardSkeleton() {
  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-3.5 space-y-3">
      <Skeleton className="w-full aspect-square rounded-2xl" />
      <Skeleton className="w-3/4 h-4 rounded-lg" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="w-1/3 h-4 rounded-lg" />
        <Skeleton className="w-1/4 h-4 rounded-lg" />
      </div>
    </div>
  );
}
