import express from "express";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || "kaos_kami_secret_2026";

let sock;
let currentQR = null;
let isConnected = false;
let userJid = null;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_session");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["Kaos Kami E-Commerce", "Chrome", "20.0.04"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      isConnected = false;
      console.log("📲 QR Code baru telah dibuat. Buka di browser untuk scan!");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      currentQR = null;
      console.log(`Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      }
    } else if (connection === "open") {
      isConnected = true;
      currentQR = null;
      userJid = sock.user?.id || "Connected";
      console.log(`✅ WHATSAPP BOT KAOS KAMI SUDAH TERHUBUNG! (ID: ${userJid})`);
    }
  });
}

connectToWhatsApp();

// 1. Web UI Dashboard & Live QR Code Scanner
app.get("/", async (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Kaos Kami WhatsApp Gateway</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, sans-serif; background: #0E0E10; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #18181B; padding: 32px; border-radius: 20px; border: 1px solid #27272A; text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .badge { background: #10B981; color: #000; padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 12px; display: inline-block; margin-bottom: 16px; }
          h1 { margin: 0 0 8px 0; font-size: 20px; }
          p { color: #A1A1AA; font-size: 14px; line-height: 1.5; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">AKTIF 24 JAM ONLINE</div>
          <h1>WhatsApp Gateway Kaos Kami</h1>
          <p>Bot WhatsApp resmi Kaos Kami Makassar telah terhubung dan siap mengirim notifikasi pesanan!</p>
        </div>
      </body>
      </html>
    `);
  }

  if (currentQR) {
    try {
      const qrDataUrl = await QRCode.toDataURL(currentQR);
      return res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Scan WhatsApp Kaos Kami</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="refresh" content="10">
          <style>
            body { font-family: -apple-system, sans-serif; background: #0E0E10; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #18181B; padding: 32px; border-radius: 20px; border: 1px solid #E65100; text-align: center; max-width: 400px; }
            .qr-box { background: #fff; padding: 16px; border-radius: 16px; display: inline-block; margin: 16px 0; }
            h1 { font-size: 18px; margin: 0 0 8px 0; color: #E65100; }
            p { color: #A1A1AA; font-size: 13px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>TAUTKAN PERANGKAT WHATSAPP</h1>
            <p>Buka WhatsApp di HP &gt; Perangkat Tertaut &gt; Scan QR di bawah:</p>
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="Scan QR Code" width="240" height="240" />
            </div>
            <p><small>Halaman otomatis refresh tiap 10 detik.</small></p>
          </div>
        </body>
        </html>
      `);
    } catch (e) {
      return res.status(500).send("Gagal membuat QR image");
    }
  }

  return res.send("Sedang menyiapkan koneksi WhatsApp... Silakan refresh beberapa saat lagi.");
});

// 2. Endpoint Health Check (Untuk UptimeRobot agar server tidak tidur)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    connected: isConnected,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// 3. Endpoint Kirim Pesan dari Website E-Commerce Kaos Kami
app.post("/send-message", async (req, res) => {
  const { secret, phone, message } = req.body;

  if (secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Secret" });
  }

  if (!isConnected || !sock) {
    return res.status(503).json({ error: "WhatsApp Bot not connected yet" });
  }

  if (!phone || !message) {
    return res.status(400).json({ error: "Missing required fields: phone, message" });
  }

  try {
    let cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    const result = await sock.sendMessage(jid, { text: message });
    console.log(`[WA Gateway] Pesan terkirim ke ${cleanPhone}`);

    return res.json({
      success: true,
      target: cleanPhone,
      messageId: result.key.id,
    });
  } catch (err) {
    console.error("[WA Gateway Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to send WhatsApp message" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Kaos Kami WA Gateway running on port ${PORT}`);
});
