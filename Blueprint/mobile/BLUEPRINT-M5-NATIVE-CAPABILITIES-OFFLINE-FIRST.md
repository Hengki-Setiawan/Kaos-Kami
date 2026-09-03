# BLUEPRINT M5 — NATIVE HARDWARE CAPABILITIES & OFFLINE-FIRST SYNC
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M2, BLUEPRINT-01 (Architecture Core)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & STRATEGI OFFLINE INDONESIA

Jaringan internet seluler di Indonesia (khususnya wilayah suburban dan pelosok Sulawesi Selatan) sering mengalami penurunan sinyal (*flaky connection*). Kaos Kami Mobile dirancang dengan pendekatan **Offline-First**:
1. **Desain 3D Tanpa Internet:** Pengguna dapat membuka studio 3D, mengganti warna, dan menata stiker sablon secara offline.
2. **Local SQLite Cache & Filesystem:** Desain tersimpan di memori lokal HP via `@capacitor-community/sqlite` dan `@capacitor/filesystem`.
3. **Background Sync Queue:** Semua mutasi draft pesanan disimpan dalam antrean lokal dan otomatis di-flush ke Cloudflare Workers ketika koneksi internet pulih.
4. **Client-Side Image Descaler:** Gambar stiker dari galeri kamera otomatis di-downscale ke maksimal 4096px (4K) sebelum di-upload agar tidak memicu *Out Of Memory* (OOM) pada HP RAM 3GB.

---

## 1. DAFTAR PLUGIN NATIVE CAPACITOR RESMI & TERVERIFIKASI

```bash
npm install \
  @capacitor/camera \
  @capacitor/filesystem \
  @capacitor/preferences \
  @capacitor/network \
  @capacitor/haptics \
  @capacitor/share \
  @capacitor/push-notifications \
  @capacitor/splash-screen \
  @capacitor/status-bar \
  @capacitor/browser \
  @capacitor/keyboard \
  @capacitor/app \
  @capacitor-mlkit/barcode-scanning \
  @capacitor-community/keep-awake \
  @aparajita/capacitor-biometric-auth \
  @capacitor-community/sqlite
```

---

## 2. DATABASE OFFLINE SQLITE MANAGER UTUH

File: `src/db/offlineDb.ts`
```typescript
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { NativeBridge } from '@/bridge/NativeBridge';

class OfflineDatabaseManager {
  private static instance: OfflineDatabaseManager;
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  static getInstance(): OfflineDatabaseManager {
    if (!this.instance) this.instance = new OfflineDatabaseManager();
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !NativeBridge.isNative()) return;

    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      this.db = await this.sqlite.createConnection(
        'kaoskami_local_db',
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      // Eksekusi DDL Pembuatan Tabel
      const ddl = `
        CREATE TABLE IF NOT EXISTS cached_products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sku TEXT NOT NULL,
          gsm INTEGER NOT NULL,
          price REAL NOT NULL,
          color_hex TEXT NOT NULL,
          model_3d_path TEXT NOT NULL,
          stock_qty INTEGER NOT NULL,
          last_synced INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS saved_designs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          apparel_type TEXT NOT NULL,
          fabric_color TEXT NOT NULL,
          decals_json TEXT NOT NULL,
          preview_base64 TEXT,
          created_at INTEGER NOT NULL,
          is_synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          retry_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'PENDING'
        );
      `;

      await this.db.execute(ddl);
      this.isInitialized = true;
      console.log('[SQLite Manager] Database offline lokal berhasil dibuka & diinisialisasi.');
    } catch (err) {
      console.error('[SQLite Init Error]:', err);
    }
  }

  async saveDraftDesign(design: {
    id: string;
    userId?: string;
    apparelType: string;
    fabricColor: string;
    decalsJson: string;
    previewBase64?: string;
  }): Promise<void> {
    if (!this.db) return;
    const query = `
      INSERT OR REPLACE INTO saved_designs 
      (id, user_id, apparel_type, fabric_color, decals_json, preview_base64, created_at, is_synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0);
    `;
    await this.db.run(query, [
      design.id,
      design.userId || null,
      design.apparelType,
      design.fabricColor,
      design.decalsJson,
      design.previewBase64 || null,
      Date.now(),
    ]);
  }

  async getOfflineDesigns(): Promise<any[]> {
    if (!this.db) return [];
    const res = await this.db.query('SELECT * FROM saved_designs ORDER BY created_at DESC;');
    return res.values || [];
  }
}

export const offlineDb = OfflineDatabaseManager.getInstance();
```

---

## 3. CLIENT-SIDE CAMERA IMAGE DESCALER (4K/2K CLAMP)

Untuk mencegah crash *Out-Of-Memory* (OOM) saat pengguna mengunggah foto 48MP dari kamera Android:

File: `src/bridge/camera.ts`
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { NativeBridge } from './NativeBridge';

export async function pickAndDescalImage(maxDimension: number = 4096): Promise<string | null> {
  const photoPath = await NativeBridge.pickImage();
  if (!photoPath) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;

      // Downscale secara proporsional jika gambar melebihi maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Hasilkan file PNG transparan teroptimasi
        resolve(canvas.toDataURL('image/png', 0.92));
      } else {
        resolve(photoPath);
      }
    };
    img.onerror = () => resolve(photoPath);
    img.src = photoPath;
  });
}
```

---

## 4. BIOMETRIC AUTHENTICATION BRIDGE UTUH

File: `src/bridge/biometrics.ts`
```typescript
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { NativeBridge } from './NativeBridge';

export async function authenticateWithBiometrics(
  reason: string = 'Konfirmasi Akses Akun Kaos Kami'
): Promise<boolean> {
  if (!NativeBridge.isNative()) return true;

  try {
    const check = await BiometricAuth.checkBiometry();
    if (!check.isAvailable) {
      console.log('[Biometric] Perangkat tidak mendukung biometrik atau belum disetup');
      return false;
    }

    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Gunakan Password',
      allowDeviceCredential: true, // Izinkan fallback ke PIN/pola HP
    });

    await NativeBridge.hapticNotification('success');
    return true;
  } catch (error) {
    console.warn('[Biometric Auth]: Dibatalkan oleh pengguna atau gagal verifikasi', error);
    await NativeBridge.hapticNotification('error');
    return false;
  }
}
```

---

## 5. NETWORK RECOVERY & BACKGROUND SYNC QUEUE

File: `src/bridge/syncQueue.ts`
```typescript
import { Network } from '@capacitor/network';
import { NativeBridge } from './NativeBridge';

export interface MutationItem {
  id: string;
  endpoint: string;
  method: string;
  payload: any;
  createdAt: number;
}

export class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private isProcessing = false;

  static getInstance(): OfflineSyncManager {
    if (!this.instance) this.instance = new OfflineSyncManager();
    return this.instance;
  }

  initialize() {
    Network.addListener('networkStatusChange', async (status) => {
      if (status.connected) {
        console.log('[Sync Engine] Terkoneksi ke Internet! Memproses antrean mutasi...');
        await this.flushQueue();
      } else {
        console.log('[Sync Engine] Sinyal terputus -> Mode Offline aktif');
      }
    });
  }

  async queueMutation(endpoint: string, method: string, payload: any): Promise<void> {
    const queueStr = await NativeBridge.getItem('offline_mutation_queue') || '[]';
    const queue: MutationItem[] = JSON.parse(queueStr);

    queue.push({
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      endpoint,
      method,
      payload,
      createdAt: Date.now(),
    });

    await NativeBridge.setItem('offline_mutation_queue', JSON.stringify(queue));
    console.log(`[Sync Engine] Mutasi disimpan di antrean lokal (${queue.length} tertunda)`);
  }

  async flushQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const queueStr = await NativeBridge.getItem('offline_mutation_queue') || '[]';
      const queue: MutationItem[] = JSON.parse(queueStr);
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[Sync Engine] Mengirim ${queue.length} transaksi ke Cloudflare Workers...`);

      const remainingQueue: MutationItem[] = [];
      for (const item of queue) {
        try {
          const res = await fetch(`https://kaos-kami-3d.hengkisetiawan461.workers.dev${item.endpoint}`, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (err) {
          console.warn(`[Sync Error] Gagal mengirim item ${item.id}, ditunda:`, err);
          remainingQueue.push(item);
        }
      }

      await NativeBridge.setItem('offline_mutation_queue', JSON.stringify(remainingQueue));
      if (remainingQueue.length === 0) {
        await NativeBridge.hapticNotification('success');
        console.log('[Sync Engine] Seluruh antrean offline berhasil disinkronkan!');
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const offlineSync = OfflineSyncManager.getInstance();
```

---

## 6. BARCODE & QRIS SCANNER ENGINE (MLKIT)

File: `src/bridge/scanner.ts`
```typescript
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { NativeBridge } from './NativeBridge';

export async function scanJobTicketOrQris(): Promise<string | null> {
  NativeBridge.hapticTap('medium');

  if (!NativeBridge.isNative()) {
    const mock = prompt('Simulasi Barcode Scanner (Web Mode). Masukkan ID Pesanan:');
    return mock || null;
  }

  try {
    const isSupported = await BarcodeScanner.isSupported();
    if (!isSupported.supported) return null;

    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') return null;

    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128],
    });

    if (barcodes.length > 0) {
      await NativeBridge.hapticNotification('success');
      return barcodes[0].rawValue;
    }
    return null;
  } catch (err) {
    console.warn('[Scanner Error]:', err);
    return null;
  }
}
```

---

## 7. MATRIKS EDGE CASE HARDWARE & OFFLINE

| Masalah Hardware | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **Foto Kamera Ukuran 48MP (File > 25MB)** | HP langsung crash karena OOM saat create decal | Otomatis di-downscale via HTML5 Canvas ke ukuran 4096px (file ~1.2MB) | Loading lancar tanpa lag, kualitas print tetap terjaga |
| **Pengguna Mematikan Data Seluler Saat Mendesain** | Request save design gagal | Data disimpan ke tabel `saved_designs` SQLite lokal HP | Desain tetap tersimpan dengan label: *"Tersimpan di Perangkat"* |
| **Sensor Sidik Jari Kotor / Gagal 3x** | Autentikasi biometrik tertolak | Fallback otomatis ke dialog PIN/password HP | Pengguna tetap bisa login tanpa terkunci |
| **Kamera Digunakan oleh Aplikasi Lain** | Camera init error | Tangkap exception, beri opsi memilih gambar dari galeri foto | Pesan ramah: *"Kamera sedang sibuk. Pilih foto dari galeri?"* |

---

## 8. ACCEPTANCE CRITERIA
- [ ] Database SQLite lokal terbuat otomatis saat aplikasi pertama kali dibuka.
- [ ] Pengguna dapat mendesain kaos 3D dan menyimpannya ke memori HP saat Mode Pesawat.
- [ ] Gambar desain sablon resolusi besar otomatis di-downscale ke batas maksimal 4096px tanpa meledakkan memori RAM.
- [ ] Autentikasi biometrik (FaceID/Fingerprint) berfungsi dengan mulus pada perangkat yang mendukung.
- [ ] Antrean transaksi yang dibuat saat offline otomatis tersinkronisasi saat HP terhubung kembali ke Wi-Fi / data seluler.
- [ ] Tombol Share memunculkan sheet native bawaan Android & iOS untuk membagikan tautan desain langsung ke WhatsApp.
