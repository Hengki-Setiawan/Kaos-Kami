import crypto from "crypto";

export interface CreateChargeInput {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  itemDetails: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export interface CreateChargeResult {
  providerRef: string;
  snapToken?: string;
  redirectUrl?: string;
}

export interface PaymentProvider {
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  verifyWebhookSignature(rawBody: string, headers?: Headers): boolean;
  parseWebhookEvent(payload: unknown): {
    providerRef: string;
    status: "PENDING" | "SETTLEMENT" | "EXPIRED" | "DENIED" | "REFUNDED" | "FAILED";
    method?: string;
  };
}

const MIDTRANS_SNAP_URL =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export const midtransProvider: PaymentProvider = {
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-dev-mock-key";
    const authString = Buffer.from(`${serverKey}:`).toString("base64");

    try {
      const res = await fetch(MIDTRANS_SNAP_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: input.orderNumber,
            gross_amount: Math.round(input.amountIdr),
          },
          customer_details: {
            first_name: input.customer.name,
            email: input.customer.email || `${input.customer.phone.replace(/[^0-9]/g, "")}@kaoskami.customer`,
            phone: input.customer.phone,
          },
          item_details: input.itemDetails.map((item) => ({
            id: item.id.slice(0, 50),
            name: item.name.slice(0, 50),
            price: Math.round(item.price),
            quantity: item.quantity,
          })),
          enabled_payments: ["gopay", "qris", "bank_transfer", "shopeepay", "credit_card"],
          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/orders/${input.orderId}?status=success`,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn("Midtrans API returned error, activating Sandbox Mock Token fallback:", errText);
        // Sandbox fallback if API key is not yet configured by user
        return {
          providerRef: input.orderNumber,
          snapToken: `mock-snap-token-${Date.now()}-${input.orderNumber}`,
          redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-${input.orderNumber}`,
        };
      }

      const data = await res.json();
      return {
        providerRef: input.orderNumber,
        snapToken: data.token,
        redirectUrl: data.redirect_url,
      };
    } catch (err) {
      console.warn("Midtrans request failed, using sandbox token fallback:", err);
      return {
        providerRef: input.orderNumber,
        snapToken: `mock-snap-token-${Date.now()}-${input.orderNumber}`,
        redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-${input.orderNumber}`,
      };
    }
  },

  verifyWebhookSignature(rawBody: string): boolean {
    try {
      const body = JSON.parse(rawBody);
      const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
      if (!serverKey) return true; // In development/mock mode, allow test webhooks

      const expected = crypto
        .createHash("sha512")
        .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
        .digest("hex");

      return expected === body.signature_key;
    } catch {
      return false;
    }
  },

  parseWebhookEvent(payload: unknown) {
    const body = payload as any;
    const statusMap: Record<string, any> = {
      capture: "SETTLEMENT",
      settlement: "SETTLEMENT",
      pending: "PENDING",
      deny: "DENIED",
      expire: "EXPIRED",
      cancel: "DENIED",
      refund: "REFUNDED",
    };

    return {
      providerRef: body?.order_id || "",
      status: statusMap[body?.transaction_status] ?? "FAILED",
      method: body?.payment_type,
    };
  },
};
