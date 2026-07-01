import { EVENT_NAMES } from "../../domain/events";
import { paiseToRupees } from "../../domain/value-objects/money";
import { createEventEmitter } from "../events/create-emitter";
import type {
  AuthUser,
  Clock,
  EventRepository,
  IdGenerator,
  PaymentGateway,
  RuntimeContext,
  SessionProvider,
  WalletLedger,
} from "../ports";

/**
 * rechargeWallet — verifies a payment and atomically credits the buyer's wallet.
 * Pure orchestration over ports; runs server-side (the ledger + event append use
 * the Admin SDK). The PaymentGateway is the placeholder today and Razorpay/Stripe
 * later — this use case never changes.
 *
 * Money convention: the ledger works in PAISE; emitted analytics props are in
 * RUPEES (so the Founder Dashboard's gmv/arpu read correctly).
 */
export interface RechargeWalletInput {
  amountPaise: number;
  method?: string;
  /** Provider verification payload (ignored by the placeholder adapter). */
  payment?: { orderId: string; paymentId: string; signature: string };
}

export interface RechargeWalletDeps {
  payments: PaymentGateway;
  ledger: WalletLedger;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

export interface RechargeWalletResult {
  balanceAfterPaise: number;
  transactionId: string;
}

export async function rechargeWallet(
  actor: AuthUser,
  input: RechargeWalletInput,
  deps: RechargeWalletDeps,
): Promise<RechargeWalletResult> {
  const emit = createEventEmitter(
    { id: actor.uid, type: "buyer" },
    { actorId: actor.uid, actorType: "buyer", buyerId: actor.uid },
    deps,
  );

  const amountRupees = paiseToRupees(input.amountPaise);

  // 1) Create + verify the payment (placeholder auto-captures).
  let order: { orderId: string; paymentId: string; signature: string };
  if (input.payment) {
    order = input.payment;
  } else {
    const created = await deps.payments.createOrder({
      amountPaise: input.amountPaise,
      currency: "INR",
      receipt: actor.uid,
    });
    order = { orderId: created.orderId, paymentId: "placeholder", signature: "placeholder" };
  }

  const result = await deps.payments.verifyPayment(order);
  if (!result.ok) {
    await emit(EVENT_NAMES.PAYMENT_FAILED, {
      amount: amountRupees,
      method: input.method,
      reason: result.failureReason ?? "verification_failed",
    });
    throw new Error(result.failureReason ?? "Payment could not be verified.");
  }

  // 2) Atomically credit the wallet + write the transaction (Admin adapter).
  const led = await deps.ledger.credit(actor.uid, input.amountPaise, {
    method: input.method,
    orderId: order.orderId,
  });

  // 3) Record the recharge for the analytics ledger (rupees).
  await emit(EVENT_NAMES.WALLET_RECHARGED, {
    amount: amountRupees,
    method: input.method,
    balanceAfter: paiseToRupees(led.balanceAfterPaise),
  });

  return { balanceAfterPaise: led.balanceAfterPaise, transactionId: led.transactionId };
}
