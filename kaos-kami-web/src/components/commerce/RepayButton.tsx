"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bayar ulang (repay) dengan gerbang OTP WA — backend
 * POST /api/orders/:id/repay mewajibkan {phoneNumber, otpCode} milik
 * pemilik order (401/403 tanpa itu). Alur: nomor WA → kirim kode →
 * masukkan 6 digit → link baru. Link lama yang masih berlaku TIDAK
 * diputar (409) — user diarahkan pakai link lama.
 */
type Step = "idle" | "phone" | "code" | "busy" | "error";

async function postJson<T>(url: string, body: unknown, timeoutMs = 25000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      const err: any = new Error(data?.error || `Server error (${res.status}).`);
      err.status = res.status;
      err.reused = data?.reused === true;
      throw err;
    }
    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Server terlalu lama merespons. Coba lagi.");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export function RepayButton({ orderId }: { orderId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const p = phone.trim();
    if (p.replace(/[^0-9]/g, "").length < 9) {
      setMsg("Isi nomor WA pemilik order (min. 9 digit).");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await postJson("/api/auth/send-otp", { phoneNumber: p }, 20000);
      setStep("code");
      setMsg("Kode 6 digit dikirim via WA. Berlaku 5 menit.");
    } catch (e: any) {
      setMsg(e?.message || "Gagal kirim kode. Coba lagi atau minta link via WA di bawah.");
    } finally {
      setBusy(false);
    }
  };

  const repay = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setMsg("Kode OTP harus 6 digit angka.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const data = await postJson<{ paymentUrl?: string; alreadyPaid?: boolean }>(
        `/api/orders/${orderId}/repay`,
        { phoneNumber: phone.trim(), otpCode: code.trim() },
        30000
      );
      if (data.alreadyPaid) {
        window.location.reload();
        return;
      }
      if (!data.paymentUrl) throw new Error("Link bayar tidak tersedia");
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      if (e?.status === 409 || e?.reused) {
        setMsg("Link bayar sebelumnya masih berlaku. Gunakan link yang sudah dikirim (cek WA / riwayat browser).");
      } else if (e?.status === 403) {
        setMsg("Kode OTP bukan milik pemilik order ini.");
      } else {
        setMsg(e?.message || "Gagal. Minta link via WA di bawah.");
      }
      setStep("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {step === "idle" && (
        <button
          onClick={() => {
            setStep("phone");
            setMsg("");
          }}
          className="w-full py-3 px-4 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all"
        >
          💳 BAYAR ULANG SEKARANG
        </button>
      )}
      {(step === "phone" || step === "code" || step === "error") && (
        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <p className="font-mono text-[11px] text-text-muted text-center">
            Verifikasi nomor WA pemilik order untuk keamanan (anti link disebar).
          </p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={step === "code" || busy}
            inputMode="tel"
            autoComplete="tel"
            placeholder="Nomor WA pemilik order (08…)"
            aria-label="Nomor WA pemilik order"
            className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-brand-accent disabled:opacity-60"
          />
          {step !== "code" ? (
            <button
              onClick={sendCode}
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 font-mono font-bold text-xs uppercase tracking-wider hover:bg-white/20 disabled:opacity-50 transition-all"
            >
              {busy ? "MENGIRIM…" : "KIRIM KODE OTP"}
            </button>
          ) : (
            <>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                disabled={busy}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Kode OTP 6 digit"
                aria-label="Kode OTP 6 digit"
                className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-sm tracking-[0.3em] text-center text-white placeholder:text-text-muted placeholder:tracking-normal focus:outline-none focus:border-brand-accent disabled:opacity-60"
              />
              <button
                onClick={repay}
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-accent text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {busy ? "MEMBUAT LINK…" : "VERIFIKASI & BAYAR ULANG"}
              </button>
              <button
                onClick={() => {
                  setCode("");
                  setStep("phone");
                  setMsg("");
                }}
                disabled={busy}
                className="w-full py-1 font-mono text-[11px] text-text-muted underline underline-offset-2 disabled:opacity-50"
              >
                Ganti nomor / kirim ulang kode
              </button>
            </>
          )}
        </div>
      )}
      <p className="font-mono text-[10px] text-text-muted text-center">
        Link bayar sebelumnya yang masih berlaku tetap bisa dipakai — bayar SATU link saja.
      </p>
      {msg && (
        <p role="status" className="font-mono text-[11px] text-amber-300 text-center">
          {msg}
        </p>
      )}
    </div>
  );
}
