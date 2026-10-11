"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CustomerRoleSelect } from "@/components/admin/CustomerRoleSelect";
import {
  Search,
  Download,
  FileSpreadsheet,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Users,
  Shield,
  ShoppingBag,
  Filter,
} from "lucide-react";

interface CustomerItem {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string | null;
  emailVerified: boolean | null;
  createdAt: string | Date | null;
  totalSpentIdr: number;
  _count: {
    orders: number;
    designs: number;
  };
}

interface Props {
  initialUsers: CustomerItem[];
  myRole: string;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
}

function getInitials(name: string | null): string {
  if (!name) return "KK";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KK";
  if (parts.length === 1) return (parts[0] || "").slice(0, 2).toUpperCase();
  const first = parts[0] || "";
  const last = parts[parts.length - 1] || "";
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "KK";
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomerTableClient({
  initialUsers,
  myRole,
  totalCount,
  currentPage,
  totalPages,
  searchQuery,
}: Props) {
  const [filterSegment, setFilterSegment] = useState<"ALL" | "CUSTOMER" | "VIP" | "BUYER" | "STAFF">("ALL");
  const [hideBot, setHideBot] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saring data berdasarkan filter segment & bot toggle
  const filteredList = useMemo(() => {
    return initialUsers.filter((u) => {
      const haystack = `${u.name || ""} ${u.email || ""}`.toLowerCase();
      const isBot = haystack.includes("e2e") || haystack.includes("bot") || haystack.includes("test");
      if (hideBot && isBot) return false;

      const roleStr = String(u.role || "").toUpperCase();
      if (filterSegment === "CUSTOMER" && roleStr !== "CUSTOMER") return false;
      if (filterSegment === "STAFF" && roleStr === "CUSTOMER") return false;
      if (filterSegment === "VIP" && u.totalSpentIdr < 200000) return false;
      if (filterSegment === "BUYER" && u._count.orders === 0) return false;

      return true;
    });
  }, [initialUsers, filterSegment, hideBot]);

  const handleCopyPhone = (id: string, phone: string | null) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, "");
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportExcel = () => {
    const sanitize = (text: string | number | null) => {
      if (text === null || text === undefined) return "—";
      return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="Rp\\ #,##0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Data Pelanggan">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Nama Pelanggan</Data></Cell>
    <Cell><Data ss:Type="String">WhatsApp</Data></Cell>
    <Cell><Data ss:Type="String">Email</Data></Cell>
    <Cell><Data ss:Type="String">Role</Data></Cell>
    <Cell><Data ss:Type="String">Total Belanja</Data></Cell>
    <Cell><Data ss:Type="String">Jumlah Pesanan</Data></Cell>
    <Cell><Data ss:Type="String">Terdaftar</Data></Cell>
   </Row>
   ${filteredList.map((u) => `
   <Row>
    <Cell><Data ss:Type="String">${sanitize(u.name || "Tanpa Nama")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(u.phoneNumber || "—")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(u.email || "—")}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(u.role || "CUSTOMER")}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${u.totalSpentIdr || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${u._count.orders}</Data></Cell>
    <Cell><Data ss:Type="String">${sanitize(formatDate(u.createdAt))}</Data></Cell>
   </Row>`).join("")}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-pelanggan-kaos-kami-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const lines = [
      "Nama Pelanggan,WhatsApp,Email,Role,Total Belanja,Jumlah Pesanan,Terdaftar",
      ...filteredList.map((u) =>
        [
          `"${(u.name || "Tanpa Nama").replace(/"/g, '""')}"`,
          `"${(u.phoneNumber || "").replace(/"/g, '""')}"`,
          `"${(u.email || "").replace(/"/g, '""')}"`,
          `"${u.role || "CUSTOMER"}"`,
          u.totalSpentIdr || 0,
          u._count.orders || 0,
          `"${formatDate(u.createdAt)}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-pelanggan-kaos-kami-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* UNIFIED TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border-subtle">
        {/* Search Input */}
        <form method="get" className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Cari nama, WhatsApp, atau email..."
              maxLength={64}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-elevated/50 border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-accent text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-brand-accent text-canvas font-bold text-xs hover:opacity-90 transition shrink-0"
          >
            Cari
          </button>
          {searchQuery && (
            <Link
              href="/admin/customers"
              className="p-2 rounded-xl border border-border-subtle hover:bg-surface-elevated text-text-muted text-xs"
              title="Reset pencarian"
            >
              ✕
            </Link>
          )}
        </form>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={exportExcel}
            className="px-3 py-2 rounded-xl bg-surface-elevated/50 border border-border-subtle hover:border-emerald-500/50 hover:bg-emerald-500/5 text-text-primary font-semibold text-xs transition flex items-center gap-1.5"
            title="Download Spreadsheet Excel (.xls)"
          >
            <FileSpreadsheet size={14} className="text-emerald-500" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2 rounded-xl bg-surface-elevated/50 border border-border-subtle hover:border-border-strong text-text-muted hover:text-text-primary font-semibold text-xs transition flex items-center gap-1.5"
            title="Download CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER SEGMENTS & BOT TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-text-muted text-[11px] font-semibold mr-1 flex items-center gap-1">
            <Filter size={12} />
            <span>Filter:</span>
          </span>
          {[
            { id: "ALL", label: "Semua Akun" },
            { id: "CUSTOMER", label: "Pelanggan" },
            { id: "BUYER", label: "Pernah Order" },
            { id: "VIP", label: "VIP (> Rp 200rb)" },
            { id: "STAFF", label: "Staf / Admin" },
          ].map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setFilterSegment(seg.id as any)}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                filterSegment === seg.id
                  ? "bg-brand-accent text-canvas font-bold shadow-xs"
                  : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-muted text-[11px] cursor-pointer hover:text-text-primary transition">
          <input
            type="checkbox"
            checked={hideBot}
            onChange={(e) => setHideBot(e.target.checked)}
            className="rounded"
          />
          <span>Sembunyikan Akun Test/Bot</span>
        </label>
      </div>

      {/* MODERN MINIMALIST CUSTOMER TABLE */}
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-surface-elevated/60 border-b border-border-subtle text-[10px] uppercase font-bold text-text-muted">
              <tr>
                <th className="p-3.5">Pelanggan</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Total Belanja (LTV)</th>
                <th className="p-3.5">Aktivitas</th>
                <th className="p-3.5">Terdaftar</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    Tidak ada pelanggan yang sesuai dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              )}
              {filteredList.map((u) => {
                const rawPhone = (u.phoneNumber || "").replace(/[^0-9]/g, "");
                const cleanPhone = rawPhone.startsWith("08") ? `628${rawPhone.slice(2)}` : rawPhone;
                const waHref = cleanPhone.length >= 10
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Halo Kak ${u.name || "Customer"}, kami dari Workshop Kaos Kami Makassar...`)}`
                  : null;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-elevated/30 transition group"
                  >
                    {/* Pelanggan (Avatar + Nama + Kontak) */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-bold text-[11px] flex items-center justify-center shrink-0">
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-text-primary block truncate max-w-[200px]">
                            {u.name || "Tanpa Nama"}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                            <span className="truncate max-w-[130px]">{u.phoneNumber || u.email || "—"}</span>
                            {u.phoneNumber && (
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(u.id, u.phoneNumber)}
                                className="text-text-muted hover:text-text-primary transition"
                                title="Salin nomor WhatsApp"
                              >
                                {copiedId === u.id ? (
                                  <Check size={11} className="text-emerald-500" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-3.5">
                      <CustomerRoleSelect userId={u.id} role={u.role || "CUSTOMER"} myRole={myRole} />
                    </td>

                    {/* LTV */}
                    <td className="p-3.5 font-mono">
                      {u.totalSpentIdr > 0 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {Number(u.totalSpentIdr).toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-text-muted">Rp 0</span>
                      )}
                    </td>

                    {/* Aktivitas */}
                    <td className="p-3.5 font-mono text-text-muted">
                      <span>{u._count.orders} pesanan</span>
                      <span className="mx-1">•</span>
                      <span>{u._count.designs} desain</span>
                    </td>

                    {/* Terdaftar */}
                    <td className="p-3.5 text-text-muted font-mono text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Aksi Cepat */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {waHref && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-border-subtle hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition"
                            title="Buka Chat WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                        {u._count.orders > 0 && (
                          <Link
                            href={`/admin?q=${encodeURIComponent(u.name || u.email || "")}`}
                            className="p-1.5 rounded-lg border border-border-subtle hover:border-brand-accent/50 hover:bg-brand-accent/10 text-text-primary transition"
                            title="Lihat Riwayat Pesanan"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-border-subtle flex items-center justify-between bg-surface-elevated/20">
            <span className="text-text-muted text-[11px]">
              Halaman {currentPage} dari {totalPages} ({totalCount} total akun)
            </span>
            <div className="flex items-center gap-1.5">
              {currentPage > 1 ? (
                <Link
                  href={`/admin/customers?page=${currentPage - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary font-semibold text-xs hover:bg-surface-elevated transition"
                >
                  Sebelumnya
                </Link>
              ) : null}
              {currentPage < totalPages ? (
                <Link
                  href={`/admin/customers?page=${currentPage + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-text-primary font-semibold text-xs hover:bg-surface-elevated transition"
                >
                  Berikutnya
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
