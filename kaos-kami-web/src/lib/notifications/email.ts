/**
 * Layanan Pengiriman Email Transaksional (OTP, Notifikasi) Kaos Kami
 * Menggunakan Resend REST API murni (tanpa npm package berat, kompatibel dengan Edge/Cloudflare Worker)
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Kirim email via Resend REST API (Edge/Cloudflare Worker compatible)
 * Membutuhkan RESEND_API_KEY. Mock mode telah dinonaktifkan secara permanen.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const errorMsg = "Layanan pengiriman email belum dikonfigurasi (RESEND_API_KEY kosong).";
    console.error(`[Email] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  }

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || "Kaos Kami <noreply@kaoskami.biz.id>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      let errorMsg = (errJson as any)?.message || `Resend API status: ${res.status}`;
      
      // Berikan panduan ramah jika domain belum diverifikasi di Resend
      if (res.status === 403 && typeof errorMsg === "string" && errorMsg.includes("not verified")) {
        errorMsg = "Domain pengirim belum diverifikasi di Resend. Silakan verifikasi domain di resend.com/domains atau gunakan onboarding@resend.dev.";
      } else if (res.status === 403 && typeof errorMsg === "string" && errorMsg.includes("testing emails")) {
        errorMsg = "Resend (tanpa custom domain) hanya mengizinkan pengiriman ke email akun terdaftar Anda. Untuk kirim ke semua email, verifikasi domain di resend.com/domains.";
      }

      console.warn("[Resend] Gagal mengirim email:", errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Email] Exception sending email:", err);
    return { success: false, error: err?.message || "Gagal mengirim email verifikasi" };
  }
}

/**
 * Template Khusus Pengiriman Kode OTP Pendaftaran Akun Kaos Kami
 */
export async function sendEmailOtp(toEmail: string, otpCode: string, name?: string): Promise<SendEmailResult> {
  const greeting = name ? `Halo ${name},` : "Halo Pelanggan Kaos Kami,";
  const subject = `${otpCode} adalah Kode Verifikasi Pendaftaran Akun Kaos Kami`;

  console.log(`\n=========================================================`);
  console.log(`[EMAIL OTP VERIFIKASI KAOS KAMI]`);
  console.log(`Kepada: ${toEmail}`);
  console.log(`Nama: ${name || "-"}`);
  console.log(`Kode OTP: ${otpCode}`);
  console.log(`Berlaku: 10 Menit`);
  console.log(`=========================================================\n`);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0E10; color: #ECECED; margin: 0; padding: 20px; }
    .card { max-width: 500px; margin: 0 auto; background-color: #18181B; border: 1px solid #27272A; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { color: #E65100; font-weight: 900; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
    .title { font-size: 18px; font-weight: 700; color: #FFFFFF; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #A1A1AA; margin-bottom: 24px; }
    .otp-box { background-color: #0E0E10; border: 2px dashed #E65100; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #FF6D00; }
    .footer { font-size: 12px; color: #71717A; text-align: center; border-top: 1px solid #27272A; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">KAOS KAMI · MAKASSAR DTF SABLON</div>
    <div class="title">Verifikasi Akun Anda</div>
    <div class="text">
      ${greeting}<br><br>
      Terima kasih telah bergabung di platform interaktif sablon DTF Kaos Kami. Gunakan 6-digit kode verifikasi berikut untuk mengaktifkan akun Anda:
    </div>
    <div class="otp-box">
      <div class="otp-code">${otpCode}</div>
    </div>
    <div class="text" style="font-size: 12px; color: #71717A;">
      Kode verifikasi ini hanya berlaku selama <strong>10 menit</strong>. Jangan pernah memberikan kode ini kepada siapapun demi keamanan akun Anda.
    </div>
    <div class="footer">
      Kaos Kami — Platform 3D Interactive Apparel & DTF Sablon Hyperlocal Makassar.<br>
      Jika Anda tidak merasa mendaftar, silakan abaikan email ini.
    </div>
  </div>
</body>
</html>
  `.trim();

  const res = await sendEmail({ to: toEmail, subject, html });
  return { ...res, code: otpCode };
}
