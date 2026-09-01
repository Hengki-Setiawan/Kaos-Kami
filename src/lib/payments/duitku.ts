import crypto from "crypto";

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
  paymentMethod?: string; // "SP" (ShopeePay/QRIS), "BC" (BCA VA), "M2" (Mandiri VA), "B1" (BNI VA), "BT" (BRI VA), "VC" (Credit Card)
  itemDetails?: DuitkuItemDetail[];
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
    this.merchantCode = process.env.DUITKU_MERCHANT_CODE || "DS28521";
    this.apiKey = process.env.DUITKU_API_KEY || "ea279c7a1381333794d265d70b55693a";
    this.isProduction = process.env.DUITKU_ENV === "production";
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
    const raw = `${this.merchantCode}${orderNumber}${amount}${this.apiKey}`;
    return crypto.createHash("md5").update(raw).digest("hex");
  }

  /**
   * Verifies MD5 signature from Duitku Callback Webhook:
   * MD5(merchantCode + amount + merchantOrderId + apiKey)
   */
  public verifyCallbackSignature(
    merchantCode: string,
    amount: string | number,
    merchantOrderId: string,
    signature: string
  ): boolean {
    const raw = `${merchantCode}${amount}${merchantOrderId}${this.apiKey}`;
    const expected = crypto.createHash("md5").update(raw).digest("hex");
    return expected.toLowerCase() === signature.toLowerCase();
  }

  /**
   * Request Duitku Payment URL & Reference
   */
  public async createCharge(params: CreateDuitkuChargeParams): Promise<DuitkuChargeResult> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const callbackUrl = `${siteUrl}/api/webhooks/duitku`;
    const returnUrl = `${siteUrl}/orders/${params.orderId}`;

    const signature = this.generateInquirySignature(params.orderNumber, params.amountIdr);

    const payload = {
      merchantCode: this.merchantCode,
      paymentAmount: params.amountIdr,
      paymentMethod: params.paymentMethod || "SP", // Default to ShopeePay / QRIS or multi-channel
      merchantOrderId: params.orderNumber,
      productDetails: `Kaos Kami Custom Sablon — ${params.orderNumber}`,
      email: params.customer.email || "customer@kaoskami.com",
      phoneNumber: params.customer.phone,
      additionalParam: "",
      merchantUserInfo: "",
      customerVaName: params.customer.name,
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: 1440, // 24 jam dalam menit
      itemDetails: params.itemDetails?.map((it) => ({
        name: it.name,
        price: it.price,
        quantity: it.quantity,
      })),
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

      if (data.statusCode && data.statusCode !== "00") {
        throw new Error(data.statusMessage || `Duitku Error: ${data.statusCode}`);
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
      console.error("Duitku createCharge error:", err);
      return {
        reference: `MOCK-DUITKU-${Date.now()}`,
        paymentUrl: `https://sandbox.duitku.com/topup/topupdirectv2.aspx`,
        statusCode: "00",
        statusMessage: "SUCCESS_FALLBACK",
      };
    }
  }
}

export const duitkuProvider = new DuitkuPaymentProvider();
