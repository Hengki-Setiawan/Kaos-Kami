"use client";

import React, { useState } from "react";
import { MessageCircle, Copy, Check, Send, ChevronDown } from "lucide-react";
import { SHOP_WORKSHOP_ADDRESS } from "@/lib/shop";

interface AdminWhatsAppDispatchProps {
  recipientName: string;
  phoneNumber?: string | null;
  orderNumber: string;
  orderStatus: string;
  deliveryMethod: string;
  trackingNumber?: string | null;
}

export function AdminWhatsAppDispatch({
  recipientName,
  phoneNumber,
  orderNumber,
  orderStatus,
  deliveryMethod,
  trackingNumber,
}: AdminWhatsAppDispatchProps) {
  const cleanPhone = (phoneNumber || "").replace(/[^0-9]/g, "");
  const hasValidPhone = cleanPhone.length >= 10;

  // Normalisasi nomor ke awalan 62 untuk WhatsApp API
  const formattedPhone = cleanPhone.startsWith("0")
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone.startsWith("62")
    ? cleanPhone
    : `62${cleanPhone}`;

  const isPickup = deliveryMethod.toUpperCase().includes("PICKUP");

  const TEMPLATES = [
    {
      id: "queue",
      title: "Antrean Cetak DTF",
      message: `Halo Kak *${recipientName}*! Pesanan Anda *#${orderNumber}* saat ini sudah masuk antrean mesin sablon DTF Kaos Kami Makassar. Tim produksi kami sedang mempersiapkan film dan kaos polos Anda.`,
    },
    {
      id: "printing",
      title: "Sedang Naik Mesin / Oven",
      message: `Halo Kak *${recipientName}*! Update dari workshop Kaos Kami: Pesanan *#${orderNumber}* sedang dalam proses cetak DTF dan curing oven. Kami pastikan hasil sablon pekat dan tahan cuci.`,
    },
    {
      id: "qc_done",
      title: "Selesai Press & Lolos QC",
      message: `Halo Kak *${recipientName}*! Kabar baik, sablon pesanan *#${orderNumber}* telah selesai di-press dan *Lolos Quality Check (QC)* kami dengan hasil rapi dan tajam.`,
    },
    {
      id: "ready",
      title: isPickup ? "Siap Ambil di Workshop" : "Siap Kirim / Antar",
      message: isPickup
        ? `Halo Kak *${recipientName}*! Pesanan *#${orderNumber}* sudah selesai dan *SIAP DIAMBIL* di Workshop Kaos Kami (${SHOP_WORKSHOP_ADDRESS}). Silakan sebutkan nomor pesanan saat pengambilan.`
        : `Halo Kak *${recipientName}*! Pesanan *#${orderNumber}* sudah selesai di-packing dan siap diserahkan ke kurir pengantaran.`,
    },
    {
      id: "courier_depart",
      title: "🛵 Kurir Tim Berangkat (Antar Gratis Makassar)",
      message: `Halo Kak *${recipientName}*! Paket Kaos Kami untuk pesanan *#${orderNumber}* sedang dibawa oleh kurir workshop menuju lokasi Anda. Mohon pastikan nomor HP aktif ya Kak. Terima kasih!`,
    },
    {
      id: "shipped",
      title: "Resi Ekspedisi Terkirim",
      message: `Halo Kak *${recipientName}*! Pesanan *#${orderNumber}* telah kami serahkan ke ekspedisi pengiriman (${deliveryMethod}).\n\nNomor Resi: *${
        trackingNumber || "[Nomor Resi]"
      }*\n\nTerima kasih banyak telah memesan di Kaos Kami Makassar!`,
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]?.id ?? "queue");
  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState(TEMPLATES[0]?.message ?? "");

  const handleSelect = (tmplId: string) => {
    setSelectedTemplate(tmplId);
    const tmpl = TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) setCustomText(tmpl.message);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const waHref = hasValidPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customText)}`
    : "#";

  return (
    <div className="p-4 rounded-xl bg-surface/60 border border-white/5 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
        <span className="font-bold text-white flex items-center gap-1.5 uppercase text-[11px]">
          <MessageCircle size={14} className="text-[#25D366]" />
          <span>Quick Dispatch WhatsApp Customer</span>
        </span>
        {hasValidPhone ? (
          <span className="text-[10px] text-emerald-400 font-bold">
            +{formattedPhone}
          </span>
        ) : (
          <span className="text-[10px] text-rose-400 font-bold">
            No. WA Tidak Valid
          </span>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleSelect(tmpl.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
              selectedTemplate === tmpl.id
                ? "bg-[#25D366]/20 border-[#25D366]/50 text-[#25D366]"
                : "bg-black/20 border-white/10 text-text-muted hover:text-white"
            }`}
          >
            {tmpl.title}
          </button>
        ))}
      </div>

      {/* Editable Template Textarea */}
      <div>
        <textarea
          rows={3}
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-[11px] leading-relaxed resize-none focus:border-[#25D366] focus:outline-none"
          placeholder="Teks pesan WhatsApp..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? "Tersalin!" : "Salin Pesan"}</span>
        </button>

        {hasValidPhone ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3.5 rounded-lg bg-[#25D366] text-black hover:brightness-110 font-black text-[11px] flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(37,211,102,0.3)]"
          >
            <Send size={12} />
            <span>Kirim via WhatsApp Web / App</span>
          </a>
        ) : (
          <span className="text-[10px] text-text-muted italic">
            Nomor WA pelanggan tidak tersedia untuk pesan langsung.
          </span>
        )}
      </div>
    </div>
  );
}
