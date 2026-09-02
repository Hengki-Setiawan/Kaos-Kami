import express from "express";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 7860;
const API_SECRET = process.env.API_SECRET || "kaos_kami_secret_2026";
const HF_TOKEN = process.env.HF_TOKEN || ""; // Opsional: Hugging Face API Token

let sock;
let currentQR = null;
let isConnected = false;
let userJid = null;

// ============================================================================
// 🤖 KAOS KAMI AI KNOWLEDGE BASE & CS RESPONDER
// ============================================================================
const KAOS_KAMI_KNOWLEDGE = `
Kamu adalah Asisten Customer Service AI resmi dari "Kaos Kami" — Platform E-Commerce & Workshop Sablon DTF Heavyweight Streetwear di Kota Makassar, Sulawesi Selatan.
Jawablah pelanggan dengan bahasa Indonesia yang ramah, santai, profesional, sopan, dan khas anak muda/streetwear (bisa sedikit logat Makassar yang halus seperti 'kak', 'tabe', 'siap').

Informasi Resmi Kaos Kami Makassar:
1. Layanan Utama: Sablon DTF (Direct Transfer Film) Premium Satuan & Partai Lusinan, serta Kaos Polos Heavyweight.
2. Bahan Kaos:
   - Cotton Combed 24s Heavyweight (190 GSM, tebal pas, adem untuk cuaca Makassar).
   - Cotton Combed 28s Heavyweight Boxy Cut (Karakter kaku streetwear tegap).
3. Area Cetak Sablon DTF:
   - Maksimal lebar print: 30.0 cm (standar printhead mesin DTF industri).
   - Tinta: Tinta pigment DTF premium tahan cuci mesin & tidak mudah retak.
4. Lokasi Workshop & Pengiriman:
   - Workshop: Tamalanrea, Kota Makassar, Sulawesi Selatan.
   - Pengiriman: Bisa Pick-up mandiri di workshop (Rp 0), Instant Courier Maxim COD (Makassar), Flat Rate Makassar (Rp 15.000), atau J&T Express (se-Sulawesi & Indonesia).
5. Pembayaran Resmi: Mendukung QRIS Nasional (GoPay, OVO, Dana, BCA, Livin), Transfer Virtual Account via Duitku Gateway.
6. Studio 3D Customizer: Pelanggan bisa mendesain kaos secara interaktif 3D di website kami: https://kaos-kami-3d.hengkisetiawan461.workers.dev
7. Aturan: Jawablah dengan ringkas (maksimal 2-3 paragraf), jelas, dan berikan solusi langsung kepada pelanggan.
`;

async function generateAIResponse(userMessage) {
  // Jika HF_TOKEN tersedia, gunakan Model Qwen 2.5 72B via Hugging Face Serverless Inference
  if (HF_TOKEN) {
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages: [
            { role: "system", content: KAOS_KAMI_KNOWLEDGE },
            { role: "user", content: userMessage }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.warn("[AI Inference fallback]:", e.message);
    }
  }

  // Fallback Smart Rule-Based Engine (Jika API token belum diisi)
  const lower = userMessage.toLowerCase();
  if (lower.includes("harga") || lower.includes("biaya") || lower.includes("berapa")) {
    return "Halo kak! Di Kaos Kami Makassar, harga sablon DTF custom mulai dari Rp 65.000 (sudah termasuk kaos Combed 24s + sablon DTF tajam tahan cuci) ya kak! 😊\n\nKakak bisa cek simulasi harga real-time dan preview 3D langsung di web kami: https://kaos-kami-3d.hengkisetiawan461.workers.dev/studio";
  }
  if (lower.includes("lokasi") || lower.includes("alamat") || lower.includes("workshop") || lower.includes("makassar")) {
    return "Workshop resmi Kaos Kami berlokasi di Tamalanrea, Kota Makassar, Sulawesi Selatan kak. 📍\nBisa langsung ambil pesanan di workshop (Gratis) atau dikirim via kurir Maxim COD se-Kota Makassar!";
  }
  if (lower.includes("bahan") || lower.includes("kain") || lower.includes("24s") || lower.includes("28s")) {
    return "Kaos Kami menggunakan bahan Cotton Combed 24s dan 28s Heavyweight dengan potongan boxy streetwear yang tebal, tegap, namun tetap adem dan nyaman dipakai di iklim Makassar kak! 👕✨";
  }
  if (lower.includes("satuan") || lower.includes("minimal") || lower.includes("lusin")) {
    return "BISA SATUAN kak! Di Kaos Kami tidak ada minimal order. Mau cetak 1 kaos custom untuk pribadi atau lusinan untuk komunitas/event siap kami layani dengan standar mesin DTF presisi. 😊";
  }

  return "Halo kak! Terima kasih telah menghubungi *Kaos Kami Makassar — Workshop Sablon DTF & Streetwear Apparel*. 👕🔥\n\nAda yang bisa kami bantu seputar pesanan kaos custom atau katalog ready stock kami kak?";
}

// ============================================================================
// 📱 BAILEYS WHATSAPP CLIENT SETUP
// ============================================================================
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_session");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["Kaos Kami Studio", "Chrome", "20.0.04"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      isConnected = false;
      console.log("📲 QR Code baru dibuat. Buka URL web untuk scan!");
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
      console.log(`✅ BOT WHATSAPP & AI CS KAOS KAMI AKTIF 24 JAM! (${userJid})`);
    }
  });

  // 👂 EVENT LISTENER: MENERIMA & MEMBALAS CHAT DARI PELANGGAN
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const senderJid = msg.key.remoteJid;
      // Jangan balas chat di grup WhatsApp
      if (senderJid.endsWith("@g.us")) return;

      const userText = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (!userText || userText.trim().length === 0) return;

      console.log(`[WA Chat Masuk dari ${senderJid}]: "${userText}"`);

      // 1. Kirim indikator 'sedang mengetik...' (Composing)
      await sock.sendPresenceUpdate("composing", senderJid);

      // 2. Dapatkan respon cerdas dari AI Kaos Kami
      const aiReply = await generateAIResponse(userText);

      // 3. Kirim balasan otomatis ke pelanggan
      await sock.sendMessage(senderJid, { text: aiReply });
      await sock.sendPresenceUpdate("paused", senderJid);
      console.log(`[WA AI Reply terkirim ke ${senderJid}]`);
    } catch (err) {
      console.error("[Auto-Reply Error]:", err.message);
    }
  });
}

connectToWhatsApp();

// ============================================================================
// 🌐 EXPRESS WEB DASHBOARD & API ROUTES
// ============================================================================

// 1. Dashboard Visual Web & QR Code Scanner
app.get("/", async (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Kaos Kami — WhatsApp & AI CS Bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, sans-serif; background: #0E0E10; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #18181B; padding: 36px; border-radius: 24px; border: 1px solid #27272A; text-align: center; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          .badge { background: #10B981; color: #000; padding: 6px 14px; border-radius: 999px; font-weight: 800; font-size: 11px; letter-spacing: 1px; display: inline-block; margin-bottom: 16px; }
          h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
          p { color: #A1A1AA; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; }
          .features { background: #121214; padding: 14px; border-radius: 12px; border: 1px solid #27272A; font-size: 12px; text-align: left; color: #D4D4D8; }
          .features li { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● ONLINE 24 JAM (HUGGING FACE)</div>
          <h1>KAOS KAMI WA & AI BOT</h1>
          <p>Bot WhatsApp resmi dan Asisten AI CS Kaos Kami Makassar telah terhubung dan aktif melayani pelanggan.</p>
          <div class="features">
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Auto-Reply AI CS:</strong> Menjawab tanya jawab sablon DTF & bahan.</li>
              <li><strong>Transactional Gateway:</strong> Kirim OTP & link bayar Duitku otomatis.</li>
              <li><strong>Keep-Alive Active:</strong> Endpoint <code>/health</code> siap di-ping UptimeRobot.</li>
            </ul>
          </div>
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
            .card { background: #18181B; padding: 32px; border-radius: 24px; border: 1px solid #E65100; text-align: center; max-width: 400px; box-shadow: 0 0 30px rgba(230,81,0,0.2); }
            .qr-box { background: #fff; padding: 16px; border-radius: 20px; display: inline-block; margin: 16px 0; }
            h1 { font-size: 19px; margin: 0 0 8px 0; color: #E65100; font-weight: 900; }
            p { color: #A1A1AA; font-size: 13px; margin: 0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>TAUTKAN WHATSAPP TOKO</h1>
            <p>Buka WhatsApp di HP &gt; Perangkat Tertaut &gt; Scan QR di bawah:</p>
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="Scan QR Code" width="240" height="240" />
            </div>
            <p><small style="color: #71717A;">Halaman ini otomatis me-refresh tiap 10 detik.</small></p>
          </div>
        </body>
        </html>
      `);
    } catch (e) {
      return res.status(500).send("Gagal membuat QR Image");
    }
  }

  return res.send("Sedang menginisialisasi WhatsApp... Silakan refresh kembali dalam 5 detik.");
});

// 2. Health Check (Untuk UptimeRobot agar container tidak tidur)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    connected: isConnected,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    aiModel: HF_TOKEN ? "Qwen/Qwen2.5-72B-Instruct" : "Rule-Based Expert Engine"
  });
});

// 3. Endpoint Kirim Pesan Transaksional dari Website Kaos Kami
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
    console.log(`[WA Gateway Transaksi] Pesan terkirim ke ${cleanPhone}`);

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
  console.log(`🚀 Kaos Kami WA & AI Gateway running on port ${PORT}`);
});
