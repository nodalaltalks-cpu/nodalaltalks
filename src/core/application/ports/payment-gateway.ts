/**
 * Payment abstraction. Business logic (wallet recharge, advisor payout) depends
 * ONLY on this port. Razorpay and Stripe adapters live in infrastructure and are
 * interchangeable via the PAYMENT_PROVIDER env var — no business code changes.
 *
 * Money is always in the smallest currency unit (paise) to avoid float drift.
 */
export interface PaymentGateway {
  readonly provider: "placeholder" | "razorpay" | "stripe";

  /** Create a payment intent/order for a wallet recharge. */
  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;

  /** Verify a gateway callback/signature server-side. */
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult>;

  /** Refund all or part of a captured payment (wallets are refundable). */
  refund(paymentId: string, amountPaise?: number): Promise<PaymentResult>;
}

export interface CreateOrderInput {
  amountPaise: number;
  currency: "INR";
  /** Our internal reference — typically the buyer/wallet id. */
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amountPaise: number;
  currency: "INR";
  provider: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentResult {
  ok: boolean;
  paymentId: string;
  amountPaise: number;
  status: "captured" | "failed" | "refunded" | "pending";
  failureReason?: string;
}
