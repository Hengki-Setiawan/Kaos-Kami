"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Printer,
  Package,
  MapPin,
  Phone,
  Truck,
  Store,
  CheckCircle2,
  ShieldCheck,
  FileText,
  QrCode,
  Bluetooth,
  RotateCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SHOP_WORKSHOP_ADDRESS, SHOP_CONTACT_WHATSAPP, SHOP_POSTAL_CODE } from "@/lib/shop";
import { printThermalViaBluetooth, isWebBluetoothSupported } from "@/lib/printer/bluetoothThermal";

export interface DeliveryLabelOrder {
  id: string;
  orderNumber: string;
  trackingNumber?: string | null;
  deliveryMethod?: string | null;
  courierNotes?: string | null;
  totalIdr?: number | null;
  createdAt?: string | Date;
  user?: {
    name?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  } | null;
  shippingAddress?: any;
  items?: {
    snapshotName?: string | null;
    snapshotSize?: string | null;
    snapshotColorName?: string | null;
    quantity: number;
    productVariant?: any;
  }[];
}

interface ThermalShippingLabelModalProps {
  order: DeliveryLabelOrder;
  onClose: () => void;
}

// Generator SVG Barcode (Code 39 Standar Logistik) - 100% Monokrom Hitam-Putih
function SvgBarcode({ value, isLarge = false }: { value: string; isLarge?: boolean }) {
  const sanitized = (value || "ORDER").toUpperCase().replace(/[^A-Z0-9\-\. ]/g, "");
  const code = `*${sanitized}*`;

  const patterns: Record<string, string> = {
    "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
    "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
    "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
    "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
    "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
    "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
    "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
    "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
    "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
    "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
  };

  const rects: { x: number; width: number }[] = [];
  let currentX = 10;
  const narrow = isLarge ? 3 : 2;
  const wide = isLarge ? 7 : 5;
  const spaceGap = isLarge ? 4 : 3;

  for (let i = 0; i < code.length; i++) {
    const char = code[i] ?? "-";
    const pattern = patterns[char] || patterns["-"] || "010000101";
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "1";
      const w = isWide ? wide : narrow;
      if (isBar) {
        rects.push({ x: currentX, width: w });
      }
      currentX += w;
    }
    currentX += spaceGap;
  }

  const totalWidth = currentX + 10;
  const height = isLarge ? 56 : 48;

  return (
    <div className="flex flex-col items-center select-all">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className={`w-full ${isLarge ? "max-w-[300px] h-14" : "max-w-[260px] h-11"}`}
        style={{ shapeRendering: "crispEdges" }}
      >
        <rect width={totalWidth} height={height} fill="#FFFFFF" />
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y={2} width={r.width} height={height - 4} fill="#000000" />
        ))}
      </svg>
      <span className="font-mono text-[11px] font-black uppercase text-black mt-0.5 tracking-wider">
        {value}
      </span>
    </div>
  );
}

export function ThermalShippingLabelModal({ order, onClose }: ThermalShippingLabelModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printSize, setPrintSize] = useState<"thermal-80" | "thermal" | "a4">("thermal-80");
  const [isRotated80, setIsRotated80] = useState(false);
  const [bluetoothLoading, setBluetoothLoading] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);

  const methodUpper = (order.deliveryMethod || "").toUpperCase();
  const isExpedition = methodUpper.includes("EXPEDITION") || methodUpper.includes("JNE") || methodUpper.includes("JNT") || methodUpper.includes("J&T") || methodUpper.includes("SICEPAT");
  const isPickup = methodUpper === "PICKUP" || methodUpper.includes("AMBIL");
  const isInternal = methodUpper.includes("FREE_MAKASSAR") || methodUpper.includes("MAKASSAR") || (!isExpedition && !isPickup);

  const recipientName =
    (typeof order.shippingAddress === "object" && order.shippingAddress?.recipientName) ||
    order.user?.name ||
    "Pelanggan Kaos Kami";

  const rawPhone =
    (typeof order.shippingAddress === "object" && order.shippingAddress?.phoneNumber) ||
    order.user?.phoneNumber ||
    "—";

  const district = typeof order.shippingAddress === "object" ? order.shippingAddress?.district : null;
  const city = typeof order.shippingAddress === "object" ? order.shippingAddress?.city || "Makassar" : "Makassar";
  const province = typeof order.shippingAddress === "object" ? order.shippingAddress?.province || "Sulawesi Selatan" : "Sulawesi Selatan";
  const postal = typeof order.shippingAddress === "object" ? order.shippingAddress?.postalCode || "90211" : "90211";

  const fullAddress =
    typeof order.shippingAddress === "object" && order.shippingAddress
      ? [
          order.shippingAddress.fullAddress,
          district ? `Kec. ${district}` : null,
          city,
          province,
          postal,
        ]
          .filter(Boolean)
          .join(", ")
      : typeof order.shippingAddress === "string" && order.shippingAddress.trim()
      ? order.shippingAddress
      : "Alamat tidak dicantumkan (Ambil di Workshop)";

  const totalPcs = order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;
  const estimatedWeightKg = Math.max(0.3, Math.round(totalPcs * 0.25 * 10) / 10);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintBluetooth = async () => {
    setBluetoothLoading(true);
    setBluetoothStatus("Membuka dialog pairing Bluetooth...");
    try {
      const res = await printThermalViaBluetooth(order, (msg) => setBluetoothStatus(msg));
      if (res.success) {
        setBluetoothStatus(`✅ Berhasil cetak ke ${res.deviceName}!`);
        setTimeout(() => setBluetoothStatus(null), 5000);
      } else {
        setBluetoothStatus(`❌ ${res.error}`);
        setTimeout(() => setBluetoothStatus(null), 6000);
      }
    } catch (e: any) {
      setBluetoothStatus(`❌ ${e?.message || "Gagal mencetak"}`);
      setTimeout(() => setBluetoothStatus(null), 6000);
    } finally {
      setBluetoothLoading(false);
    }
  };

  const courierBadge = isExpedition
    ? (order.deliveryMethod?.toUpperCase().includes("JNE") ? "JNE EXPRESS" :
       order.deliveryMethod?.toUpperCase().includes("SICEPAT") ? "SICEPAT" :
       order.deliveryMethod?.toUpperCase().includes("J&T") || order.deliveryMethod?.toUpperCase().includes("JNT") ? "J&T EXPRESS" :
       "EKSPEDISI NASIONAL")
    : isPickup ? "PICKUP DI WORKSHOP" : "KURIR TOKO MAKASSAR";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
    >
      {/* Dynamic CSS Print Rule sesuai ukuran terpilih */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printSize === "thermal-80" ? "80mm auto" : printSize === "thermal" ? "100mm 150mm" : "A4 portrait"};
            margin: 0;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-area-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="bg-surface border border-border-subtle rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl overflow-hidden font-sans max-h-[94vh]">
        {/* Header Modal Controls (Hidden saat Print) */}
        <div className="p-4 border-b border-border-subtle flex flex-col gap-3 print:hidden bg-surface-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FF6B35]/15 text-[#FF6B35] font-bold">
                <Printer size={16} />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-text-primary uppercase tracking-tight">
                  Cetak Resi & Surat Jalan ({order.orderNumber})
                </h3>
                <p className="text-[11px] text-text-muted">
                  Format dioptimalkan untuk Thermal 80mm Bluetooth, Stiker 100×150, atau Kertas A4.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-surface text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          {/* Baris Pemilihan Ukuran Kertas & Tombol Aksi */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Pilihan Ukuran Kertas */}
            <div className="flex items-center bg-canvas p-1 rounded-xl border border-border-subtle text-xs">
              <button
                type="button"
                onClick={() => setPrintSize("thermal-80")}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printSize === "thermal-80" ? "bg-[#FF6B35] text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                Thermal 80mm (Bluetooth/Rol)
              </button>
              <button
                type="button"
                onClick={() => setPrintSize("thermal")}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printSize === "thermal" ? "bg-[#FF6B35] text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                Thermal 100×150
              </button>
              <button
                type="button"
                onClick={() => setPrintSize("a4")}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  printSize === "a4" ? "bg-[#FF6B35] text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
              >
                Surat Jalan A4
              </button>
            </div>

            {/* Tombol Khusus 80mm: Rotasi Miring Memanjang */}
            {printSize === "thermal-80" && (
              <button
                type="button"
                onClick={() => setIsRotated80(!isRotated80)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isRotated80
                    ? "bg-black text-white border-black"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-primary"
                }`}
                title="Putar 90° agar teks tercetak memanjang di printer rol"
              >
                <RotateCw size={13} />
                <span>{isRotated80 ? "Mode Memanjang (90°)" : "Mode Vertikal Standar"}</span>
              </button>
            )}

            {/* Tombol Cetak Bluetooth Langsung & Browser Print */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={bluetoothLoading}
                onClick={handlePrintBluetooth}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                title="Cetak langsung ke printer thermal Bluetooth via ESC/POS"
              >
                {bluetoothLoading ? <Loader2 size={13} className="animate-spin" /> : <Bluetooth size={13} />}
                <span>Cetak Bluetooth</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF6B35] text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-md transition-all cursor-pointer"
              >
                <Printer size={13} />
                <span>Cetak Browser (Ctrl+P)</span>
              </button>
            </div>
          </div>

          {/* Feedback Status Bluetooth */}
          {bluetoothStatus && (
            <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200 flex items-center gap-2">
              {bluetoothLoading ? <Loader2 size={14} className="animate-spin text-[#FF6B35]" /> : <AlertCircle size={14} className="text-blue-400" />}
              <span>{bluetoothStatus}</span>
            </div>
          )}
        </div>

        {/* Printable Area Container */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] flex justify-center bg-black/30 print:p-0 print:bg-white print:max-h-none print:overflow-visible">
          {/* ========================================================= */}
          {/* TAMPILAN 1: FORMAT THERMAL 80MM (ULTRA-BOLD & MONOKROM MURNI) */}
          {/* ========================================================= */}
          {printSize === "thermal-80" && (
            <div
              ref={printRef}
              className={`print-area-wrapper bg-white text-black border-4 border-black font-mono shadow-2xl p-3 ${
                isRotated80 ? "w-[520px] max-w-full" : "w-[330px] max-w-full"
              } print:border-4 print:border-black print:w-full print:p-2 space-y-2.5`}
              style={{
                color: "#000000",
                backgroundColor: "#FFFFFF",
              }}
            >
              {/* Header Toko */}
              <div className="border-b-4 border-black pb-2 text-center">
                <h1 className="text-lg font-black uppercase tracking-tight leading-none text-black">
                  KAOS KAMI MAKASSAR
                </h1>
                <p className="text-[10px] font-bold text-black uppercase tracking-wide mt-0.5">
                  Custom DTF & Streetwear
                </p>
                <p className="text-[10px] font-bold text-black">
                  WA CS: {SHOP_CONTACT_WHATSAPP}
                </p>
              </div>

              {/* Kurir & Order Banner */}
              <div className="bg-black text-white text-center py-1.5 px-2">
                <p className="text-sm font-black uppercase tracking-wider text-white">
                  {courierBadge}
                </p>
              </div>

              {/* Data Order & Barcode */}
              <div className="border-2 border-black p-2 text-center space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-black pb-1">
                  <span>ORDER: {order.orderNumber}</span>
                  <span>{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                {order.trackingNumber && (
                  <p className="text-xs font-black uppercase text-black pt-0.5">
                    RESI: {order.trackingNumber}
                  </p>
                )}
                <div className="pt-1">
                  <SvgBarcode value={order.trackingNumber || order.orderNumber} isLarge />
                </div>
              </div>

              {/* Data Penerima (EKSTRA BESAR & BOLD) */}
              <div className="border-4 border-black p-2.5 space-y-1">
                <span className="text-[10px] bg-black text-white font-black px-1.5 py-0.5 uppercase tracking-wider inline-block">
                  PENERIMA (TUJUAN):
                </span>
                <p className="text-lg font-black text-black uppercase leading-tight pt-0.5">
                  {recipientName}
                </p>
                <div className="border-2 border-black p-1 bg-white inline-block w-full">
                  <p className="text-sm font-black text-black">
                    TELP/WA: {rawPhone}
                  </p>
                </div>
                <div className="pt-1 text-xs font-bold text-black leading-snug">
                  <p>{fullAddress}</p>
                  {district && <p className="font-black pt-0.5">KEC. {district.toUpperCase()}, {city.toUpperCase()}</p>}
                </div>
              </div>

              {/* Manifes Isi Paket */}
              <div className="border-2 border-black p-2 space-y-1 text-xs">
                <p className="font-black border-b-2 border-black pb-0.5 uppercase flex justify-between">
                  <span>MANIFES PAKET</span>
                  <span>QTY</span>
                </p>
                <div className="space-y-0.5 font-bold pt-0.5">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="truncate pr-1">
                          • {it.snapshotName || "Kaos Custom"} ({it.snapshotSize || "L"})
                        </span>
                        <span className="font-black">{it.quantity}x</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between text-[11px]">
                      <span>• 1x Paket Kaos Sablon DTF</span>
                      <span className="font-black">1x</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan Kurir Jika Ada */}
              {order.courierNotes && (
                <div className="border-2 border-dashed border-black p-1.5 text-xs font-bold text-black">
                  <span className="font-black text-[10px] uppercase block">CATATAN KHUSUS:</span>
                  <p className="italic">&quot;{order.courierNotes}&quot;</p>
                </div>
              )}

              {/* Footer Pengirim */}
              <div className="border-t-2 border-black pt-1.5 text-center text-[10px] font-bold space-y-0.5">
                <p className="font-black">PENGIRIM: KAOS KAMI MAKASSAR</p>
                <p>{SHOP_WORKSHOP_ADDRESS}</p>
                <p className="text-[9px] pt-1">Terima kasih telah berbelanja di Kaos Kami!</p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAMPILAN 2: FORMAT THERMAL 100×150MM ATAU SURAT JALAN A4 */}
          {/* ========================================================= */}
          {printSize !== "thermal-80" && (
            <div
              ref={printRef}
              className={`print-area-wrapper bg-white text-black p-5 border-2 border-black rounded-lg space-y-3 font-mono text-xs shadow-xl print:w-full print:border-2 print:border-black print:shadow-none print:rounded-none print:p-4 ${
                printSize === "thermal" ? "w-[400px]" : "w-[620px]"
              }`}
            >
              {/* Header Logo & Identitas */}
              <div className="border-b-2 border-black pb-3 flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/brand/logo-black-clean.png"
                    alt="Kaos Kami Logo"
                    className="h-10 sm:h-12 w-auto object-contain shrink-0"
                  />
                  <div>
                    <h1 className="text-base font-black tracking-tight uppercase leading-none text-black">
                      KAOS KAMI MAKASSAR
                    </h1>
                    <p className="text-[10px] font-bold text-black tracking-wide mt-0.5">
                      3D Interactive & DTF Sablon Platform
                    </p>
                    <p className="text-[9px] text-black">Kota Makassar · Sulawesi Selatan</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xs inline-block">
                    {courierBadge}
                  </span>
                  <span className="text-[9px] text-black font-bold block mt-1">
                    Tgl: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Kotak Resi & Barcode */}
              <div className="p-2.5 border-2 border-black bg-white flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] text-black uppercase font-bold block font-sans">
                    {isExpedition ? "NOMOR RESI PENGIRIMAN EKSPEDISI:" : "NOMOR SURAT JALAN / ORDER:"}
                  </span>
                  <span className="text-base sm:text-lg font-black tracking-wider block font-mono select-all text-black">
                    {order.trackingNumber || order.orderNumber}
                  </span>
                  <span className="text-[10px] text-black block">
                    Ref Order ID: <strong>{order.orderNumber}</strong>
                  </span>
                </div>
                <div className="shrink-0 text-center">
                  <SvgBarcode value={order.trackingNumber || order.orderNumber} />
                </div>
              </div>

              {/* Pengirim & Penerima */}
              <div className="grid grid-cols-2 gap-3 border-b-2 border-black pb-3">
                <div className="space-y-1 border-r-2 border-black pr-3">
                  <span className="text-[10px] text-white bg-black px-1.5 py-0.5 font-sans font-bold uppercase tracking-wider inline-block">
                    PENERIMA (TO)
                  </span>
                  <p className="text-sm font-black text-black leading-tight pt-1">{recipientName}</p>
                  <p className="text-xs font-black text-black">Telp/WA: {rawPhone}</p>
                  <p className="text-[11px] text-black leading-snug pt-0.5">{fullAddress}</p>
                  {district && <p className="text-[10px] font-bold text-black">Kec. {district}, Kota {city}</p>}
                  {postal && <p className="text-[10px] font-bold text-black">Kode Pos: {postal}</p>}
                </div>

                <div className="space-y-1 pl-1">
                  <span className="text-[10px] text-black font-sans font-bold uppercase tracking-wider inline-block border border-black px-1.5 py-0.5">
                    PENGIRIM (FROM)
                  </span>
                  <p className="text-xs font-black text-black pt-1">Workshop Kaos Kami Makassar</p>
                  <p className="text-[10px] font-bold text-black">WhatsApp: +{SHOP_CONTACT_WHATSAPP}</p>
                  <p className="text-[10px] text-black leading-snug">{SHOP_WORKSHOP_ADDRESS}</p>
                  <p className="text-[10px] font-bold text-black">Makassar 90211, Sulawesi Selatan</p>
                </div>
              </div>

              {/* Catatan Khusus */}
              {order.courierNotes && (
                <div className="p-2 border border-black text-[10px] text-black">
                  <strong className="uppercase font-sans font-black block">CATATAN KHUSUS KURIR:</strong>
                  <p className="italic font-bold">&quot;{order.courierNotes}&quot;</p>
                </div>
              )}

              {/* Spesifikasi Logistik */}
              <div className="grid grid-cols-3 gap-2 border-b-2 border-black pb-2 text-center text-[10px]">
                <div className="border border-black p-1">
                  <span className="text-[9px] text-black uppercase block font-sans">TOTAL PCS</span>
                  <strong className="text-xs font-black">{totalPcs} Pcs</strong>
                </div>
                <div className="border border-black p-1">
                  <span className="text-[9px] text-black uppercase block font-sans">ESTIMASI BERAT</span>
                  <strong className="text-xs font-black">~{estimatedWeightKg} Kg</strong>
                </div>
                <div className="border border-black p-1 bg-black text-white">
                  <span className="text-[9px] uppercase block font-sans opacity-90">INSTRUKSI</span>
                  <strong className="text-[10px] font-black">FRAGILE SABLON</strong>
                </div>
              </div>

              {/* Manifes Paket */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between font-black border-b border-black pb-0.5 uppercase tracking-wide">
                  <span>MANIFES ISI PAKET</span>
                  <span>QTY</span>
                </div>
                <ul className="space-y-1 pt-1 text-[10px]">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it, idx) => (
                      <li key={idx} className="flex justify-between items-start border-b border-black pb-0.5">
                        <span className="pr-2 leading-tight">
                          [✓] <strong>{it.snapshotName || "Kaos Sablon DTF"}</strong>
                          <span className="text-black block text-[9px]">
                            Varian: Size {it.snapshotSize || "L"} · Warna {it.snapshotColorName || "Hitam"}
                          </span>
                        </span>
                        <strong className="shrink-0 text-xs font-black">{it.quantity} pcs</strong>
                      </li>
                    ))
                  ) : (
                    <li className="flex justify-between">
                      <span>[✓] 1x Paket Pakaian Sablon DTF Kaos Kami</span>
                      <strong>1 pcs</strong>
                    </li>
                  )}
                </ul>
              </div>

              {/* Tanda Terima Serah Terima */}
              {isInternal && (
                <div className="border-t-2 border-black pt-2 space-y-2">
                  <div className="text-[9px] uppercase font-bold text-black">
                    BUKTI SERAH TERIMA PENGANTARAN KURIR TOKO MAKASSAR:
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center text-[10px]">
                    <div className="border border-black p-2 h-20 flex flex-col justify-between">
                      <span className="text-[9px] text-black font-bold">KURIR PENGANTAR</span>
                      <span className="border-t border-dashed border-black pt-1 text-[9px] text-black">
                        ( Tanda Tangan & Nama Terang )
                      </span>
                    </div>
                    <div className="border border-black p-2 h-20 flex flex-col justify-between">
                      <span className="text-[9px] text-black font-bold">PENERIMA PAKET</span>
                      <span className="border-t border-dashed border-black pt-1 text-[9px] text-black">
                        ( Tanda Tangan & Waktu Terima )
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Legal */}
              <div className="pt-2 border-t-2 border-black flex justify-between items-center text-[9px] text-black font-mono">
                <p className="font-bold text-black">QC & PACKAGING: VERIFIED PASSED</p>
                <span className="px-1.5 py-0.5 border border-black font-black uppercase text-[8px] bg-white inline-block">
                  NO RETURN TANPA VIDEO UNBOXING
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden saat Print) */}
        <div className="p-4 bg-surface-elevated border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-text-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Format siap cetak printer thermal stiker 80mm/100×150 atau kertas A4.</span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface border border-border-subtle text-xs font-bold text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-[#FF6B35] text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-md transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
