import type {
  CreateOrderInput,
  PaymentGateway,
  PaymentOrder,
  PaymentResult,
  VerifyPaymentInput,
} from "@core/application/ports";

/**
 * Placeholder PaymentGateway — auto-captures every payment. Lets the wallet flow
 * run end-to-end today without a real provider. Swap for a Razorpay/Stripe
 * adapter (same port) via PAYMENT_PROVIDER; the rechargeWallet use case is unchanged.
 */
export class PlaceholderPaymentGateway implements PaymentGateway {
  readonly provider = "placeholder" as const;

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    return {
      orderId: "plph_" + Date.now().toString(36),
      amountPaise: input.amountPaise,
      currency: "INR",
      provider: this.provider,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult> {
    return {
      ok: true,
      paymentId: input.paymentId || "plph_pay",
      amountPaise: 0,
      status: "captured",
    };
  }

  async refund(paymentId: string, amountPaise?: number): Promise<PaymentResult> {
    return { ok: true, paymentId, amountPaise: amountPaise ?? 0, status: "refunded" };
  }
}
