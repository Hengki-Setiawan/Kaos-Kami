"use client";

// Tombol cetak client-island: onClick/window.print() TIDAK boleh di
// Server Component (audit H13 — tombol gang-sheet mati total).
export function PrintButton({ label = "CETAK PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-xl bg-brand-accent text-canvas font-bold"
    >
      {label}
    </button>
  );
}
