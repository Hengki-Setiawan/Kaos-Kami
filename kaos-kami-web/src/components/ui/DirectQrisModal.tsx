"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  X,
  Download,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
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
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  // P0.3 (23 Okt 2026): QR dirender LOKAL dari QrString resmi iPaymu (lib qrcode) —
  // tidak lagi melewati pihak ketiga. DataURL dihasilkan di klien.
  const [localQrDataUrl, setLocalQrDataUrl] = useState<string | null>(null);
  const [qrRenderFailed, setQrRenderFailed] = useState(false);
  // Docs resmi iPaymu: QRIS TIDAK BISA di-custom expired — default 5 MENIT.
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(300); // 5 menit
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bersihkan state QR saat modal ditutup/dibuka ulang (QR baru = regenerasi)
  useEffect(() => {
    if (!isOpen) {
      setLocalQrDataUrl(null);
      setQrRenderFailed(false);
      setTimeLeftSeconds(300);
    }
  }, [isOpen]);

  // Generasi QR lokal dari QrString resmi (P0.3)
  useEffect(() => {
    if (!isOpen || !qrString) return;
    let active = true;
    QRCode.toDataURL(qrString, {
      width: 600,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0e0e10", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setLocalQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrRenderFailed(true);
      });
    return () => {
      active = false;
    };
  }, [isOpen, qrString]);

  // Ekstrak NMID dari QR string jika ada (standar ASPI QRIS). NMID TIDAK lagi di-fabricate bila QR tak memuat.
  const nmidMatch = qrString?.match(/0215(ID[0-9A-Z]+)/);
  const nmid = nmidMatch ? nmidMatch[1] : null;

  // Countdown timer 5 menit (standar expired QRIS docs iPaymu)
  useEffect(() => {
    if (!isOpen || isPaid) return;
    const t = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [isOpen, isPaid]);

  // Real-time polling deteksi pembayaran otomatis
  useEffect(() => {
    if (!isOpen || !orderId || isPaid) return;

    let isSubscribed = true;
    const checkStatus = async () => {
      try {
        let res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (!res.ok) {
          res = await fetch(`/api/mobile/orders/${orderId}/status`, { cache: "no-store" });
        }
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const order = data?.order || data;
        const status = order?.status || data?.status;
        const paymentStatus = order?.payment?.status || data?.payment?.status;

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
      } catch {
        // Polling silent error
      }
    };

    pollTimerRef.current = setInterval(checkStatus, 3000);

    return () => {
      isSubscribed = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, orderId, isPaid, invoiceUrl, onPaymentSuccess]);

  // Unduh gambar QRIS langsung ke HP / PC — dari dataURL lokal ATAU qrImage (bila ada)
  const handleDownloadQris = async () => {
    const source = localQrDataUrl || qrImage;
    if (!source) {
      if (qrString) copyQrString();
      return;
    }
    setDownloading(true);
    // dataURL lokal: bisa diunduh langsung tanpa fetch blob
    if (source.startsWith("data:image/")) {
      const a = document.createElement("a");
      a.href = source;
      a.download = `QRIS-KAOSKAMI-${orderNumber || orderId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloading(false);
      return;
    }
    try {
      const response = await fetch(source, { mode: "cors" });
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
      const a = document.createElement("a");
      a.href = source;
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
      className={`fixed inset-0 ${Z_CLASS_QRIS} flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto`}
      style={{ zIndex: 150 }}
      data-lenis-prevent="true"
      role="dialog"
      aria-modal="true"
      aria-label="Modal Pembayaran Direct QRIS Kaos Kami"
    >
      <div
        className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-zinc-200/80 text-zinc-900 overflow-hidden my-auto transition-all"
      >
        {/* Sukses Lunas Notification Overlay */}
        {isPaid && (
          <div className="absolute inset-0 z-30 bg-white/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-sans text-lg font-bold text-zinc-900 mb-1 tracking-tight">
              Pembayaran Berhasil!
            </h3>
            <p className="font-sans text-xs text-zinc-600 mb-4 max-w-xs leading-relaxed">
              Pesanan Anda telah lunas dan otomatis masuk antrean cetak sablon DTF workshop Kaos Kami.
            </p>
            <div className="flex items-center gap-2 text-xs font-sans text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
              <Loader2 size={13} className="animate-spin text-emerald-600" />
              Membuka invoice pesanan...
            </div>
          </div>
        )}

        {/* Header Bar: Bersih & Minimalis */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            {/* National QRIS Logo Minimalis */}
            <div className="px-2 py-0.5 rounded bg-[#EE2E24] text-white font-black text-[11px] tracking-tight font-sans leading-none">
              QRIS
            </div>
            {/* iPaymu Partner Badge */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[9px] tracking-wide">
              <ShieldCheck size={10} className="text-blue-600" />
              <span>iPaymu Gateway</span>
            </div>
            <div className="leading-tight">
              <h3 className="font-sans text-xs font-bold text-zinc-800">
                Pembayaran QRIS
              </h3>
              <p className="font-mono text-[10px] text-zinc-500">
                Order #{orderNumber || orderId.slice(0, 10)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Tutup modal QRIS"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body: Switchable between QRIS and In-App Invoice */}
        {showQuickInvoice ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Ringkasan Tagihan Resmi
                </span>
                <h4 className="text-sm font-bold text-zinc-900 mt-1">Invoice #{orderNumber || orderId.slice(0, 10)}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickInvoice(false)}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>← Kembali ke QRIS</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Status Tagihan:</span>
                <span className="font-bold text-amber-600">Menunggu Pembayaran</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Metode Bayar:</span>
                <span className="font-bold text-zinc-800">Direct QRIS (iPaymu)</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>NMID:</span>
                <span className="font-mono text-zinc-800">{nmid}</span>
              </div>
              <div className="flex justify-between text-zinc-600 pt-2 border-t border-zinc-200 text-sm font-bold">
                <span className="text-zinc-900">Total Pembayaran:</span>
                <span className="font-mono text-blue-600 text-base">Rp {amountIdr.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed text-center">
              Setelah pembayaran berhasil diverifikasi oleh iPaymu, tiket produksi sablon DTF langsung diterbitkan di workshop Kaos Kami.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span>🖨️ Cetak / PDF</span>
              </button>
              <a
                href={invoiceUrl || `/orders/${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <span>Buka di Tab Baru</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Tagihan & Timer */}
            <div className="text-center pb-1">
              <span className="font-sans text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                Total Tagihan
              </span>
              <div className="font-mono text-3xl font-extrabold text-zinc-900 tracking-tight mt-0.5 tabular-nums">
                Rp {amountIdr.toLocaleString("id-ID")}
              </div>

              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                <span className="font-sans">QRIS aktif 5 menit (standar QRIS):</span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                  <Clock size={11} className="text-amber-600" />
                  {timeFormatted}
                </span>
              </div>
            </div>

            {/* Kotak QR Code Bersih (Light Viewfinder) */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl w-[240px] aspect-square flex items-center justify-center shadow-xs">
                {timeLeftSeconds === 0 && !isPaid ? (
                  /* P0.3: QRIS kedaluwarsa (5 menit, docs iPaymu) — QR lama mati otomatis */
                  <div className="flex flex-col items-center justify-center p-5 text-center">
                    <Clock size={26} className="text-amber-500 mb-2" />
                    <span className="text-xs font-semibold text-zinc-700 mb-1">QRIS kedaluwarsa</span>
                    <span className="text-[11px] text-zinc-500 leading-relaxed">
                      Buka invoice lalu gunakan tombol <strong className="text-zinc-700">Bayar Ulang</strong> untuk mengeluarkan
                      kode QRIS yang baru.
                    </span>
                    <a
                      href={invoiceUrl || `/orders/${orderId}`}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-[11px] font-bold hover:bg-zinc-800 cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      <span>Buka Invoice / Bayar Ulang</span>
                    </a>
                  </div>
                ) : localQrDataUrl || qrImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={localQrDataUrl || qrImage}
                    alt={`QRIS Kaos Kami Order ${orderNumber}`}
                    className="w-full h-full object-contain rounded-lg"
                    loading="eager"
                  />
                ) : qrString && !qrRenderFailed ? (
                  /* Render lokal sedang berjalan */
                  <div className="flex flex-col items-center justify-center p-6 text-zinc-400">
                    <Loader2 size={24} className="animate-spin text-blue-600 mb-2" />
                    <span className="text-xs font-sans text-zinc-500">Merender QRIS lokal...</span>
                  </div>
                ) : qrString && qrRenderFailed ? (
                  <div className="text-center p-3">
                    <p className="font-mono text-[10px] text-zinc-700 break-all mb-2 max-h-32 overflow-y-auto">
                      {qrString}
                    </p>
                    <button
                      onClick={copyQrString}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-mono text-xs font-bold hover:bg-zinc-800 cursor-pointer"
                    >
                      {copied ? "Tersalin!" : "Salin Kode QRIS"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-zinc-400">
                    <Loader2 size={24} className="animate-spin text-blue-600 mb-2" />
                    <span className="text-xs font-sans text-zinc-500">Menyiapkan QRIS...</span>
                  </div>
                )}
              </div>

              {/* Info NMID Ringkas — hanya bila QR memuat NMID (tidak difabricate) */}
              {nmid && (
                <div className="mt-2 text-center">
                  <span className="font-mono text-[10px] text-zinc-400">
                    NMID: {nmid}
                  </span>
                </div>
              )}
            </div>

            {/* Tombol Aksi: Unduh QRIS & Salin Kode */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadQris}
                disabled={downloading || (!localQrDataUrl && !qrImage)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-xs active:scale-[0.98] transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {downloading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                <span>{downloading ? "Mengunduh..." : "Unduh QRIS"}</span>
              </button>

              <button
                type="button"
                onClick={copyQrString}
                disabled={!qrString}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-sans font-semibold text-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? "Tersalin!" : "Salin Kode"}</span>
              </button>
            </div>

            {/* Supported m-Banking & e-Wallets Note */}
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-center">
              <p className="font-sans text-[10px] text-zinc-500 leading-relaxed flex items-center justify-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                <span>Scan via BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay</span>
              </p>
            </div>

            {/* Realtime Footer Status */}
            <div className="flex items-center justify-between text-[10px] font-sans pt-1 border-t border-zinc-100 text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Menunggu pembayaran...</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickInvoice(true)}
                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                >
                  <span>Lihat Invoice</span>
                </button>
                <span className="text-zinc-300">|</span>
                <a
                  href={invoiceUrl || `/orders/${orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 cursor-pointer"
                  title="Buka invoice kanonis di tab baru"
                >
                  <span>Tab Baru</span>
                  <ExternalLink size={9} />
                </a>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
