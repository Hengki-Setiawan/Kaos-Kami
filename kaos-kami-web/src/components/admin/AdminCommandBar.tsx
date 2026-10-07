"use client";

/**
 * AdminCommandBar — command palette Ctrl+K panel admin (Blueprint Bab 12/32).
 *
 * Cakupan SENGAJA minimal (tanpa dependensi baru — tanpa cmdk/radix):
 * - div + input + keyboard listener + createPortal (react-dom, sudah ada).
 * - Aksi navigasi saja (read-only): 5 menu utama + 8 sub-modul + antrean
 *   review desain. TIDAK menyentuh API/DB/logika bisnis.
 * - Cari order by number: fetch GET /api/admin/orders?q=... (kontrak asli
 *   memakai param `q`, bukan `search`) lalu navigasi ke /admin/orders/[id].
 *   Bila API gagal/rate-limited → fallback navigasi ke /admin/orders?q=...
 *   (halaman daftar server-side mendukung ?q=).
 *
 * Hemat kuota API: fetch hanya bila query >= 3 karakter, debounce 300ms,
 * limit 6 (endpoint dibatasi 30 req/menit/IP — lihat route.ts).
 *
 * Perilaku keyboard: Ctrl+K / Cmd+K buka-tutup, Esc tutup (+ kembalikan fokus
 * ke pemicu), ArrowUp/Down pindah sorotan, Enter jalankan, Tab dijebak di
 * dalam dialog (fokus trap sederhana).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";
import {
  buildOrderApiUrl,
  buildOrderSearchUrl,
  filterPaletteActions,
  parseOrderHits,
  visiblePaletteActions,
  type OrderHit,
} from "@/components/admin/adminCommandPalette";

// Re-ekspor agar impor tunggal tetap bisa dari komponen (kompatibilitas).
export * from "@/components/admin/adminCommandPalette";

const MIN_QUERY_FOR_API = 3;
const DEBOUNCE_MS = 300;
const FETCH_TIMEOUT_MS = 15000;

export function AdminCommandBar({ role }: { role?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [hits, setHits] = useState<OrderHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIdx(0);
    setHits([]);
    setSearching(false);
    // Kembalikan fokus ke pemicu (aksesibilitas keyboard).
    triggerRef.current?.focus();
  }, []);

  // Ctrl+K / Cmd+K global (buka-tutup); Esc global saat terbuka.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => {
          if (v) {
            setQuery("");
            setActiveIdx(0);
            setHits([]);
            setSearching(false);
            triggerRef.current?.focus();
            return false;
          }
          return true;
        });
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Autofokus input tiap dibuka.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Kunci scroll body selama palette terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Saran order via API (debounce; hanya query >= 3 karakter).
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < MIN_QUERY_FOR_API) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      fetch(buildOrderApiUrl(q), { signal: ctrl.signal, cache: "no-store" })
        .then((res) => (res.ok ? res.json().catch(() => null) : null))
        .then((json) => {
          if (ctrl.signal.aborted) return;
          setHits(parseOrderHits(json) ?? []);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setHits([]);
        })
        .finally(() => {
          clearTimeout(t);
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open]);

  const navMatches = useMemo(
    () => filterPaletteActions(visiblePaletteActions(role), query),
    [query, role]
  );

  // Daftar gabungan: aksi navigasi + hit order + fallback "cari di daftar".
  const items = useMemo(() => {
    const list: Array<{ key: string; label: string; sub: string; href: string }> = navMatches.map(
      (a) => ({ key: a.id, label: a.label, sub: a.hint, href: a.href })
    );
    for (const h of hits) {
      if (list.some((i) => i.key === `order-${h.id}`)) continue;
      list.push({
        key: `order-${h.id}`,
        label: `Order #${h.orderNumber}`,
        sub: `${h.status} · buka detail`,
        href: `/admin/orders/${h.id}`,
      });
    }
    const q = query.trim();
    if (q.length >= 2) {
      list.push({
        key: "__fallback-search",
        label: `Cari "${q.slice(0, 40)}" di daftar pesanan`,
        sub: "/admin/orders?q=…",
        href: buildOrderSearchUrl(q),
      });
    }
    return list;
  }, [navMatches, hits, query]);

  // Jaga indeks sorotan tetap dalam rentang.
  useEffect(() => {
    setActiveIdx((i) => (items.length === 0 ? 0 : Math.min(i, items.length - 1)));
  }, [items.length]);

  const runItem = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      setOpen(false);
      setQuery("");
      setActiveIdx(0);
      setHits([]);
      setSearching(false);
      router.push(item.href);
    },
    [items, router]
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(activeIdx);
    }
  };

  // Fokus trap sederhana: Tab berputar di dalam dialog.
  const onDialogKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka palet perintah (Ctrl+K)"
        aria-haspopup="dialog"
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-black/[0.03] dark:bg-white/[0.03] text-text-muted hover:text-text-primary hover:border-brand-accent/50 transition-all text-xs"
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1 text-left truncate">Cari menu / no. order…</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-border-subtle bg-surface font-mono text-[10px] font-bold">
          Ctrl K
        </kbd>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-start justify-center p-4 pt-[12vh] bg-black/70 backdrop-blur-sm"
            onClick={close}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Palet perintah admin"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onDialogKey}
              className="w-full max-w-lg rounded-2xl bg-surface border border-border-subtle shadow-2xl overflow-hidden font-sans"
            >
              <div className="flex items-center gap-2 px-4 border-b border-border-subtle">
                <Search size={16} className="text-text-muted shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value.slice(0, 40));
                    setActiveIdx(0);
                  }}
                  onKeyDown={onInputKey}
                  placeholder="Ketik menu atau no. order (min. 3 huruf untuk saran order)…"
                  maxLength={40}
                  aria-label="Cari menu atau nomor order"
                  aria-expanded="true"
                  aria-controls="admin-command-list"
                  role="combobox"
                  autoComplete="off"
                  className="flex-1 py-3 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                {searching ? (
                  <Loader2 size={15} className="animate-spin text-text-muted shrink-0" />
                ) : (
                  <kbd className="px-1.5 py-0.5 rounded border border-border-subtle font-mono text-[10px] text-text-muted shrink-0">
                    ESC
                  </kbd>
                )}
              </div>

              <div id="admin-command-list" role="listbox" aria-label="Hasil palet perintah" className="max-h-[50vh] overflow-y-auto p-1.5">
                {items.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-text-muted">
                    {query.trim()
                      ? "Tidak ada menu yang cocok. Tekan Enter untuk cari di daftar pesanan."
                      : "Ketik untuk mencari 14 aksi navigasi admin."}
                  </p>
                ) : (
                  items.map((item, idx) => (
                    <button
                      key={item.key}
                      type="button"
                      role="option"
                      aria-selected={idx === activeIdx}
                      onClick={() => runItem(idx)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                        idx === activeIdx
                          ? "bg-brand-accent/10 text-text-primary"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold truncate">{item.label}</span>
                        <span className="block font-mono text-[10px] text-text-muted truncate">{item.sub}</span>
                      </span>
                      {idx === activeIdx && (
                        <CornerDownLeft size={13} className="text-brand-accent shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-3 font-mono text-[10px] text-text-muted">
                <span>↑↓ pilih</span>
                <span>Enter buka</span>
                <span>Esc tutup</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
