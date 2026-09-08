import { SHOP_ADDRESS, SHOP_WHATSAPP } from "@/lib/shop";

export interface TechPackData {
  orderId: string;
  brandName: string;
  designerPhone: string;
  apparelTitle: string;
  colorName: string;
  colorHex: string;
  size: string;
  printWidthCm: number;
  printHeightCm: number;
  offsetFromCollarCm: number;
  estimatedFilmCostIdr: number;
}

export function generateTechPackHtml(data: TechPackData): string {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Tech Pack Sablon DTF — ${data.orderId}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #111827;
            padding: 24px;
            max-width: 800px;
            margin: 0 auto;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #FF6B35;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .logo {
            font-size: 20px;
            font-weight: 900;
            color: #FF6B35;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            color: #111827;
          }
          .badge {
            background: #FEF3C7;
            color: #D97706;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }
          .card {
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            padding: 16px;
            background: #F9FAFB;
          }
          .card-title {
            font-size: 12px;
            font-weight: bold;
            color: #6B7280;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .value {
            font-size: 14px;
            font-weight: bold;
            color: #111827;
          }
          .highlight {
            color: #FF6B35;
            font-weight: 900;
          }
          .instructions {
            background: #FFFBEB;
            border-left: 4px solid #F59E0B;
            padding: 16px;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.6;
          }
          .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 11px;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">KAOS KAMI MAKASSAR</div>
            <div class="title">LEMBAR SPESIFIKASI PRODUKSI SABLON DTF</div>
          </div>
          <div>
            <span class="badge">JOB TICKET WORKSHOP</span>
            <p style="font-size: 11px; color: #6B7280; margin: 4px 0 0 0; text-align: right;">${currentDate}</p>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">1. Identitas Pesanan & Apparel</div>
            <p>ID Order: <span class="value">${data.orderId}</span></p>
            <p>Apparel: <span class="value">${data.apparelTitle} (${data.size})</span></p>
            <p>Warna Kain: <span class="value">${data.colorName}</span> (<code>${data.colorHex}</code>)</p>
          </div>

          <div class="card">
            <div class="card-title">2. Kalibrasi DTF Printhead (Batas 30cm)</div>
            <p>Lebar Sablon: <span class="value highlight">${data.printWidthCm} cm</span></p>
            <p>Tinggi Sablon: <span class="value highlight">${data.printHeightCm} cm</span></p>
            <p>Jarak dari Kerah: <span class="value">${data.offsetFromCollarCm} cm</span></p>
            <p>Estimasi Film DTF: <span class="value">Rp ${data.estimatedFilmCostIdr.toLocaleString('id-ID')}</span></p>
          </div>
        </div>

        <div class="instructions">
          <strong>SOP PRESS PANAS WORKSHOP TAMALANREA:</strong><br />
          1. Panaskan mesin heat press hingga suhu stabil <strong>160°C</strong>.<br />
          2. Press kain polos selama <strong>3 detik</strong> untuk menghilangkan kelembapan serat kain.<br />
          3. Posisikan film DTF sesuai ukuran <strong>${data.printWidthCm}x${data.printHeightCm} cm</strong> dan press selama <strong>15 detik</strong> dengan tekanan 4-5 bar.<br />
          4. Tunggu film dingin sempurna (*Cold Peel*), lalu kelupas perlahan.<br />
          5. Press ulang (*Second Press*) selama <strong>5 detik</strong> menggunakan kertas teflon untuk mengunci sablon ke pori-pori kain.
        </div>

        <div class="footer">
          Kaos Kami Workshop • ${SHOP_ADDRESS} • Hotline: ${SHOP_WHATSAPP}
        </div>
      </body>
    </html>
  `;
}
