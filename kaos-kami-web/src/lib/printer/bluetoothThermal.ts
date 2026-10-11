/**
 * bluetoothThermal.ts
 * Driver Web Bluetooth API & Generator Perintah ESC/POS untuk Printer Thermal 80mm
 * Khusus untuk UMKM Kaos Kami Makassar (Label Resi Pengiriman & Surat Jalan).
 */

import { DeliveryLabelOrder } from "@/components/admin/ThermalShippingLabelModal";
import { SHOP_WORKSHOP_ADDRESS, SHOP_CONTACT_WHATSAPP } from "@/lib/shop";

/** Kode Perintah ESC/POS Universal */
const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init() {
    this.buffer.push(ESC, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  alignCenter() {
    this.buffer.push(ESC, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(ESC, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(ESC, 0x61, 0x02);
    return this;
  }

  bold(on: boolean = true) {
    this.buffer.push(ESC, 0x45, on ? 0x01 : 0x00);
    return this;
  }

  /**
   * Mengatur ukuran teks ESC/POS
   * size: 0 (normal), 1 (double height), 2 (double width), 3 (double height & width)
   */
  textSize(size: 0 | 1 | 2 | 3) {
    let flag = 0x00;
    if (size === 1) flag = 0x01; // double height
    if (size === 2) flag = 0x10; // double width
    if (size === 3) flag = 0x11; // 2x width + 2x height
    this.buffer.push(GS, 0x21, flag);
    return this;
  }

  /** Background hitam, tulisan putih (Invert) */
  invert(on: boolean = true) {
    this.buffer.push(GS, 0x42, on ? 0x01 : 0x00);
    return this;
  }

  text(str: string) {
    // Encode string ke ASCII / Latin1 bytes
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      this.buffer.push(code > 255 ? 0x3f : code);
    }
    return this;
  }

  line(str: string = "") {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  divider(char: string = "=", length: number = 42) {
    this.line(char.repeat(length));
    return this;
  }

  feed(lines: number = 3) {
    this.buffer.push(ESC, 0x64, lines);
    return this;
  }

  cut() {
    this.buffer.push(GS, 0x56, 0x42, 0x00); // Full cut with feed
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Format Data Resi Pengiriman menjadi Perintah ESC/POS 80mm
 * Lebar kertas 80mm thermal umumnya menampung 42-48 karakter per baris (Font A).
 */
export function buildThermal80mmEscPos(order: DeliveryLabelOrder): Uint8Array {
  const builder = new EscPosBuilder();

  const recipientName =
    (typeof order.shippingAddress === "object" && order.shippingAddress?.recipientName) ||
    order.user?.name ||
    "Pelanggan Kaos Kami";

  const rawPhone =
    (typeof order.shippingAddress === "object" && order.shippingAddress?.phoneNumber) ||
    order.user?.phoneNumber ||
    "—";

  const methodUpper = (order.deliveryMethod || "").toUpperCase();
  const courierBadge = methodUpper.includes("FREE_MAKASSAR") || methodUpper.includes("MAKASSAR")
    ? "KURIR TOKO MAKASSAR"
    : methodUpper.includes("PICKUP") || methodUpper.includes("AMBIL")
    ? "AMBIL DI WORKSHOP"
    : "EKSPEDISI NASIONAL";

  const district = typeof order.shippingAddress === "object" ? order.shippingAddress?.district : null;
  const city = typeof order.shippingAddress === "object" ? order.shippingAddress?.city || "Makassar" : "Makassar";
  const province = typeof order.shippingAddress === "object" ? order.shippingAddress?.province || "Sulawesi Selatan" : "Sulawesi Selatan";
  const postal = typeof order.shippingAddress === "object" ? order.shippingAddress?.postalCode || "90211" : "90211";

  const fullAddress =
    (typeof order.shippingAddress === "object" && (order.shippingAddress?.fullAddress || order.shippingAddress?.addressLine)) ||
    order.courierNotes ||
    "Workshop Kaos Kami Makassar";

  // 1. HEADER TOKO
  builder.alignCenter();
  builder.bold(true).textSize(2);
  builder.line("KAOS KAMI MAKASSAR");
  builder.textSize(0).bold(false);
  builder.line("3D Apparel & DTF Sablon Platform");
  builder.line("WA CS: " + SHOP_CONTACT_WHATSAPP);
  builder.divider("-", 42);

  // 2. KOTAK METODE PENGIRIMAN (INVERT HITAM-PUTIH)
  builder.alignCenter();
  builder.invert(true).bold(true).textSize(1);
  builder.line(`  ${courierBadge}  `);
  builder.invert(false).textSize(0).bold(false);

  // 3. NOMOR PESANAN & RESI
  builder.alignLeft();
  builder.line("");
  builder.bold(true).line(`NO ORDER: ${order.orderNumber}`);
  if (order.trackingNumber) {
    builder.bold(true).textSize(1).line(`NO RESI : ${order.trackingNumber}`).textSize(0);
  }
  builder.line(`TANGGAL : ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`);
  builder.divider("=", 42);

  // 4. DATA PENERIMA (EKSTRA BESAR & TEBAL)
  builder.alignLeft();
  builder.bold(true).line("PENERIMA (TUJUAN):");
  builder.textSize(3).bold(true).line(recipientName.toUpperCase().slice(0, 20));
  builder.textSize(1).bold(true).line(`TELP/WA: ${rawPhone}`).textSize(0);
  builder.line("");

  // 5. ALAMAT LENGKAP
  builder.bold(true).line("ALAMAT PENGIRIMAN:");
  builder.bold(false).line(fullAddress);
  builder.line(`${district ? district + ", " : ""}${city}, ${province} ${postal}`);
  builder.divider("-", 42);

  // 6. RINCIAN MANIFEST PAKET
  builder.bold(true).line("MANIFES PAKET SABLON:");
  if (Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach((it, idx) => {
      const title = it.snapshotName || "Kaos Custom";
      const sz = it.snapshotSize || "L";
      const clr = it.snapshotColorName || "Hitam";
      builder.line(`- ${it.quantity}x ${title} (${sz} / ${clr})`);
    });
  } else {
    builder.line("- 1x Paket Pakaian Kaos Kami");
  }

  if (order.courierNotes) {
    builder.line("");
    builder.bold(true).line("CATATAN KURIR:");
    builder.line(`"${order.courierNotes}"`);
  }

  // 7. FOOTER PENGIRIM & TERIMA KASIH
  builder.divider("=", 42);
  builder.alignCenter();
  builder.bold(true).line("PENGIRIM: KAOS KAMI MAKASSAR");
  builder.bold(false).line(SHOP_WORKSHOP_ADDRESS);
  builder.line("Simpan resi ini untuk bukti terima paket.");
  builder.line("www.kaoskami.biz.id");

  // 8. FEED & CUT
  builder.feed(4);
  builder.cut();

  return builder.getBytes();
}

/** Cek apakah browser mendukung Web Bluetooth API */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/** UUID Service Bluetooth Serial & Thermal Printer Universal */
const BLUETOOTH_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Common China POS
  "0000ff00-0000-1000-8000-00805f9b34fb", // General Serial
];

/**
 * Mencetak Label Resi ke Printer Thermal Bluetooth Langsung via Web Bluetooth
 */
export async function printThermalViaBluetooth(
  order: DeliveryLabelOrder,
  onStatusUpdate?: (status: string) => void
): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isWebBluetoothSupported()) {
    return {
      success: false,
      error: "Browser Anda tidak mendukung Web Bluetooth API. Harap gunakan Google Chrome atau Microsoft Edge di Desktop/Android.",
    };
  }

  try {
    onStatusUpdate?.("Mencari printer Bluetooth thermal...");

    // Request device
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLUETOOTH_PRINTER_SERVICES,
    });

    if (!device) {
      return { success: false, error: "Tidak ada perangkat printer yang dipilih." };
    }

    onStatusUpdate?.(`Menghubungkan ke ${device.name || "Printer Thermal"}...`);
    const server = await device.gatt.connect();

    onStatusUpdate?.("Mencari service printer...");
    let writeChar: any = null;

    // Cari service yang cocok
    for (const sUuid of BLUETOOTH_PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(sUuid);
        const characteristics = await service.getCharacteristics();
        for (const c of characteristics) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeChar = c;
            break;
          }
        }
        if (writeChar) break;
      } catch {}
    }

    // Jika service standar tidak ditemukan, coba iterasi semua primary services
    if (!writeChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const c of characteristics) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        }
      } catch {}
    }

    if (!writeChar) {
      throw new Error("Port cetak printer Bluetooth tidak ditemukan. Pastikan printer thermal mendukung mode SPP/ESC-POS.");
    }

    onStatusUpdate?.("Mengirim data resi ke printer 80mm...");
    const rawBytes = buildThermal80mmEscPos(order);

    // Kirim data dalam chunk (maks 512 bytes per packet agar tidak overflow buffer printer)
    const CHUNK_SIZE = 512;
    for (let offset = 0; offset < rawBytes.length; offset += CHUNK_SIZE) {
      const chunk = rawBytes.slice(offset, offset + CHUNK_SIZE);
      if (writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
      // Delay kecil 50ms per chunk
      await new Promise((r) => setTimeout(r, 50));
    }

    onStatusUpdate?.("Selesai mencetak!");
    return { success: true, deviceName: device.name || "Printer 80mm" };
  } catch (err: any) {
    if (err?.name === "NotFoundError") {
      return { success: false, error: "Pemilihan printer Bluetooth dibatalkan." };
    }
    return {
      success: false,
      error: err?.message || "Gagal menghubungkan ke printer Bluetooth.",
    };
  }
}
