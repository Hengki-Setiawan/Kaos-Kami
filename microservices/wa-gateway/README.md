# KAOS KAMI — 24/7 FREE WHATSAPP GATEWAY MICROSERVICE

Microservice mandiri berbasis **Node.js Express & @whiskeysockets/baileys** untuk mengirim notifikasi WhatsApp otomatis di platform e-commerce Kaos Kami.

## Fitur Utama:
- **100% Gratis Selamanya:** Berjalan di Render.com Free Tier ($0/bulan).
- **Web QR Scanner Dashboard:** Buka URL web di browser untuk scan QR Code tanpa perlu melihat terminal log.
- **24/7 Always-On:** Mendukung endpoint `/health` untuk di-ping otomatis oleh UptimeRobot.
- **REST API Aman:** Dilindungi oleh `API_SECRET` header/body token.

## Konfigurasi Render.com:
1. **Runtime:** `Node`
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. **Environment Variables:**
   - `API_SECRET`: (Kunci rahasia API Anda)
