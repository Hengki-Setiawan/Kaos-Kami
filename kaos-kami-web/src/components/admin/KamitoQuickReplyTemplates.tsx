"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageSquare, Copy, Check, ExternalLink, Sparkles } from "lucide-react";

interface QuickReply {
  id: string;
  title: string;
  badge: string;
  template: string;
}

const TEMPLATES: QuickReply[] = [
  {
    id: "confirm-design",
    title: "Konfirmasi File Desain & Pesanan",
    badge: "Antrean Masuk",
    template:
      "Halo Kak, pesanan kaos kustom kakak sudah kami terima di workshop Kaos Kami Makassar. File sablon saat ini sedang kami periksa kesiapannya sebelum dicetak ke film DTF.",
  },
  {
    id: "printing-started",
    title: "Proses Cetak Film & Heat Press",
    badge: "Sedang Produksi",
    template:
      "Halo Kak, pesanan kaos kakak sedang dalam proses cetak pada lembar film DTF 300 DPI dan persiapan heat press ke bahan garmen combed.",
  },
  {
    id: "ready-delivery",
    title: "Pesanan Selesai & Siap Diantar / Diambil",
    badge: "Siap Kirim",
    template:
      "Kabar baik Kak! Pesanan kaos kustom kakak sudah selesai diproduksi, lolos uji QC, dan dipacking rapi. Paket siap diantar oleh kurir kami / siap diambil di workshop.",
  },
  {
    id: "request-hd-asset",
    title: "Permintaan File Resolusi Tinggi (300 DPI)",
    badge: "Revisi File",
    template:
      "Halo Kak, file gambar yang diunggah resolusinya agak buram untuk hasil sablon tajam. Bisakah kirimkan file desain mentahan dengan format PNG transparan atau PDF 300 DPI?",
  },
];

export function KamitoQuickReplyTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/50 pb-3">
        <div>
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={16} className="text-brand-accent" />
            <span>Template Balasan Cepat Kamito Live Chat</span>
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Pesan terstandarisasi untuk merespons pelanggan di Live Chat Kamito dan WhatsApp workshop.
          </p>
        </div>

        <Link
          href="/admin/chat"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent font-bold text-xs transition-colors self-start sm:self-auto"
        >
          <span>Buka Pusat Live Chat</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-canvas border border-border-subtle flex flex-col justify-between space-y-3 hover:border-brand-accent/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-text-primary">{item.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed font-sans bg-surface/50 p-2.5 rounded-lg border border-border-subtle/40">
                  &ldquo;{item.template}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-subtle/40">
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.template)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-text-primary hover:text-brand-accent transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check size={13} className="text-emerald-500" />
                      <span className="text-emerald-500">Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin Pesan</span>
                    </>
                  )}
                </button>

                <Link
                  href="/admin/chat"
                  className="text-[11px] font-medium text-brand-accent hover:underline inline-flex items-center gap-1"
                >
                  <span>Gunakan di Chat</span>
                  <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
