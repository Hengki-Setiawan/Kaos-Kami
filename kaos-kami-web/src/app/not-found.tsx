import Link from "next/link";

/** Halaman 404 kustom — gaya obsidian, arahkan ke katalog/studio. */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white flex flex-col items-center justify-center gap-4 p-6 text-center font-mono">
      <p className="text-brand-accent font-black text-6xl">404</p>
      <h1 className="font-display text-xl font-bold uppercase">Halaman tidak ketemu</h1>
      <p className="text-text-muted text-sm max-w-sm">
        Alamatnya salah ketik atau sudah dipindah. Balik ke katalog atau studio desain.
      </p>
      <div className="flex gap-3 mt-2">
        <Link
          href="/catalog"
          className="px-5 py-2.5 rounded-xl bg-brand-accent text-canvas font-bold text-xs uppercase tracking-wider"
        >
          Katalog
        </Link>
        <Link
          href="/studio"
          className="px-5 py-2.5 rounded-xl bg-surface border border-white/10 text-white font-bold text-xs uppercase tracking-wider"
        >
          Studio 3D
        </Link>
      </div>
    </div>
  );
}
