"use client";

import React, { useState } from "react";
import { MessageSquare, Copy, Check, X, FileText, Printer, Truck, HelpCircle } from "lucide-react";

export interface QuickReplyTemplate {
  id: string;
  category: "FILE" | "PRODUKSI" | "PENGIRIMAN" | "KONSULTASI";
  title: string;
  shortLabel: string;
  text: string;
}

export const KAMITO_QUICK_REPLIES: QuickReplyTemplate[] = [
  {
    id: "confirm-design",
    category: "FILE",
    title: "Konfirmasi File Desain & Antrean",
    shortLabel: "Konfirmasi File",
    text: "Halo Kak, file sablon pesanan Anda telah kami terima di workshop Kaos Kami Makassar dan sedang diperiksa kesiapannya sebelum dicetak ke film DTF.",
  },
  {
    id: "request-hd",
    category: "FILE",
    title: "Permintaan File 300 DPI / Vektor",
    shortLabel: "Minta File 300 DPI",
    text: "Halo Kak, file gambar yang diunggah resolusinya agak buram untuk hasil sablon tajam. Mohon kirimkan file resolusi tinggi (format PNG transparan atau PDF minimal 300 DPI) agar hasil cetak maksimal.",
  },
  {
    id: "gang-queue",
    category: "PRODUKSI",
    title: "Antrean Cetak Roll Film DTF",
    shortLabel: "Antrean Cetak Film",
    text: "Halo Kak, desain Anda saat ini sudah masuk ke antrean cetak roll film DTF 300 DPI dengan tinta CMYK + White premium di workshop kami.",
  },
  {
    id: "heatpress-curing",
    category: "PRODUKSI",
    title: "Proses Heat Press & Curing Oven",
    shortLabel: "Proses Heat Press",
    text: "Halo Kak, lembar film DTF sudah selesai dicetak dan sekarang sedang dipress pada garmen pilihan Anda di suhu 160°C lalu proses curing oven.",
  },
  {
    id: "qc-passed",
    category: "PRODUKSI",
    title: "Lolos Uji Quality Check (QC)",
    shortLabel: "Lolos QC & Packing",
    text: "Kabar baik Kak! Kaos kustom Anda telah selesai dipress, lolos uji QC (pekat, presisi, elastis), dan saat ini sedang dipack rapi ke polymailer.",
  },
  {
    id: "ready-pickup",
    category: "PENGIRIMAN",
    title: "Pesanan Siap Diambil di Workshop",
    shortLabel: "Siap Diambil",
    text: "Halo Kak, pesanan Anda sudah SIAP DIAMBIL di Workshop Kaos Kami (Jl. Galangan Kapal, Kec. Tallo, Makassar). Jam operasional: 09.00 - 21.00 WITA. Cukup tunjukkan nomor pesanan saat datang.",
  },
  {
    id: "courier-dispatched",
    category: "PENGIRIMAN",
    title: "Kurir Armada Workshop Berangkat",
    shortLabel: "Kurir Berangkat",
    text: "Halo Kak, kurir armada Kaos Kami sudah berangkat mengantar paket pesanan Anda ke alamat tujuan se-Makassar. Mohon standby penerima di lokasi ya Kak.",
  },
  {
    id: "tracking-resi",
    category: "PENGIRIMAN",
    title: "Resi Pengiriman Ekspedisi",
    shortLabel: "Resi Ekspedisi",
    text: "Halo Kak, paket pesanan Anda telah kami serahkan ke ekspedisi nasional. Nomor resi pelacakan resmi dapat dicek langsung pada rincian invoice pesanan Anda.",
  },
  {
    id: "material-info",
    category: "KONSULTASI",
    title: "Perbedaan Cotton Combed 24s vs 30s",
    shortLabel: "Info Bahan Kaos",
    text: "Bahan Cotton Combed 24s berbobot ~185 GSM (lebih tebal, kokoh, dan jatuh rapi). Combed 30s berbobot ~150 GSM (lebih ringan, adem, dan fleksibel). Keduanya 100% serat katun murni standar distro.",
  },
  {
    id: "wash-care",
    category: "KONSULTASI",
    title: "Panduan Perawatan Sablon DTF",
    shortLabel: "Tips Rawat Sablon",
    text: "Tips merawat sablon DTF: Balik kaos saat mencuci (sablon di bagian dalam), cuci dengan air dingin, hindari pemutih keras, dan jangan menyetrika langsung di atas area gambar.",
  },
];

export function ChatQuickMacros({
  onPick,
  disabled = false,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getCategoryIcon = (cat: QuickReplyTemplate["category"]) => {
    switch (cat) {
      case "FILE":
        return <FileText size={11} className="text-blue-500 shrink-0" />;
      case "PRODUKSI":
        return <Printer size={11} className="text-amber-500 shrink-0" />;
      case "PENGIRIMAN":
        return <Truck size={11} className="text-emerald-500 shrink-0" />;
      case "KONSULTASI":
        return <HelpCircle size={11} className="text-purple-500 shrink-0" />;
    }
  };

  return (
    <>
      {/* Compact Quick Bar above Message Input */}
      <div
        className="px-3 py-1.5 bg-surface/90 border-t border-border-subtle flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs"
        aria-label="Balasan cepat chat"
      >
        <span className="text-[10px] font-sans text-text-muted uppercase font-bold shrink-0 tracking-wider">
          Balasan:
        </span>

        {KAMITO_QUICK_REPLIES.slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(item.text)}
            title={item.text}
            className="px-2.5 py-1 rounded-lg bg-canvas border border-border-subtle hover:border-brand-accent/50 text-[11px] text-text-secondary hover:text-text-primary whitespace-nowrap transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            {getCategoryIcon(item.category)}
            <span>{item.shortLabel}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-brand-accent/10 border border-brand-accent/30 hover:bg-brand-accent/20 text-brand-accent font-bold text-[11px] whitespace-nowrap transition-colors ml-auto shrink-0 cursor-pointer"
        >
          Semua Template ({KAMITO_QUICK_REPLIES.length})
        </button>
      </div>

      {/* Modal Daftar Lengkap Template (Ukuran Ringkas & Kompak) */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-surface border border-border-subtle rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-primary uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare size={15} className="text-brand-accent" />
                  <span>Daftar Template Balasan CS Kamito</span>
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Klik &quot;Gunakan&quot; untuk memasukkan ke chat atau salin teks langsung ke clipboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Compact List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-border-subtle/40">
              {KAMITO_QUICK_REPLIES.map((item) => {
                const isCopied = copiedId === item.id;
                return (
                  <div key={item.id} className="pt-2.5 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                        {getCategoryIcon(item.category)}
                        <span>{item.title}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.text)}
                          className="px-2 py-1 rounded bg-canvas border border-border-subtle text-[10px] font-bold text-text-secondary hover:text-text-primary hover:border-brand-accent/50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>{isCopied ? "Tersalin" : "Salin"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onPick(item.text);
                            setModalOpen(false);
                          }}
                          disabled={disabled}
                          className="px-2.5 py-1 rounded bg-brand-accent text-white text-[10px] font-bold hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          Gunakan
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted bg-canvas/60 p-2 rounded-lg border border-border-subtle/40 leading-relaxed font-mono text-[11px]">
                      &ldquo;{item.text}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-canvas border-t border-border-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs font-bold text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
