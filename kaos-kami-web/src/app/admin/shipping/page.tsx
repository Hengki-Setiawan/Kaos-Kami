"use client";

import { useCallback, useEffect, useState } from "react";

interface Zone {
  id: string;
  city: string;
  province: string;
  courier: string;
  service: string;
  costIdr: number;
  etdLabel: string;
  isActive: boolean;
  sortOrder: number;
}

interface Usage {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

const EMPTY = { city: "", province: "", courier: "", service: "REG", costIdr: 25000, etdLabel: "2-3 hari", sortOrder: 0 };

export default function AdminShippingPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageConfigured, setUsageConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  // Edit inline per baris: { [id]: { costIdr, etdLabel } }
  const [edits, setEdits] = useState<Record<string, { costIdr: number; etdLabel: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [zr, ur] = await Promise.all([
        fetch("/api/admin/zones").then((r) => r.json()),
        fetch("/api/admin/shipping/usage").then((r) => r.json()),
      ]);
      if (Array.isArray(zr.zones)) setZones(zr.zones);
      else setMsg(zr.error || "Gagal muat zona");
      if (ur.configured) {
        setUsageConfigured(true);
        setUsage(ur.usage);
      } else setUsageConfigured(false);
    } catch {
      setMsg("Gagal koneksi server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (url: string, method: string, body?: any) => {
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Gagal simpan");
      return null;
    }
    return data;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await post("/api/admin/zones", "POST", { ...form, costIdr: Number(form.costIdr) });
    if (data?.zone) {
      setZones((z) => [...z, data.zone]);
      setForm(EMPTY);
      setMsg("Zona ditambah.");
    }
  };

  const handleSaveRow = async (zone: Zone) => {
    const ed = edits[zone.id];
    if (!ed) return;
    const data = await post(`/api/admin/zones/${zone.id}`, "PATCH", {
      costIdr: Number(ed.costIdr),
      etdLabel: ed.etdLabel,
    });
    if (data?.zone) {
      setZones((zs) => zs.map((z) => (z.id === zone.id ? data.zone : z)));
      setEdits((e) => {
        const n = { ...e };
        delete n[zone.id];
        return n;
      });
      setMsg("Tarif diperbarui, langsung live.");
    }
  };

  const handleToggle = async (zone: Zone) => {
    const data = await post(`/api/admin/zones/${zone.id}`, "PATCH", { isActive: !zone.isActive });
    if (data?.zone) setZones((zs) => zs.map((z) => (z.id === zone.id ? data.zone : z)));
  };

  const handleDelete = async (zone: Zone) => {
    if (!confirm(`Hapus zona ${zone.city} – ${zone.courier} ${zone.service}?`)) return;
    const data = await post(`/api/admin/zones/${zone.id}`, "DELETE");
    if (data?.ok) setZones((zs) => zs.filter((z) => z.id !== zone.id));
  };

  const pct = usage && usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-black uppercase text-white">ONGKIR & ZONA EKSPEDISI</h1>
        <p className="font-mono text-[11px] text-text-muted">
          Tarif luar kota (fallback bila API live down) + pantau kuota AgenWebsite.
        </p>
      </div>

      {/* Kuota AgenWebsite */}
      <div className="p-4 rounded-xl bg-surface/50 border border-white/5 font-mono text-xs">
        <span className="block text-[11px] text-text-muted uppercase mb-2">Kuota AgenWebsite (hari ini)</span>
        {usageConfigured === false && (
          <p className="text-amber-400">
            API key belum dipasang. Tarif pakai tabel zona di bawah. Pasang key via secret{" "}
            <span className="font-bold">AGENWEBSITE_RATE_API_KEY</span> (lihat Blueprint/PENGIRIMAN.md).
          </p>
        )}
        {usage && (
          <div className="space-y-2">
            <div className="flex justify-between text-text-muted">
              <span>
                Paket {usage.plan} · {usage.used}/{usage.limit} · sisa {usage.remaining}
              </span>
              <span className={pct >= 95 ? "text-rose-400 font-bold" : pct >= 80 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full ${pct >= 95 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="text-[11px] text-text-muted">Reset {usage.resetAt || "00:00 WIB"}</p>
          </div>
        )}
      </div>

      {msg && <p className="font-mono text-xs text-amber-400">{msg}</p>}

      {/* Tambah zona */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-surface/50 border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kota *" required className="px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white" />
        <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Provinsi *" required className="px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white" />
        <input value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} placeholder="Kurir (JNE/J&T) *" required className="px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white" />
        <input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="Layanan (REG) *" required className="px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white" />
        <input type="number" value={form.costIdr} onChange={(e) => setForm({ ...form, costIdr: Number(e.target.value) })} placeholder="Ongkir Rp *" required min={0} className="px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white" />
        <input value={form.etdLabel} onChange={(e) => setForm({ ...form, etdLabel: e.target.value })} placeholder="Estimasi (2-3 hari) *" required className="px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white" />
        <button type="submit" className="col-span-2 sm:col-span-2 px-3 py-2 rounded-lg bg-brand-accent text-canvas font-bold">
          + TAMBAH ZONA
        </button>
      </form>

      {/* Tabel zona */}
      <div className="rounded-xl border border-white/5 overflow-hidden font-mono text-xs">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#1a1a1e] text-text-muted uppercase text-[10px]">
              <tr>
                <th className="p-2">Kota</th>
                <th className="p-2">Kurir</th>
                <th className="p-2">Ongkir</th>
                <th className="p-2">Estimasi</th>
                <th className="p-2">Aktif</th>
                <th className="p-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-4 text-text-muted">
                    Memuat...
                  </td>
                </tr>
              )}
              {zones.map((z) => {
                const ed = edits[z.id];
                const isDefault = z.id === "zone_default_lainnya";
                return (
                  <tr key={z.id} className={!z.isActive ? "opacity-50" : ""}>
                    <td className="p-2 text-white">
                      {z.city}
                      <span className="block text-[10px] text-text-muted">{z.province}</span>
                    </td>
                    <td className="p-2 text-text-muted">
                      {z.courier} {z.service}
                    </td>
                    <td className="p-2">
                      {ed ? (
                        <input
                          type="number"
                          value={ed.costIdr}
                          onChange={(e) =>
                            setEdits({ ...edits, [z.id]: { ...ed, costIdr: Number(e.target.value) } })
                          }
                          className="w-24 px-1 py-1 rounded bg-black/40 border border-white/10 text-white"
                        />
                      ) : (
                        <span className="text-white">Rp {z.costIdr.toLocaleString("id-ID")}</span>
                      )}
                    </td>
                    <td className="p-2">
                      {ed ? (
                        <input
                          value={ed.etdLabel}
                          onChange={(e) =>
                            setEdits({ ...edits, [z.id]: { ...ed, etdLabel: e.target.value } })
                          }
                          className="w-24 px-1 py-1 rounded bg-black/40 border border-white/10 text-white"
                        />
                      ) : (
                        <span className="text-text-muted">{z.etdLabel}</span>
                      )}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleToggle(z)}
                        disabled={isDefault}
                        className={`px-2 py-1 rounded text-[10px] font-bold disabled:opacity-40 ${z.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-text-muted"}`}
                      >
                        {z.isActive ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td className="p-2 space-x-1 whitespace-nowrap">
                      {ed ? (
                        <button onClick={() => handleSaveRow(z)} className="px-2 py-1 rounded bg-brand-accent text-canvas text-[10px] font-bold">
                          SIMPAN
                        </button>
                      ) : (
                        <button
                          onClick={() => setEdits({ ...edits, [z.id]: { costIdr: z.costIdr, etdLabel: z.etdLabel } })}
                          className="px-2 py-1 rounded bg-white/10 text-white text-[10px]"
                        >
                          EDIT
                        </button>
                      )}
                      {!isDefault && (
                        <button onClick={() => handleDelete(z)} className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                          HAPUS
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
