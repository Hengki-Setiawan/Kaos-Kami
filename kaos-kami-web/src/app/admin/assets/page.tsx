import {
  ACTIVE_FILES,
  ARCHIVED_FILES,
  BACKUP_FILES,
  BLENDSWAP_FILES,
  STAGED_FILES,
  formatBytes,
  formatTris,
  type AssetEntry,
  type AssetStatus,
} from "@/lib/assetManifest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// RBAC: diwarisi dari src/app/admin/layout.tsx (server gate
// ADMIN/SUPER_ADMIN/PRODUCTION_STAFF, fail-closed). Halaman ini read-only,
// tanpa query DB — murni render manifest SSOT.

const STATUS_STYLE: Record<AssetStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  backup: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  staged: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  archive: "bg-black/5 dark:bg-white/5 text-text-muted border-border-subtle",
};

const STATUS_SHORT: Record<AssetStatus, string> = {
  active: "AKTIF",
  backup: "CADANGAN",
  staged: "STAGED",
  archive: "ARSIP",
};

function AssetTable({ rows, compact }: { rows: AssetEntry[]; compact?: boolean }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border-subtle bg-surface-elevated">
            <th className="p-3 font-bold">File</th>
            <th className="p-3 font-bold">Jenis</th>
            <th className="p-3 font-bold text-right">Ukuran</th>
            <th className="p-3 font-bold text-right">Tris</th>
            <th className="p-3 font-bold">UV</th>
            <th className="p-3 font-bold">Tekstur</th>
            <th className="p-3 font-bold">Status</th>
            {!compact && <th className="p-3 font-bold">Catatan forensik</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle text-[11px]">
          {rows.map((a) => (
            <tr key={`${a.location}${a.file}`} className="align-top hover:bg-black/[0.03] dark:hover:bg-white/[0.02]">
              <td className="p-3">
                <span className="font-bold text-text-primary block break-all">{a.file}</span>
                <span className="text-text-muted/70 text-[10px] block">{a.location}</span>
              </td>
              <td className="p-3 text-text-muted whitespace-nowrap">{a.kind}</td>
              <td className="p-3 text-right text-text-primary whitespace-nowrap">{formatBytes(a.bytes)}</td>
              <td className="p-3 text-right text-text-primary whitespace-nowrap">
                {formatTris(a.tris)}
                <span className="block text-[10px] text-text-muted/70">
                  {a.trisSource === "measured" ? "terukur" : a.trisSource === "checklist" ? "asumsi" : "tak terukur"}
                </span>
              </td>
              <td className="p-3 text-text-muted whitespace-nowrap">{a.uv}</td>
              <td className="p-3 text-text-muted whitespace-nowrap">{a.textures}</td>
              <td className="p-3 whitespace-nowrap">
                <span className={`inline-block px-2 py-1 rounded-lg border font-bold text-[10px] ${STATUS_STYLE[a.status]}`}>
                  {STATUS_SHORT[a.status]}
                </span>
              </td>
              {!compact && <td className="p-3 text-text-muted max-w-[320px]">{a.note}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAssetsPage() {
  return (
    <div className="p-5 sm:p-8 space-y-8 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-border-subtle">
        <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-text-primary">INVENTARIS ASET 3D</h1>
        <p className="text-text-muted mt-1">
          SSOT: <span className="text-text-primary">src/lib/assetManifest.ts</span> • angka tris/byte/UV TERUKUR via{" "}
          <span className="text-text-primary">gltf-transform inspect</span> (read-only, 12 Sep 2026 sore) + SHA256 identik
          dengan master Asset 3D/ • lisensi dinilai <span className="text-text-primary">per file</span> di kolom catatan
          (tidak ada klaim generik — tiap file bisa MIT / CC-BY / belum terverifikasi, lihat ASSET_CREDITS.md)
        </p>
        <p className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px]">
          CATATAN KEADALUWARSAAN: isi tabel di bawah HANYA memuat array manifest (15 file + arsip) — disk{" "}
          <span className="font-bold">public/models/</span> kini 22 file (+pants/shorts/mannequin + varian Draco, 14 Sep 2026)
          yang BELUM masuk array. Tabel diperbarui hanya bila owner memutuskan (manifest TIDAK ditulis ulang di sini).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-text-primary uppercase">AKTIF — dipakai mockup studio ({ACTIVE_FILES.length})</h2>
        <p className="text-text-muted text-[11px]">Model produksi di <span className="text-text-primary">public/models/</span> yang dirujuk useDeviceTier.ts + komponen 3D.</p>
        <AssetTable rows={ACTIVE_FILES} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-text-primary uppercase">CADANGAN — varian optimasi model aktif ({BACKUP_FILES.length})</h2>
        <p className="text-text-muted text-[11px]">Varian Draco/LOD1 dari model AKTIF (fallback tier-low, hemat bandwidth).</p>
        <AssetTable rows={BACKUP_FILES} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-text-primary uppercase">STAGED Wave-1 — salinan public, antre jadi default ({STAGED_FILES.length})</h2>
        <p className="text-text-muted text-[11px]">
          Sudah di <span className="text-text-primary">public/models/</span> sebagai salinan rename yang SHA256-nya identik
          dengan master <span className="text-text-primary">Asset 3D/sketchfab/</span> — tapi BELUM dipasang sebagai default
          kode (TshirtModel/HoodieModel/useDeviceTier masih menunjuk file lama) dan lisensi BELUM terverifikasi
          owner. Syarat naik jadi default: kompresi Draco, ukur cm, pasang MODEL_PATH (agen 3D) + lisensi terverifikasi.
        </p>
        <AssetTable rows={STAGED_FILES} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-text-primary uppercase">ARSIP — tetap di Asset 3D/, JANGAN copy ke public/ ({ARCHIVED_FILES.length + BLENDSWAP_FILES.length})</h2>
        <p className="text-text-muted text-[11px]">
          16 GLB tanpa salinan di public/ + 4 zip BlendSwap (berisi .blend — butuh Blender, tris tak terukur).
          Menyalin arsip ke public/ menambah bundle &amp; biaya R2 tanpa manfaat, jadi JANGAN copy ke public/.
          Alasan arsip per file tercatat di kolom tabel
          (kolom catatan disembunyikan di sini agar ringkas — lihat manifest untuk detail).
        </p>
        <h3 className="font-bold text-text-muted uppercase text-[11px] pt-2">Arsip Sketchfab (.glb, {ARCHIVED_FILES.length})</h3>
        <AssetTable rows={ARCHIVED_FILES} compact />
        <h3 className="font-bold text-text-muted uppercase text-[11px] pt-2">Arsip BlendSwap (.zip berisi .blend — butuh Blender, {BLENDSWAP_FILES.length})</h3>
        <AssetTable rows={BLENDSWAP_FILES} compact />
      </section>
    </div>
  );
}
