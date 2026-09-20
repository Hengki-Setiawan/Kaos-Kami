import crypto from "crypto";
import { siteUrl as canonicalSiteUrl } from "@/lib/siteUrl";
import { secretsEqual } from "@/lib/timingSafe";

export interface DuitkuCustomer {
  name: string;
  phone: string;
  email: string;
}

export interface DuitkuItemDetail {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateDuitkuChargeParams {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  customer: DuitkuCustomer;
      paymentMethod?: string; // QRIS ONLY ("SP") — keputusan owner Sep 2026 (fee 0,7%, lunas-dulu).
  itemDetails?: DuitkuItemDetail[];
  // Opsional: override returnUrl agar checkout mobile bisa kirim deep-link APK
  // (`kaoskami://payment/callback?orderId=&status=`). Default = perilaku web
  // sekarang — JANGAN ubah default web.
  returnUrlOverride?: string;
}

export interface DuitkuChargeResult {
  reference: string;
  paymentUrl: string;
  qrString?: string;
  vaNumber?: string;
  statusCode: string;
  statusMessage: string;
}

export class DuitkuPaymentProvider {
  private merchantCode: string;
  private apiKey: string;
  private isProduction: boolean;

  constructor() {
    // Secrets wajib via env / wrangler secret — JANGAN hardcode di source.
    // Lihat .env.example + `wrangler secret put DUITKU_MERCHANT_CODE / DUITKU_API_KEY`.
    this.merchantCode = (process.env.DUITKU_MERCHANT_CODE || "").trim();
    this.apiKey = (process.env.DUITKU_API_KEY || "").trim();
    this.isProduction = process.env.DUITKU_ENV === "production";
  }

  private assertConfigured(): void {
    if (!this.merchantCode || !this.apiKey) {
      throw new Error(
        "Duitku belum dikonfigurasi: set DUITKU_MERCHANT_CODE & DUITKU_API_KEY via env / wrangler secret."
      );
    }
  }

  /** True bila merchantCode + apiKey terisi (tanpa melempar). */
  public isConfigured(): boolean {
    return Boolean(this.merchantCode && this.apiKey);
  }

  /**
   * Fail-closed guard publik untuk route checkout/webhook.
   * Melempar bila secret kosong — caller ubah jadi 503, JANGAN lanjut verifikasi.
   */
  public assertDuitkuConfigured(): void {
    this.assertConfigured();
  }

  private getInquiryUrl(): string {
    return this.isProduction
      ? "https://passport.duitku.com/webapi/api/merchant/v2/inquiry"
      : "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";
  }

  /**
   * Generates MD5 signature for Duitku Inquiry:
   * MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
   */
  public generateInquirySignature(orderNumber: string, amount: number): string {
    // FAIL-CLOSED: jangan pernah tanda-tangani dengan secret kosong.
    this.assertConfigured();
    const raw = `${this.merchantCode}${orderNumber}${amount}${this.apiKey}`;
    return crypto.createHash("md5").update(raw).digest("hex");
  }

  /**
   * Verifies MD5 signature from Duitku Callback Webhook:
   * MD5(merchantCode + amount + merchantOrderId + apiKey)
   * PLUS HMAC-SHA256 varian dokumentasi baru (merchantCode+amount+orderId).
   * Dua-duanya diterima: jika Duitku migrasi format, callback asli tetap lolos
   * (terverifikasi: sandbox masih MD5; HMAC disiapkan untuk rotasi).
   */
  public verifyCallbackSignature(
    merchantCode: string,
    amount: string | number,
    merchantOrderId: string,
    signature: string
  ): boolean {
    // FAIL-CLOSED: jangan pernah verifikasi dengan secret kosong — callback
    // palsu bisa dibuat dari MD5(merchantCode+amount+orderId+""). Webhook
    // wajib cek assertDuitkuConfigured() dulu (503), ini pertahanan lapis-2.
    if (!this.apiKey || !this.merchantCode) return false;
    const sig = (signature || "").toLowerCase();
    const md5 = crypto
      .createHash("md5")
      .update(`${merchantCode}${amount}${merchantOrderId}${this.apiKey}`)
      .digest("hex")
      .toLowerCase();
    if (secretsEqual(md5, sig)) return true;
    try {
      const hmac = crypto
        .createHmac("sha256", this.apiKey)
        .update(`${merchantCode}${amount}${merchantOrderId}`)
        .digest("hex")
        .toLowerCase();
      if (secretsEqual(hmac, sig)) return true;
    } catch {}
    return false;
  }

  /**
   * Request Duitku Payment URL & Reference
   */
  public async createCharge(params: CreateDuitkuChargeParams): Promise<DuitkuChargeResult> {
    this.assertConfigured();
    const siteUrl = canonicalSiteUrl();
    const callbackUrl = `${siteUrl}/api/webhooks/duitku`;
    // Opsional: override returnUrl untuk deep-link APK mobile. Default =
    // perilaku web sekarang (halaman invoice) — JANGAN ubah default web.
    const returnUrl = params.returnUrlOverride || `${siteUrl}/orders/${params.orderId}`;

    const signature = this.generateInquirySignature(params.orderNumber, params.amountIdr);

    const payload = {
      merchantCode: this.merchantCode,
      paymentAmount: params.amountIdr,
      paymentMethod: params.paymentMethod || "SP", // Default to ShopeePay / QRIS or multi-channel
      merchantOrderId: params.orderNumber,
      productDetails: `Kaos Kami Custom Sablon — ${params.orderNumber}`,
      email: params.customer.email || "customer@kaoskami.biz.id",
      phoneNumber: params.customer.phone,
      additionalParam: "",
      merchantUserInfo: "",
      customerVaName: params.customer.name,
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: 1440, // 24 jam dalam menit
      // Duitku v2 Inquiry API: Duitku validates paymentAmount == sum(it.price).
      // If quantity > 1, Duitku does NOT multiply price * quantity in its validation check.
      // We normalize each line so price = unitPrice * quantity and quantity = 1,
      // prefixing name with "Nx " if quantity > 1 so line item clarity is preserved.
      itemDetails: params.itemDetails?.map((it) => {
        const qty = it.quantity || 1;
        const linePrice = it.price * qty;
        const prefix = qty > 1 && !it.name.startsWith(`${qty}x `) ? `${qty}x ` : "";
        return {
          name: `${prefix}${it.name}`.slice(0, 120),
          price: linePrice,
          quantity: 1,
        };
      }),
    };

    try {
      const response = await fetch(this.getInquiryUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-duitku-merchantcode": this.merchantCode,
          "x-duitku-signature": signature,
          "x-duitku-timestamp": Date.now().toString(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Sandbox mengembalikan {"Message": "..."} + HTTP 4xx bila item tidak
      // balance (paymentAmount != Σ item) — teruskan pesannya apa adanya.
      if (data.statusCode && data.statusCode !== "00") {
        throw new Error(data.statusMessage || `Duitku Error: ${data.statusCode}`);
      }
      if (!response.ok && !data.statusCode) {
        throw new Error(data.Message || `Duitku HTTP ${response.status}`);
      }

      if (!data.reference && !data.paymentUrl) {
        throw new Error("Duitku response tidak valid: reference/paymentUrl kosong");
      }

      return {
        reference: data.reference || `DUITKU-${params.orderNumber}`,
        paymentUrl: data.paymentUrl || `https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=${data.reference}`,
        qrString: data.qrString,
        vaNumber: data.vaNumber,
        statusCode: data.statusCode || "00",
        statusMessage: data.statusMessage || "SUCCESS",
      };
    } catch (err: any) {
      // FAIL-CLOSED: jangan pernah return SUCCESS palsu. Caller (checkout) akan
      // mengubahnya jadi 502 + Sentry, order tetap PENDING_PAYMENT dan bisa retry.
      console.error("Duitku createCharge error:", err);
      throw new Error(`Duitku charge gagal: ${err?.message || "unknown error"}`);
    }
  }

  /**
   * Cek status transaksi ke Duitku (server-to-server, read-only):
   * "00"=lunas, "01"=proses, "02"=gagal/kedaluarsa.
   * Dipakai bayar-ulang untuk memastikan tidak menagih order yang ternyata
   * sudah lunas (webhook telat/hilang). Rumus signature terverifikasi sandbox:
   * MD5(merchantCode + merchantOrderId + apiKey).
   */
  public async checkTransactionStatus(
    merchantOrderId: string
  ): Promise<{ statusCode: string; statusMessage: string; reference?: string; amount?: string }> {
    this.assertConfigured();
    const url = this.isProduction
      ? "https://passport.duitku.com/webapi/api/merchant/transactionStatus"
      : "https://sandbox.duitku.com/webapi/api/merchant/transactionStatus";
    const signature = crypto
      .createHash("md5")
      .update(`${this.merchantCode}${merchantOrderId}${this.apiKey}`)
      .digest("hex");
    const form = new URLSearchParams({
      merchantCode: this.merchantCode,
      merchantOrderId,
      signature,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json();
    return {
      statusCode: data.statusCode || "",
      statusMessage: data.statusMessage || data.Message || "",
      reference: data.reference,
      amount: data.amount,
    };
  }
}

export const duitkuProvider = new DuitkuPaymentProvider();
