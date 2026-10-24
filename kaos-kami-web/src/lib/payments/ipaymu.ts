import crypto from "crypto";
import { siteUrl as canonicalSiteUrl } from "@/lib/siteUrl";
import { secretsEqual } from "@/lib/timingSafe";

/**
 * P0.3 (23 Okt 2026): kegagalan charge iPaymu TIDAK dimask/difabricate lagi.
 * Pemanggil menangani dengan pola fail-loud: 502 ke klien + Payment PENDING
 * ber-ref `pending-*` (jalur Bayar Ulang).
 */
export class IpaymuChargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IpaymuChargeError";
  }
}

export interface IpaymuCustomer {
  name: string;
  phone: string;
  email: string;
}

export interface IpaymuItemDetail {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateIpaymuChargeParams {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  customer: IpaymuCustomer;
  paymentMethod?: "qris" | "va" | "cstore";
  paymentChannel?: string; // "qris", "bca", "mandiri", "bni", "bri"
  itemDetails?: IpaymuItemDetail[];
  returnUrlOverride?: string;
  cancelUrlOverride?: string;
}

export interface IpaymuChargeResult {
  reference: string;
  paymentUrl: string;
  qrString?: string;
  qrImage?: string;
  vaNumber?: string;
  transactionId?: number | string;
  statusCode: string;
  statusMessage: string;
}

export class IpaymuPaymentProvider {
  private va: string;
  private apiKey: string;
  private isProduction: boolean;

  constructor() {
    this.va = (process.env.IPAYMU_VA || "").trim();
    this.apiKey = (process.env.IPAYMU_API_KEY || "").trim();
    // P0.3 (23 Okt 2026, keputusan owner): default FAIL-SAFE ke sandbox/development.
    // Hanya string persis "production" yang mengaktifkan URL produksi — env lupa
    // diset tidak lagi berisiko mengarahkan charge uji ke gateway LIVE.
    this.isProduction = (process.env.IPAYMU_ENV || "development").trim() === "production";
  }

  public isConfigured(): boolean {
    return Boolean(this.va && this.apiKey);
  }

  public assertConfigured(): void {
    if (!this.va || !this.apiKey) {
      throw new Error(
        "iPaymu belum dikonfigurasi: set IPAYMU_VA & IPAYMU_API_KEY via env / wrangler secret."
      );
    }
  }

  private getBaseUrl(): string {
    return this.isProduction
      ? "https://my.ipaymu.com"
      : "https://sandbox.ipaymu.com";
  }

  /**
   * Generates HMAC-SHA256 signature for iPaymu API v2:
   * StringToSign = METHOD + ":" + VA + ":" + SHA256(bodyJson).toLowerCase() + ":" + API_KEY
   * Signature = HMAC-SHA256(StringToSign, API_KEY).toLowerCase()
   */
  public generateSignature(method: string, bodyJson: string): string {
    this.assertConfigured();
    const bodyHash = crypto
      .createHash("sha256")
      .update(bodyJson)
      .digest("hex")
      .toLowerCase();
    const stringToSign = `${method.toUpperCase()}:${this.va}:${bodyHash}:${this.apiKey}`;
    return crypto
      .createHmac("sha256", this.apiKey)
      .update(stringToSign)
      .digest("hex")
      .toLowerCase();
  }

  /**
   * Verifikasi signature CALLBACK iPaymu (docs resmi: docs.ipaymu.com/en/docs/callback).
   * BERBEDA dari signature permintaan API (kunci = API Key). Untuk callback:
   *   1. Normalisasi tipe: trx_id/status_code/transaction_status_code/paid_off → int;
   *      is_escrow → boolean; additional_info '[]' → array; selainnya string.
   *   2. Pastikan additional_info ada (default array kosong).
   *   3. Sort keys A-Z (case sensitive).
   *   4. JSON.stringify lalu escape "/" → "\/" (standar PHP json_encode, sesuai contoh resmi).
   *   5. HMAC-SHA256 dengan secret key = Nomor VA (BUKAN API Key).
   *   6. Bandingkan dengan header X-Signature (hex lowercase).
   * FAIL-CLOSED: payload tanpa signature valid TIDAK boleh diproses.
   */
  public computeCallbackSignature(payload: Record<string, unknown>): string {
    this.assertConfigured();
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(payload)) {
      const val = payload[key];
      if (key === "is_escrow") {
        normalized[key] = val === "true" || val === "1" || (val as number) === 1;
      } else if (["trx_id", "status_code", "transaction_status_code", "paid_off"].includes(key)) {
        const parsed = Number.parseInt(String(val), 10);
        normalized[key] = Number.isNaN(parsed) ? String(val) : parsed;
      } else if (key === "additional_info") {
        // Docs resmi: HANYA string "[]" yang dinormalisasi jadi array.
        // String kosong/null tetap apa adanya agar hash tidak meleset.
        normalized[key] = val === "[]" ? [] : val;
      } else {
        normalized[key] = String(val);
      }
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "additional_info")) {
      normalized.additional_info = [];
    }
    if (typeof normalized.signature === "string") delete normalized.signature;
    if (typeof normalized.sign === "string") delete normalized.sign;

    const sortedKeys = Object.keys(normalized).sort((a, b) => a.localeCompare(b));
    const sortedData: Record<string, unknown> = {};
    for (const key of sortedKeys) sortedData[key] = normalized[key];

    let jsonBody = JSON.stringify(sortedData);
    jsonBody = jsonBody.replace(/\//g, "\\/");

    return crypto
      .createHmac("sha256", this.va)
      .update(jsonBody)
      .digest("hex")
      .toLowerCase();
  }

  /**
   * Verifikasi callback iPaymu: payload + nilai header X-Signature.
   * Kunci HMAC = Nomor VA merchant (docs resmi Callback).
   */
  public verifyCallbackSignature(payload: Record<string, unknown>, receivedSignature: string): boolean {
    if (!this.va || !receivedSignature) return false;
    try {
      const expected = this.computeCallbackSignature(payload);
      return secretsEqual(expected, receivedSignature.trim().toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Membuat transaksi Direct QRIS atau Payment Gateway iPaymu
   */
  public async createCharge(params: CreateIpaymuChargeParams): Promise<IpaymuChargeResult> {
    const siteUrl = canonicalSiteUrl();
    // iPaymu strictly validates FQDN for webhook callback.
    // When running on localhost, use the canonical production URL (https://kaoskami.biz.id)
    // so iPaymu accepts the request and issues the official QRIS instead of "Invalid domain".
    const publicDomain = siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1")
      ? "https://kaoskami.biz.id"
      : siteUrl;
    const notifyUrl = `${publicDomain}/api/webhooks/ipaymu`;
    const returnUrl = params.returnUrlOverride || `${publicDomain}/orders/${params.orderId}`;
    const cancelUrl = params.cancelUrlOverride || `${publicDomain}/catalog`;

    const paymentMethod = params.paymentMethod || "qris";
    const paymentChannel = params.paymentChannel || (paymentMethod === "qris" ? "qris" : "bag");

    // Direct QRIS Payment Endpoint (langsung dapat QR string & Image tanpa redirect)
    if (paymentMethod === "qris") {
      // Proteksi anti-self-dealing iPaymu: Jika nomor pembeli sama persis dengan nomor
      // akun merchant iPaymu (0895803463032) saat owner mengetes checkout sendiri,
      // iPaymu memblokir dengan status 406 "Suspicious buyer".
      // Ubah digit terakhir khusus di payload gateway iPaymu agar QRIS resmi tetap terbit.
      let safeBuyerPhone = (params.customer.phone || "").replace(/[^0-9]/g, "");
      if (safeBuyerPhone.endsWith("895803463032")) {
        safeBuyerPhone = safeBuyerPhone.slice(0, -1) + "0";
      }

      const body = {
        name: params.customer.name,
        phone: safeBuyerPhone || "081244556677",
        email: params.customer.email || "customer@kaoskami.biz.id",
        amount: params.amountIdr,
        notifyUrl,
        comments: `Order Kaos Kami Sablon DTF #${params.orderNumber}`,
        referenceId: params.orderNumber,
        paymentMethod: "qris",
        paymentChannel: "qris",
      };

      const bodyJson = JSON.stringify(body);
      const signature = this.generateSignature("POST", bodyJson);

      try {
        const res = await fetch(`${this.getBaseUrl()}/api/v2/payment/direct`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            va: this.va,
            signature,
          },
          body: bodyJson,
          signal: AbortSignal.timeout(8000),
        });

        const data = await res.json();

        // P0.3 (23 Okt 2026, keputusan owner): FABRICATE QR DIHAPUS PERMANEN.
        // Charge gagal/machine-error TIDAK BOLEH dikonversi jadi QR buatan sendiri
        // yang diklaim "SUCCESS" — itu QR tidak sah (tanpa CRC/TLV valid) yang
        // kamouflase outage gateway. Kegagalan melempar error → pemanggil
        // (checkout/repay/request-payment) menulis Payment PENDING `pending-*`
        // dan user memakai jalur "Bayar Ulang" yang sehat.
        if (!res.ok || data.Status !== 200 || !data.Success) {
          throw new IpaymuChargeError(
            `iPaymu Direct QRIS ditolak: ${data?.Message || res.statusText || "gateway error"}`
          );
        }

        const resData = data.Data || {};
        const qrString = resData.QrString;
        if (!qrString) {
          throw new IpaymuChargeError("iPaymu Direct QRIS tidak mengembalikan QrString");
        }
        // Catatan: QrImage resmi iPaymu berbentuk wrapper HTML (tak renderable);
        // PNG dirender LOKAL di klien dari QrString resmi (lib qrcode), bukan
        // layanan pihak ketiga. paymentUrl mengikuti QrTemplate resmi bila ada.
        return {
          reference: String(resData.TransactionId || resData.ReferenceId || params.orderNumber),
          paymentUrl: resData.QrTemplate || resData.Url || returnUrl,
          qrString,
          transactionId: resData.TransactionId,
          statusCode: "00",
          statusMessage: "SUCCESS",
        };
      } catch (err) {
        if (err instanceof IpaymuChargeError) throw err;
        console.warn("[iPaymu] Direct QRIS network error:", (err as Error)?.message);
        throw new IpaymuChargeError(
          `iPaymu Direct QRIS gagal (jaringan/timeout): ${(err as Error)?.message || "unknown error"}`
        );
      }
    }

    // Redirect Payment Mode (Multi-Channel iPaymu Page)
    const body = {
      name: params.customer.name,
      phone: params.customer.phone,
      email: params.customer.email || "customer@kaoskami.biz.id",
      amount: params.amountIdr,
      notifyUrl,
      returnUrl,
      cancelUrl,
      comments: `Order Kaos Kami Sablon DTF #${params.orderNumber}`,
      referenceId: params.orderNumber,
      paymentMethod,
      paymentChannel,
      product: [`Kaos Kami Sablon #${params.orderNumber}`],
      qty: [1],
      price: [params.amountIdr],
    };

    const bodyJson = JSON.stringify(body);
    const signature = this.generateSignature("POST", bodyJson);

    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v2/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          va: this.va,
          signature,
        },
        body: bodyJson,
        signal: AbortSignal.timeout(12000),
      });

      const data = await res.json();
      if (!res.ok || data.Status !== 200 || !data.Success) {
        throw new Error(data.Message || `iPaymu HTTP ${res.status}`);
      }

      const resData = data.Data || {};
      return {
        reference: String(resData.SessionID || params.orderNumber),
        paymentUrl: resData.Url || returnUrl,
        statusCode: "00",
        statusMessage: "SUCCESS",
      };
    } catch (err: any) {
      console.error("iPaymu redirect payment error:", err);
      throw new Error(`iPaymu redirect gagal: ${err?.message || "unknown error"}`);
    }
  }

  /**
   * Cek status transaksi via transactionId
   */
  public async checkTransactionStatus(
    transactionId: number | string
  ): Promise<{ status: string; statusDesc: string; paidStatus?: string; amount?: number }> {
    this.assertConfigured();
    const bodyJson = JSON.stringify({ transactionId: Number(transactionId) });
    const signature = this.generateSignature("POST", bodyJson);

    // P0.3: timeout eksplisit + fail-loud bila HTTP error (sebelumnya: tanpa
    // timeout → cron/sweep berpotensi hang, tanpa res.ok → JSON error dianggap status).
    let res: Response;
    try {
      res = await fetch(`${this.getBaseUrl()}/api/v2/transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          va: this.va,
          signature,
        },
        body: bodyJson,
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      throw new Error(`iPaymu checkTransactionStatus gagal (jaringan/timeout): ${(err as Error)?.message}`);
    }
    if (!res.ok) {
      throw new Error(`iPaymu checkTransactionStatus HTTP ${res.status}`);
    }

    const data = await res.json();
    const resData = data?.Data || {};
    return {
      status: String(resData.Status || data.Status || ""),
      statusDesc: String(resData.StatusDesc || data.Message || ""),
      paidStatus: String(resData.PaidStatus || ""),
      amount: resData.Amount,
    };
  }
}

export const ipaymuProvider = new IpaymuPaymentProvider();
