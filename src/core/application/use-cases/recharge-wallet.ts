import { EVENT_NAMES, createEvent } from "../../domain/events";
import { paiseToRupees } from "../../domain/value-objects/money";
import type {
  AuthUser,
  Clock,
  EventRepository,
  IdGenerator,
  PaymentGateway,
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
  const emit = (
    name: (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES],
    props: Record<string, unknown>,
  ) =>
    deps.events.append(
      createEvent(
        name,
        { actorId: actor.uid, actorType: "buyer", buyerId: actor.uid },
        props,
        {
          id: deps.ids.next("e"),
          ts: deps.clock.now(),
          actor: { id: actor.uid, type: "buyer" },
          sessionId: deps.session.sessionId(),
        },
      ),
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
