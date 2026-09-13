import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kredit Aset 3D — Kaos Kami Makassar",
  description: "Atribusi model 3D dan tekstur yang dipakai di studio Kaos Kami.",
};

// Halaman Kredit (syarat lisensi CC-BY 4.0): nama + author + sumber + lisensi.
// Diubah dari aslinya: skala cm, optimasi GLB, material PBR ulang untuk web.
const CREDITS: Array<{ title: string; author: string; authorUrl: string; source: string; license: string; licenseUrl: string; note: string }> = [
  {
    title: "Basic T-Shirt",
    author: "MadeByYeshe",
    authorUrl: "https://sketchfab.com/MadeByYeshe",
    source: "https://sketchfab.com/3d-models/basic-t-shirt-71bdf5940b5d41b8b46628a615e9b0ed",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Dipakai sebagai mesh kaos (tee-basic.glb). Diubah: skala cm, kompresi Draco.",
  },
  {
    title: "tshirt",
    author: "aliabbas.827",
    authorUrl: "https://sketchfab.com/aliabbas.827",
    source: "https://sketchfab.com/3d-models/tshirt-8c59588602724f1d96ee60d2b43e11b0",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Dipakai sebagai cadangan kaos (tee-alt.glb).",
  },
  {
    title: "Blue Hoodie",
    author: "Irevex11",
    authorUrl: "https://sketchfab.com/irevex11",
    source: "https://sketchfab.com/3d-models/blue-hoodie-7b78c56cd15e479b8ec9b18145ed0721",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Dipakai sebagai mesh hoodie (hoodie-blue.glb). Diubah: skala cm, kompresi Draco.",
  },
  {
    title: "Hoodie",
    author: "vsese",
    authorUrl: "https://sketchfab.com/veskee",
    source: "https://sketchfab.com/3d-models/hoodie-5a59576dc695462786c7b48db45f3d97",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Dipakai sebagai cadangan hoodie (hoodie-flat.glb).",
  },
  {
    title: "Sweater Pack",
    author: "MadeByYeshe",
    authorUrl: "https://sketchfab.com/MadeByYeshe",
    source: "https://sketchfab.com/3d-models/sweater-pack-50fc69ff7a9a4f91ad721b44e898772d",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Dipakai sebagai mesh sweater/crewneck (sweater.glb).",
  },
  {
    title: "Fleece Jacket",
    author: "Jonathan Millhauser",
    authorUrl: "https://sketchfab.com/jonathanmillhauser",
    source: "https://sketchfab.com/3d-models/fleece-jacket-26e7c5710ca5471d9f5f977dd1499ea0",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Arsip cadangan (fleece-alt.glb).",
  },
  {
    title: "Baseball Cap",
    author: "Scott VanArsdale (@vanart)",
    authorUrl: "https://sketchfab.com/vanart",
    source: "https://sketchfab.com/3d-models/baseball-cap-1c1d34d73fd94e6b9e8f82b1eb7194a0",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    note: "Dipakai sebagai mesh topi (cap.glb).",
  },
  {
    title: "Animated Base Character (manekin)",
    author: "Quaternius",
    authorUrl: "https://quaternius.com",
    source: "https://quaternius.com/packs/animatedbasecharacter.html",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    note: "Manekin studio (mannequin.glb, CC0 — atribusi sukarela, tidak wajib). Diubah: skala cm, material web.",
  },
];

export default function KreditPage() {
  return (
    <main className="min-h-screen bg-canvas text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="font-mono text-xs text-text-muted hover:text-white">
          ← Kembali ke Beranda
        </Link>
        <h1 className="font-display font-black text-2xl uppercase">Kredit Aset 3D</h1>
        <p className="font-mono text-xs text-text-muted leading-relaxed">
          Model 3D di bawah dipakai di mockup studio Kaos Kami di bawah lisensi
          Creative Commons Attribution 4.0 (boleh komersial, wajib atribusi),
          plus satu manekin CC0 (atribusi sukarela).
          Terima kasih untuk para pembuatnya.
        </p>
        <ul className="space-y-4">
          {CREDITS.map((c) => (
            <li key={c.source} className="rounded-xl border border-white/10 bg-surface p-4 space-y-1">
              <p className="font-bold text-sm">
                “{c.title}” oleh{" "}
                <a href={c.authorUrl} target="_blank" rel="noopener noreferrer" className="text-brand-accent underline">
                  {c.author}
                </a>
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                Sumber:{" "}
                <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline break-all">
                  {c.source}
                </a>
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                Lisensi:{" "}
                <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {c.license}
                </a>{" "}
                · {c.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
