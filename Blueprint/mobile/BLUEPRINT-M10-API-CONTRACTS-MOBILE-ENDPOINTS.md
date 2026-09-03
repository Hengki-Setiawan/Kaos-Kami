# BLUEPRINT M10 — API CONTRACTS, MOBILE ENDPOINTS & TURSO EDGE SYNC
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M4, M5, BLUEPRINT-01 (Turso libSQL Core)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & CELLULAR PAYLOAD STRATEGY

Pengguna mobile sering mengakses aplikasi menggunakan kuota data seluler. Seluruh endpoint mobile di bawah `/api/mobile/*` dirancang dengan aturan:
1. **Payload Minimal (< 5KB per Response):** Menghilangkan metadata yang tidak perlu, menyederhanakan format JSON.
2. **Delta Sync (If-Modified-Since):** Katalog produk dan riwayat pesanan hanya mengirimkan data yang berubah sejak tanggal sinkronisasi terakhir (`304 Not Modified`).
3. **Edge Database Latency (< 50ms):** Turso libSQL Edge diakses secara serverless melalui Cloudflare Workers dekat dengan Makassar (PoP UPG / CGK).
4. **Last-Write-Wins Conflict Resolution:** Resolusi konflik otomatis jika desain diedit pada dua perangkat secara bersamaan.

---

## 1. ENDPOINTS SPESIFIKASI REST API MOBILE

### 1. `GET /api/mobile/catalog`
Mengambil daftar pakaian dasar streetwear yang siap dikustomisasi.

**Headers:**
```http
X-App-Platform: android | ios
If-Modified-Since: Thu, 03 Sep 2026 00:00:00 GMT
```

**Response (200 OK — Payload ~1.8 KB):**
```json
{
  "version": "2026.09",
  "products": [
    {
      "id": "hw-240-black",
      "name": "Heavyweight 240 GSM — Obsidian",
      "sku": "KK-HW240-BLK",
      "gsm": 240,
      "colorHex": "#0E0E10",
      "basePrice": 125000,
      "stockQty": 48,
      "modelGlbUrl": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/models/tshirt-heavyweight.glb",
      "thumbnailUrl": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/thumbs/hw240-blk.webp"
    },
    {
      "id": "hw-280-vintage",
      "name": "Heavyweight 280 GSM — Vintage White",
      "sku": "KK-HW280-VNT",
      "gsm": 280,
      "colorHex": "#F4F1EA",
      "basePrice": 145000,
      "stockQty": 26,
      "modelGlbUrl": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/models/tshirt-heavyweight.glb",
      "thumbnailUrl": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/thumbs/hw280-vnt.webp"
    }
  ]
}
```

---

### 2. `POST /api/mobile/orders/checkout`
Membuat pesanan baru, menghitung ongkir Makassar, dan menghasilkan Duitku v2 Reference & Payment URL.

**Request Body:**
```json
{
  "customerId": "usr_9812739",
  "phoneWhatsapp": "+628123456789",
  "shippingAddress": {
    "recipientName": "Andi Pratama",
    "street": "Jl. Perintis Kemerdekaan KM 10",
    "district": "Tamalanrea",
    "city": "Makassar"
  },
  "deliveryMethod": "FLAT_RATE_MAKASSAR",
  "items": [
    {
      "variantId": "hw-240-black",
      "size": "XL",
      "quantity": 2,
      "decals": [
        {
          "side": "front",
          "imageUrl": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/uploads/logo_andi.png",
          "widthCm": 28.5,
          "heightCm": 14.2,
          "dpi": 300
        }
      ]
    }
  ]
}
```

**Response (201 Created — Payload ~0.6 KB):**
```json
{
  "orderId": "KK-2026-0903-882",
  "orderNumber": "ORD-20260903-882",
  "subtotal": 290000,
  "shippingCost": 15000,
  "grandTotal": 305000,
  "payment": {
    "gateway": "DUITKU",
    "reference": "DUITKU-KK-2026-0903-882",
    "paymentUrl": "https://passport.duitku.com/topup/topupdirectv2.aspx?ref=DUITKU-KK-2026-0903-882",
    "vaNumber": "88210009812739"
  }
}
```

---

### 3. `GET /api/mobile/orders/:id/status`
Endpoint polling sangat ringan (< 300 bytes) untuk Dynamic Island dan Live Activity.

**Response (200 OK):**
```json
{
  "orderId": "KK-2026-0903-882",
  "status": "HEAT_PRESS",
  "statusText": "Press Panas Sablon DTF 160°C",
  "progress": 0.60,
  "estimatedReady": "Hari Ini, 16:30 WITA"
}
```

---

### 4. `POST /api/mobile/designs/sync`
Sinkronisasi batch draft desain yang dibuat pengguna saat offline ke database Turso libSQL.

**Request Body:**
```json
{
  "designs": [
    {
      "clientDesignId": "draft_client_8129a",
      "apparelType": "tshirt",
      "fabricColor": "#0E0E10",
      "decals": [
        {
          "side": "front",
          "imageUrl": "https://pub-5746f36a46904edc8425ecd721b0bfdc.r2.dev/uploads/stiker1.png",
          "widthCm": 25.0,
          "heightCm": 12.0,
          "dpi": 300
        }
      ],
      "updatedAt": 1725321600000
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "syncedCount": 1,
  "serverTimestamps": {
    "draft_client_8129a": 1725321605000
  }
}
```

---

### 5. `POST /api/mobile/notifications/register`
Mendaftarkan token push notification FCM / APNs perangkat.

**Request Body:**
```json
{
  "userId": "usr_9812739",
  "pushToken": "fcm_token_abcdef123456...",
  "platform": "android",
  "deviceModel": "Xiaomi Redmi Note 12",
  "appVersion": "1.0.0"
}
```

---

## 2. TURSO LIBSQL EDGE QUERY OPTIMIZATIONS

File: `src/lib/db/edgeClient.ts`
```typescript
import { createClient } from '@libsql/client';

export const edgeDb = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

/**
 * Menggunakan Prepared Statements untuk menjamin query selesai < 50ms di Cloudflare Workers
 */
export async function getLeanOrderStatus(orderId: string) {
  const result = await edgeDb.execute({
    sql: 'SELECT id, status, updated_at FROM orders WHERE id = ? LIMIT 1;',
    args: [orderId],
  });
  return result.rows[0] || null;
}
```

---

## 3. MATRIKS EDGE CASE API MOBILE

| Skenario Error | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **Katalog Tidak Berubah Sejak Kunjungan Terakhir** | Buang-buang kuota jika download ulang | Server kembalikan `304 Not Modified` | Data langsung dibaca dari cache lokal, loading 0 ms |
| **Konflik Sinkronisasi Desain Offline (2 HP Edit Baju Sama)** | Data berpotensi tertimpa | Algoritma *Last-Write-Wins* berdasarkan `updatedAt` server timestamp | Desain dengan timestamp terbaru yang dipertahankan |
| **Duitku API Mengalami Latensi Tinggi** | Request checkout lambat | Timeout 8 detik lalu fallback ke direct URL payment | Pengguna tidak menunggu selamanya |

---

## 4. ACCEPTANCE CRITERIA
- [ ] Ukuran payload respon `/api/mobile/orders/:id/status` di bawah 500 bytes.
- [ ] Server mengembalikan status `304 Not Modified` jika data katalog belum berubah.
- [ ] Turso libSQL Edge memproses query pesanan dalam waktu kurang dari 50 ms.
- [ ] Token push notification berhasil tersimpan di tabel `UserDevice` database.
- [ ] Seluruh endpoint memvalidasi input menggunakan Zod schema yang aman dari injection.
