"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Camera,
  CheckCircle2,
  Loader2,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatIdr } from "@/lib/cartPriceRefresh";
import { Z_CLASS_QRIS } from "@/lib/zIndex";

export interface DirectQrisModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  qrImage?: string;
  qrString?: string;
  invoiceUrl?: string;
  onPaymentSuccess?: () => void;
}

export const DirectQrisModal: React.FC<DirectQrisModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  amountIdr,
  qrImage,
  qrString,
  invoiceUrl,
  onPaymentSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1800); // 30 menit batas waktu QRIS
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer 30 menit
  useEffect(() => {
    if (!isOpen || isPaid) return;
    const t = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [isOpen, isPaid]);

  // Real-time polling untuk mengecek apakah pembayaran sudah lunas
  useEffect(() => {
    if (!isOpen || !orderId || isPaid) return;

    let isSubscribed = true;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const order = data?.order || data;
        const status = order?.status;
        const paymentStatus = order?.payment?.status;

        if (
          status === "PAYMENT_CONFIRMED" ||
          status === "IN_PRODUCTION" ||
          status === "COMPLETED" ||
          paymentStatus === "SETTLEMENT" ||
          paymentStatus === "SETTLED"
        ) {
          if (isSubscribed) {
            setIsPaid(true);
            onPaymentSuccess?.();
            setTimeout(() => {
              window.location.href = invoiceUrl || `/orders/${orderId}?status=success`;
            }, 1800);
          }
        }
      } catch (err) {
        // Polling silent error
      }
    };

    // Polling setiap 3.5 detik
    pollTimerRef.current = setInterval(checkStatus, 3500);

    return () => {
      isSubscribed = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, orderId, isPaid, invoiceUrl, onPaymentSuccess]);

  // Unduh gambar QRIS langsung ke HP / PC
  const handleDownloadQris = async () => {
    if (!qrImage) {
      if (qrString) {
        copyQrString();
      }
      return;
    }
    setDownloading(true);
    try {
      // Ambil blob gambar jika URL eksternal atau langsung unduh
      const response = await fetch(qrImage, { mode: "cors" });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `QRIS-KAOSKAMI-${orderNumber || orderId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback jika CORS membatasi fetch langsung
      const a = document.createElement("a");
      a.href = qrImage;
      a.target = "_blank";
      a.download = `QRIS-KAOSKAMI-${orderNumber || orderId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  // Salin kode QR string ke clipboard
  const copyQrString = () => {
    if (!qrString) return;
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return createPortal(
    <div
      className={`fixed inset-0 ${Z_CLASS_QRIS} flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto`}
      data-lenis-prevent="true"
      role="dialog"
      aria-modal="true"
      aria-label="Modal Pembayaran Direct QRIS Kaos Kami"
    >
      <div
        className={`relative w-full max-w-md bg-surface border border-border-subtle rounded-3xl shadow-2xl text-text-primary overflow-hidden my-auto transition-all ${
          screenshotMode ? "ring-4 ring-brand-accent p-2" : ""
        }`}
      >
        {/* Garis aksen atas standar */}
        <div className="h-px w-full bg-border-subtle" />

        {/* Sukses Lunas Notification Overlay */}
        {isPaid && (
          <div className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-sans text-xl font-bold text-white mb-2">
              PEMBAYARAN BERHASIL DITERIMA!
            </h3>
            <p className="font-sans text-xs text-text-muted mb-4 max-w-xs">
              Terima kasih! Pesanan Anda telah resmi diverifikasi dan langsung diteruskan ke meja antrean sablon DTF workshop.
            </p>
            <div className="flex items-center gap-2 text-xs font-sans text-emerald-400">
              <Loader2 size={14} className="animate-spin" />
              Membuka invoice resmi...
            </div>
          </div>
        )}

        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface/90">
          <div className="flex items-center gap-2.5">
            <div className="px-2.5 py-1 rounded-md bg-white text-zinc-950 font-black text-[11px] tracking-wider uppercase font-sans">
              QRIS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-xs font-bold text-white tracking-wide">
                  BAYAR QRIS LANGSUNG
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-brand-accent/20 text-brand-accent border border-brand-accent/40 font-bold">
                  iPaymu Gateway
                </span>
              </div>
              <p className="font-sans tabular-nums text-[10px] text-text-muted">
                Order #{orderNumber || orderId.slice(0, 10)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-muted hover:text-white transition-colors"
            aria-label="Tutup modal QRIS"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Total Tagihan & Timer */}
          <div className="bg-black/40 border border-border-subtle rounded-2xl p-4 text-center">
            <span className="font-sans text-[10px] text-text-muted uppercase tracking-wider block mb-1">
              TOTAL TAGIHAN RESMI
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-black text-brand-accent tracking-tight tabular-nums">
              {formatIdr(amountIdr)}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-sans tabular-nums text-amber-400">
              <Clock size={12} />
              <span>Batas Waktu Bayar: </span>
              <span className="font-bold tabular-nums">{timeFormatted}</span>
            </div>
          </div>

          {/* Kotak Gambar QRIS */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-3 bg-white rounded-2xl shadow-xl border-4 border-white max-w-[240px] sm:max-w-[260px] aspect-square flex items-center justify-center">
              {qrImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrImage}
                  alt={`QRIS Kaos Kami Order ${orderNumber}`}
                  className="w-full h-full object-contain rounded-lg"
                  loading="eager"
                />
              ) : qrString ? (
                <div className="text-center p-4">
                  <p className="font-mono text-[10px] text-zinc-800 break-all mb-2">
                    {qrString}
                  </p>
                  <button
                    onClick={copyQrString}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-mono text-xs font-bold"
                  >
                    {copied ? "Tersalin!" : "Salin Kode QRIS"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-zinc-500">
                  <Loader2 size={28} className="animate-spin text-brand-accent mb-2" />
                  <span className="text-xs font-sans">Menyiapkan kode QRIS...</span>
                </div>
              )}
            </div>

            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-text-muted">
                <ShieldCheck size={12} className="text-emerald-400" />
                Diproses Aman oleh iPaymu Payment Gateway · QRIS Bebas Biaya
              </span>
            </div>
          </div>

          {/* Tombol Aksi: Screenshot & Unduh */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadQris}
              disabled={downloading || !qrImage}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand-accent text-canvas font-sans font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(230,81,0,0.25)]"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>{downloading ? "Mengunduh..." : "Unduh QRIS"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScreenshotMode(true);
                setTimeout(() => setScreenshotMode(false), 4000);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface border border-border-subtle text-text-primary font-sans font-semibold text-xs hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              <Camera size={14} className="text-amber-400" />
              <span>Screenshot</span>
            </button>
          </div>

          {/* Salin Kode Tambahan (jika string tersedia) */}
          {qrString && (
            <button
              type="button"
              onClick={copyQrString}
              className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-white font-sans text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? "Kode QRIS Berhasil Disalin" : "Salin Teks Kode QRIS"}</span>
            </button>
          )}

          {/* Panduan 4 Langkah Bayar Cepat */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 space-y-2">
            <span className="font-sans text-[11px] font-bold text-white flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" />
              Cara Bayar Cepat (1 Menit):
            </span>
            <ol className="font-sans text-[11px] text-text-muted space-y-1.5 list-decimal list-inside pl-0.5 leading-relaxed">
              <li>
                <strong className="text-text-primary">Screenshot</strong> layar ini atau klik tombol{" "}
                <strong className="text-text-primary">Unduh QRIS</strong> ke galeri.
              </li>
              <li>
                Buka <strong className="text-text-primary">m-Banking</strong> (BCA, Mandiri, BRI, BNI) atau{" "}
                <strong className="text-text-primary">e-Wallet</strong> (GoPay, OVO, Dana, ShopeePay).
              </li>
              <li>
                Pilih menu <strong className="text-text-primary">Bayar QRIS</strong> lalu klik ikon{" "}
                <strong className="text-text-primary">Ambil dari Galeri</strong>.
              </li>
              <li>
                Konfirmasi nominal dan bayar. Halaman ini akan otomatis terkonfirmasi lunas!
              </li>
            </ol>
          </div>

          {/* Status Polling Live Indicator */}
          <div className="flex items-center justify-between text-[11px] font-sans text-text-muted px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Menunggu pembayaran...
            </span>
            <a
              href={invoiceUrl || `/orders/${orderId}`}
              className="text-brand-accent hover:underline flex items-center gap-1"
            >
              <FileText size={11} />
              <span>Buka Invoice</span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
