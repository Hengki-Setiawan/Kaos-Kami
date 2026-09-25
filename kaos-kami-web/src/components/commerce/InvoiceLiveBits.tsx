"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";

/**
 * A7: samakan fallback redirect dgn Pop — cart dikosongkan HANYA saat kembali
 * dgn ?status=success (konfirmasi sukses sisi Duitku). Pending/close/error =
 * cart utuh agar retry tak kehilangan isi keranjang.
 */
export function ClearCartOnSuccess() {
  const params = useSearchParams();
  const clearedRef = useRef(false);
  useEffect(() => {
    if (clearedRef.current) return;
    if (params.get("status") === "success") {
      clearedRef.current = true;
      try {
        useCartStore.getState().clearCart();
      } catch {}
    }
  }, [params]);
  return null;
}

/** Batas bayar Duitku 24 jam sejak order dibuat. */
export const PAYMENT_EXPIRY_MS = 24 * 60 * 60 * 1000;

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h} jam ${m} mnt`;
}

/** I1: countdown deadline bayar dari createdAt DB (bukan tebakan client). */
export function PaymentDeadline({ createdAtISO }: { createdAtISO: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const deadline = new Date(createdAtISO).getTime() + PAYMENT_EXPIRY_MS;
  const left = deadline - now;
  if (Number.isNaN(deadline)) return null;
  if (left <= 0) {
    return (
      <p className="font-mono text-xs text-rose-400 font-bold">
        ⏰ Batas bayar terlewati — pesanan bisa dibatalkan otomatis. Minta link baru via WhatsApp bila masih mau lanjut.
      </p>
    );
  }
  const urgent = left < 2 * 60 * 60 * 1000;
  const dateStr = new Date(deadline).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <p className={`font-mono text-xs font-bold ${urgent ? "text-amber-400" : "text-text-muted"}`}>
      {urgent ? "⚠️ Segera bayar — " : "Bayar sebelum "}
      {dateStr} WITA (sisa {fmtLeft(left)})
    </p>
  );
}

/** I2: polling ringan status saat PENDING; refresh otomatis saat berubah. */
export function InvoiceStatusPoller({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const router = useRouter();
  const statusRef = useRef(initialStatus);
  useEffect(() => {
    if (initialStatus !== "PENDING_PAYMENT") return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/mobile/orders/${orderId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const st = String(data?.status || "");
        if (st && st !== statusRef.current) {
          statusRef.current = st;
          router.refresh();
        }
      } catch {}
    };
    const t = setInterval(() => {
      if (document.hidden) return;
      void tick();
    }, 10000);
    return () => {
      alive = false;
      clearInterval(t);
      void alive;
    };
  }, [orderId, initialStatus, router]);
  return null;
}

/** Tombol salin resi dgn fallback + pesan jujur. */
export function CopyResiButton({ resi }: { resi: string }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  const copy = async () => {
    setErr(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resi);
      } else {
        throw new Error("no-clipboard");
      }
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = resi;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const done = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!done) throw new Error("copy-failed");
      } catch {
        setErr(true);
        return;
      }
    }
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  };
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void copy()}
        className="py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] transition-all"
      >
        {ok ? "Tersalin!" : "Salin"}
      </button>
      {err && <span className="text-[10px] text-amber-400">Salin manual nomor di atas.</span>}
    </span>
  );
}
