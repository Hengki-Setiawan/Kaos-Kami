"use client";

import dynamic from "next/dynamic";

// Boundary client khusus untuk dynamic(ssr:false). page.tsx tetap Server
// Component (metadata) — pola ini yang didukung Next: ssr:false hanya
// boleh di dalam Client Component.
const StudioClient = dynamic(() => import("./StudioClient").then((m) => m.StudioClient), {
  ssr: false,
  loading: () => (
    <main className="h-screen w-screen flex items-center justify-center bg-canvas text-text-muted font-mono text-xs">
      Memuat Studio 3D…
    </main>
  ),
});

export default function StudioClientLoader() {
  return <StudioClient />;
}
