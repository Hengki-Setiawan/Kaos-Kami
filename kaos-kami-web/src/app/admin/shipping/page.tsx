"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DEFAULT_ZONE_ID } from "@/app/api/admin/zones/_shared";
import { INDONESIA_514_CITIES, type MasterCityRateData } from "@/lib/shipping/data/indonesia514Cities";
import { ShippingHubLeafletMap } from "@/components/maps/ShippingHubLeafletMap";
import {
  MapPin,
  Search,
  Navigation,
  Globe,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
} from "lucide-react";

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

const EMPTY = { city: "", province: "", courier: "", service: "REG", costIdr: 25000, etdLabel: "2-3 hari", sortOrder: 0 };

function statusMessage(status: number, fallback: string) {
  if (status === 401) return "Sesi berakhir — muat ulang & login kembali.";
  if (status === 403) return "Khusus admin — akun ini tak punya akses zona.";
  if (status === 429) return "Terlalu sering — tunggu ±1 menit lalu coba lagi.";
  return fallback;
}

const REGIONS = [
  { id: "ALL", label: "Semua Wilayah", count: 514 },
  { id: "Sulsel", label: "Sulawesi Selatan", count: 24 },
  { id: "Sulawesi", label: "Sulawesi Lainnya", count: 57 },
  { id: "Jawa-Bali", label: "Jawa & Bali", count: 128 },
  { id: "Kalimantan", label: "Kalimantan", count: 56 },
  { id: "Sumatera", label: "Sumatera", count: 154 },
  { id: "NusaTenggara", label: "Nusa Tenggara", count: 43 },
  { id: "Maluku", label: "Kep. Maluku", count: 21 },
  { id: "Papua", label: "Tanah Papua", count: 42 },
];

export default function AdminShippingPage() {
  const [activeTab, setActiveTab] = useState<"master514" | "zones">("master514");

  // Fallback Zones states
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, { costIdr: number; etdLabel: string; sortOrder: number }>>({});
  const [askingDelete, setAskingDelete] = useState<Zone | null>(null);

  // Master 514 Explorer states
  const [masterSearch, setMasterSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [selectedMapCity, setSelectedMapCity] = useState<MasterCityRateData | null>(
    INDONESIA_514_CITIES.find((c) => c.city.toLowerCase().includes("surabaya")) || INDONESIA_514_CITIES[0] || null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Simulator states
  const [simQuery, setSimQuery] = useState("");
  const [simWeight, setSimWeight] = useState(1);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleMonthlySyncCheck = async () => {
    setSyncLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cron/shipping-sync");
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult(data);
      } else {
        setMsg(data.error || "Gagal verifikasi sinkronisasi bulanan.");
      }
    } catch {
      setMsg("Gagal menghubungi endpoint sinkronisasi bulanan.");
    } finally {
      setSyncLoading(false);
    }
  };

  const PRESETS = [
    { city: "Kab. Gowa", province: "Sulawesi Selatan", courier: "J&T", service: "EZ", costIdr: 18000, etdLabel: "1-2 hari" },
    { city: "Kab. Maros", province: "Sulawesi Selatan", courier: "J&T", service: "EZ", costIdr: 18000, etdLabel: "1-2 hari" },
    { city: "Kab. Bone", province: "Sulawesi Selatan", courier: "JNE", service: "REG", costIdr: 25000, etdLabel: "2-3 hari" },
    { city: "Kota Parepare", province: "Sulawesi Selatan", courier: "JNE", service: "REG", costIdr: 22000, etdLabel: "2-3 hari" },
    { city: "Kota Palopo", province: "Sulawesi Selatan", courier: "J&T", service: "EZ", costIdr: 30000, etdLabel: "3-4 hari" },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const zr = await fetch("/api/admin/zones").then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
      if (Array.isArray(zr.body.zones)) setZones(zr.body.zones);
      else setMsg(statusMessage(zr.status, zr.body.error || "Gagal muat zona"));
    } catch {
      setMsg("Gagal koneksi server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (url: string, method: string, body?: any) => {
    setMsg(null);
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(statusMessage(r.status, data.error || "Aksi gagal"));
        return null;
      }
      return data;
    } catch {
      setMsg("Gagal koneksi server");
      return null;
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await post("/api/admin/zones", "POST", { ...form, costIdr: Number(form.costIdr), sortOrder: Number(form.sortOrder) || 0 });
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
      sortOrder: Math.max(0, Math.min(9999, Number(ed.sortOrder) || 0)),
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
    const data = await post(`/api/admin/zones/${zone.id}`, "DELETE");
    if (data?.ok) setZones((zs) => zs.filter((z) => z.id !== zone.id));
    setAskingDelete(null);
  };

  // Filter 514 Kota berdasarkan Region dan Kata Kunci
  const filteredMasterCities = useMemo(() => {
    return INDONESIA_514_CITIES.filter((c) => {
      if (selectedRegion !== "ALL" && c.region !== selectedRegion) {
        return false;
      }
      if (!masterSearch.trim()) return true;
      const q = masterSearch.toLowerCase().trim();
      return (
        c.city.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q) ||
        c.postalCode.includes(q)
      );
    });
  }, [selectedRegion, masterSearch]);

  const totalPages = Math.ceil(filteredMasterCities.length / itemsPerPage) || 1;
  const pagedCities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMasterCities.slice(start, start + itemsPerPage);
  }, [filteredMasterCities, currentPage]);

  // Hasil pencarian simulator 5 kurir
  const simulatedCity = useMemo(() => {
    if (!simQuery.trim()) return null;
    const q = simQuery.toLowerCase().trim();
    return (
      INDONESIA_514_CITIES.find(
        (c) => c.city.toLowerCase().includes(q) || c.province.toLowerCase().includes(q) || c.postalCode === q
      ) || null
    );
  }, [simQuery]);

  return (
    <div className="p-4 sm:p-7 space-y-6 max-w-7xl mx-auto font-sans text-xs">
      {/* HEADER SECTION */}
      <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted font-bold">
              Hub Logistik & Ekspedisi Nasional
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Pusat Logistik & Master Tarif 514 Kota
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            Peta interaktif Leaflet OSM, pin point pengiriman, dan rincian tarif 5 kurir resmi dari Kota Makassar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMonthlySyncCheck}
            disabled={syncLoading}
            className="px-3.5 py-2 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-xs font-bold text-text-primary hover:text-brand-accent transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw size={13} className={syncLoading ? "animate-spin" : ""} />
            <span>{syncLoading ? "Memeriksa..." : "Verifikasi Bulanan"}</span>
          </button>
        </div>
      </div>

      {/* BANNER STATUS SISTEM 5 EKSPEDISI MANDIRI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-surface to-brand-accent/5 border border-emerald-500/25 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-text-primary flex items-center gap-1.5">
                <Globe size={15} className="text-emerald-500" />
                <span>Master Database 514 Kota & Kabupaten (Origin Makassar: UPG)</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                ✓ 100% Mandiri Bebas API Berbayar
              </span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Tercakup 38 Provinsi dengan 5 Kurir Aktif: <strong className="text-text-primary">Lion Parcel, SiCepat Ekspres, Pos Indonesia, JNE Express, & J&T Express</strong>.
            </p>
          </div>

        </div>

        {syncResult && (
          <div className="p-3 rounded-xl bg-surface border border-border-subtle text-[11px] space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between font-bold text-emerald-400">
              <span>✓ Status: {syncResult.metrics?.pricingStatus} ({syncResult.metrics?.coverageLevel})</span>
              <span className="text-text-muted font-normal text-[10px]">{new Date(syncResult.executedAt).toLocaleString("id-ID")}</span>
            </div>
            <p className="text-text-secondary">{syncResult.message}</p>
          </div>
        )}
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-xs hover:opacity-80">✕</button>
        </div>
      )}

      {/* TAB NAVIGATION: MASTER 514 VS ZONA FALLBACK */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("master514")}
          className={`py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "master514"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "bg-surface text-text-muted hover:text-text-primary border border-border-subtle"
          }`}
        >
          <MapPin size={14} />
          <span>Database 514 Kota & Peta Leaflet (5 Kurir)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("zones")}
          className={`py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "zones"
              ? "bg-brand-accent text-canvas shadow-sm"
              : "bg-surface text-text-muted hover:text-text-primary border border-border-subtle"
          }`}
        >
          <Layers size={14} />
          <span>Zona Fallback Kustom ({zones.length} Rute)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MASTER DATABASE 514 KOTA + PETA LEAFLET INTERAKTIF */}
      {/* ======================================================== */}
      {activeTab === "master514" && (
        <div className="space-y-6 animate-fadeIn">
          {/* PETA INTERAKTIF LEAFLET OSM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary flex items-center gap-1.5 uppercase tracking-tight">
                  <Navigation size={15} className="text-brand-accent" />
                  <span>Peta Distribusi Logistik Makassar ke Nusantara</span>
                </h3>
                <p className="text-[11px] text-text-muted">
                  Klik tombol <strong>&quot;Lihat di Peta&quot;</strong> pada kota di tabel atau simulator untuk melihat titik tujuan dan rute logistik.
                </p>
              </div>
            </div>

            <ShippingHubLeafletMap selectedCity={selectedMapCity} heightClass="h-72 sm:h-96" />
          </div>

          {/* SIMULATOR CEK ONGKIR 5 KURIR LANGSUNG */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-subtle shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/50 pb-2.5">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-brand-accent" />
                <h3 className="font-bold text-sm text-text-primary uppercase tracking-tight">
                  Simulator Perbandingan 5 Ekspedisi Nasional
                </h3>
              </div>
              <span className="text-[11px] text-text-muted font-mono">
                Origin: Kota Makassar (UPG)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <input
                  type="text"
                  value={simQuery}
                  onChange={(e) => setSimQuery(e.target.value)}
                  placeholder="Ketik nama kota / kabupaten tujuan (misal: Surabaya, Jayapura, Kendari, Medan)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition shadow-inner"
                />
                {simQuery && (
                  <button
                    onClick={() => setSimQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-muted text-xs whitespace-nowrap font-medium">Berat Paket:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={simWeight}
                  onChange={(e) => setSimWeight(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary font-bold text-center text-xs"
                />
                <span className="text-text-muted text-xs">kg</span>
              </div>
            </div>

            {/* HASIL SIMULATOR 5 KURIR */}
            {simulatedCity ? (
              <div className="pt-2 space-y-2.5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-surface-elevated/70 p-3 rounded-xl border border-border-subtle">
                  <div>
                    <span className="font-bold text-text-primary text-sm">{simulatedCity.city}</span>
                    <span className="text-text-muted text-xs ml-2">
                      {simulatedCity.province} ({simulatedCity.region}) · Kode Pos {simulatedCity.postalCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMapCity(simulatedCity)}
                    className="px-3 py-1.5 rounded-lg bg-brand-accent text-canvas font-bold text-[11px] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer hover:brightness-110 active:scale-95 transition"
                  >
                    <MapPin size={12} />
                    <span>Fokuskan di Peta Leaflet</span>
                  </button>
                </div>

                {/* 5 Kurir Cards */}
                {(() => {
                  const mult = Math.ceil(simWeight);
                  const courierRates = [
                    { code: "LION", name: "Lion Parcel", service: "REGPACK (Air Cargo)", base: simulatedCity.lionReg, total: simulatedCity.lionReg * mult, etd: simulatedCity.etdDays },
                    { code: "SICEPAT", name: "SiCepat Ekspres", service: "SIUNTUNG (Cepat)", base: simulatedCity.sicepatReg, total: simulatedCity.sicepatReg * mult, etd: simulatedCity.etdDays },
                    { code: "POS", name: "Pos Indonesia", service: "KILAT KHUSUS", base: simulatedCity.posKilat, total: simulatedCity.posKilat * mult, etd: simulatedCity.etdDays },
                    { code: "JNE", name: "JNE Express", service: "REG Reguler", base: simulatedCity.jneReg, total: simulatedCity.jneReg * mult, etd: simulatedCity.etdDays },
                    { code: "JNT", name: "J&T Express", service: "EZ Reguler", base: simulatedCity.jntEz, total: simulatedCity.jntEz * mult, etd: simulatedCity.etdDays },
                  ].sort((a, b) => a.total - b.total);

                  const cheapest = courierRates[0]!;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {courierRates.map((cr) => {
                        const isCheapest = cr.code === cheapest.code;
                        return (
                          <div
                            key={cr.code}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                              isCheapest
                                ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                                : "bg-surface-elevated/40 border-border-subtle"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-xs text-text-primary">{cr.name}</span>
                                {isCheapest && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-canvas font-bold text-[9px]">
                                    TERMURAH
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-text-muted block">{cr.service}</span>
                              <span className="text-[10px] text-text-muted block">Estimasi: {cr.etd}</span>
                            </div>

                            <div className="pt-2 border-t border-border-subtle/50">
                              <span className="font-mono text-sm font-bold text-text-primary block">
                                Rp {cr.total.toLocaleString("id-ID")}
                              </span>
                              <span className="font-mono text-[9px] text-text-muted block">
                                (@ Rp {cr.base.toLocaleString("id-ID")}/kg × {mult} kg)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : simQuery.trim() ? (
              <p className="text-text-muted text-xs p-3 text-center bg-surface-elevated/30 rounded-xl">
                Kota &quot;{simQuery}&quot; tidak ditemukan di database 514 kota. Coba masukkan nama kota tanpa kata &quot;Kota&quot; atau &quot;Kabupaten&quot;.
              </p>
            ) : null}
          </div>

          {/* TABEL PENJELAJAH 514 KOTA & KABUPATEN */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-text-primary uppercase tracking-tight">
                  Penjelajah Data 514 Kota & Kabupaten
                </h3>
                <p className="text-[11px] text-text-muted">
                  Menampilkan {filteredMasterCities.length} dari 514 kota se-Indonesia dengan rincian tarif 5 ekspedisi.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-sm w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={masterSearch}
                  onChange={(e) => {
                    setMasterSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari kota, kabupaten, provinsi, kode pos..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition"
                />
              </div>
            </div>

            {/* Region Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRegion(r.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    selectedRegion === r.id
                      ? "bg-brand-accent text-canvas border-brand-accent"
                      : "bg-surface-elevated border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span>{r.label}</span>
                  <span className="ml-1 opacity-75 font-mono text-[10px]">({r.count})</span>
                </button>
              ))}
            </div>

            {/* Data Table */}
            <div className="rounded-xl border border-border-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-elevated text-text-muted uppercase text-[10px] border-b border-border-subtle">
                    <tr>
                      <th className="p-3 font-semibold">Kota / Kabupaten</th>
                      <th className="p-3 font-semibold">Provinsi</th>
                      <th className="p-3 font-semibold">Kode Pos</th>
                      <th className="p-3 font-semibold">Lion Parcel</th>
                      <th className="p-3 font-semibold">SiCepat</th>
                      <th className="p-3 font-semibold">Pos Indonesia</th>
                      <th className="p-3 font-semibold">JNE</th>
                      <th className="p-3 font-semibold">J&T</th>
                      <th className="p-3 font-semibold">Estimasi</th>
                      <th className="p-3 font-semibold">Kurir Termurah</th>
                      <th className="p-3 font-semibold text-right">Peta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {pagedCities.map((c) => {
                      const rates = [
                        { name: "Lion", cost: c.lionReg },
                        { name: "SiCepat", cost: c.sicepatReg },
                        { name: "Pos", cost: c.posKilat },
                        { name: "JNE", cost: c.jneReg },
                        { name: "J&T", cost: c.jntEz },
                      ].sort((a, b) => a.cost - b.cost);

                      const cheapest = rates[0]!;
                      const isSelected = selectedMapCity?.id === c.id;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-surface-elevated/60 transition ${
                            isSelected ? "bg-brand-accent/5 font-medium" : ""
                          }`}
                        >
                          <td className="p-3 font-bold text-text-primary whitespace-nowrap">
                            <span>{c.city}</span>
                            <span className="block text-[10px] text-text-muted font-normal">{c.region}</span>
                          </td>
                          <td className="p-3 text-text-secondary whitespace-nowrap">{c.province}</td>
                          <td className="p-3 font-mono text-text-muted">{c.postalCode}</td>
                          <td className="p-3 font-mono text-text-primary">
                            Rp {c.lionReg.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 font-mono text-text-primary">
                            Rp {c.sicepatReg.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 font-mono text-text-primary">
                            Rp {c.posKilat.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 font-mono text-text-primary">
                            Rp {c.jneReg.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 font-mono text-text-primary">
                            Rp {c.jntEz.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-text-muted whitespace-nowrap">{c.etdDays}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                              {cheapest.name} (Rp {cheapest.cost.toLocaleString("id-ID")})
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMapCity(c);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                isSelected
                                  ? "bg-brand-accent text-canvas border-brand-accent"
                                  : "bg-surface border-border-subtle text-text-muted hover:text-brand-accent hover:border-brand-accent"
                              }`}
                              title="Tampilkan di Peta Leaflet"
                            >
                              <MapPin size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3.5 bg-surface-elevated/40 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted">
                <span>
                  Menampilkan halaman <strong className="text-text-primary">{currentPage}</strong> dari{" "}
                  <strong className="text-text-primary">{totalPages}</strong> (Total {filteredMasterCities.length} kota)
                </span>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border-subtle bg-surface text-text-primary disabled:opacity-40 hover:bg-surface-elevated transition cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 font-mono font-bold text-text-primary text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-border-subtle bg-surface text-text-primary disabled:opacity-40 hover:bg-surface-elevated transition cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ZONA FALLBACK KUSTOM / MANUAL                     */}
      {/* ======================================================== */}
      {activeTab === "zones" && (
        <div className="space-y-6 animate-fadeIn">
          {/* TAMBAH ZONA MANUAL */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
              <div>
                <h3 className="font-bold text-sm text-text-primary">Tambah Zona Tarif Manual</h3>
                <p className="text-[11px] text-text-muted">Masukkan rute pengiriman manual untuk fallback darurat</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-text-muted mr-1">Preset:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.city}
                    type="button"
                    onClick={() => setForm({ ...p, sortOrder: 0 })}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle hover:border-brand-accent hover:text-brand-accent text-text-secondary text-[11px] font-medium transition cursor-pointer"
                  >
                    {p.city} ({p.courier})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Kota *</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Misal: Bone" required className="w-full px-2.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Provinsi *</label>
                <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Sulawesi Selatan" required className="w-full px-2.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Kurir *</label>
                <input value={form.courier} onChange={(e) => setForm({ ...form, courier: e.target.value })} placeholder="JNE / J&T" required className="w-full px-2.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Layanan *</label>
                <input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="REG / EZ" required className="w-full px-2.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Ongkir (Rp) *</label>
                <input type="number" value={form.costIdr} onChange={(e) => setForm({ ...form, costIdr: Number(e.target.value) })} placeholder="25000" required min={0} className="w-full px-2.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-text-muted mb-1 block">Estimasi *</label>
                <input value={form.etdLabel} onChange={(e) => setForm({ ...form, etdLabel: e.target.value })} placeholder="2-3 hari" required className="w-full px-2.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-accent transition" />
              </div>
              <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex items-end">
                <button type="submit" className="w-full py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:opacity-90 active:scale-95 transition cursor-pointer">
                  + Tambah
                </button>
              </div>
            </form>
          </div>

          {/* TABEL ZONA MANUAL */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-text-primary text-sm">
                  Daftar Zona Ekspedisi Fallback
                </span>
                <span className="text-text-muted text-xs ml-2">({zones.length} rute aktif)</span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter kota, provinsi, atau kurir..."
                className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border-subtle text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-brand-accent max-w-xs w-full transition"
              />
            </div>

            <div className="rounded-2xl border border-border-subtle overflow-hidden bg-surface shadow-sm">
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-elevated text-text-muted uppercase text-[10px] border-b border-border-subtle">
                    <tr>
                      <th className="p-3 font-semibold">Tujuan</th>
                      <th className="p-3 font-semibold">Kurir</th>
                      <th className="p-3 font-semibold">Tarif Dasar</th>
                      <th className="p-3 font-semibold">Estimasi</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {loading && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-text-muted">
                          Memuat data zona...
                        </td>
                      </tr>
                    )}
                    {zones
                      .filter((z) => {
                        if (!search.trim()) return true;
                        const q = search.toLowerCase();
                        return (
                          z.city.toLowerCase().includes(q) ||
                          z.province.toLowerCase().includes(q) ||
                          z.courier.toLowerCase().includes(q)
                        );
                      })
                      .map((z) => {
                        const ed = edits[z.id];
                        const isDefault = z.id === DEFAULT_ZONE_ID;
                        return (
                          <tr key={z.id} className={`transition hover:bg-surface-elevated/40 ${!z.isActive ? "opacity-50" : ""}`}>
                            <td className="p-3">
                              <span className="font-semibold text-text-primary block">{z.city}</span>
                              <span className="text-[11px] text-text-muted">{z.province}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border-subtle font-mono text-[11px] font-medium text-text-secondary">
                                {z.courier} {z.service}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-medium">
                              {ed ? (
                                <input
                                  type="number"
                                  value={ed.costIdr}
                                  onChange={(e) =>
                                    setEdits({ ...edits, [z.id]: { ...ed, costIdr: Number(e.target.value) } })
                                  }
                                  className="w-24 px-2 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary text-xs"
                                />
                              ) : (
                                <span className="text-text-primary">Rp {z.costIdr.toLocaleString("id-ID")}</span>
                              )}
                            </td>
                            <td className="p-3 text-text-muted">{z.etdLabel}</td>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggle(z)}
                                disabled={isDefault}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                                  z.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-surface text-text-muted border-border-subtle"
                                } disabled:opacity-40`}
                              >
                                {z.isActive ? "Aktif" : "Mati"}
                              </button>
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              {ed ? (
                                <button onClick={() => handleSaveRow(z)} className="px-3 py-1 rounded-lg bg-brand-accent text-canvas text-xs font-semibold hover:opacity-90 transition cursor-pointer">
                                  Simpan
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEdits({ ...edits, [z.id]: { costIdr: z.costIdr, etdLabel: z.etdLabel, sortOrder: z.sortOrder ?? 0 } })}
                                  className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-medium transition cursor-pointer"
                                >
                                  Edit
                                </button>
                              )}
                              {!isDefault && (
                                <button onClick={() => setAskingDelete(z)} className="px-2.5 py-1 rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition cursor-pointer">
                                  Hapus
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
        </div>
      )}

      <ConfirmDialog
        open={askingDelete !== null}
        title="Hapus zona tarif?"
        message={askingDelete ? `Hapus zona ${askingDelete.city} (${askingDelete.courier} ${askingDelete.service})? Rute ini tidak akan tersedia sebagai opsi fallback pengiriman.` : ""}
        confirmLabel="Ya, Hapus Zona"
        danger
        onConfirm={() => askingDelete && void handleDelete(askingDelete)}
        onCancel={() => setAskingDelete(null)}
      />
    </div>
  );
}
