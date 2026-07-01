import "server-only";
import type { RechargeWalletDeps } from "@core/application/use-cases/recharge-wallet";
import type { EndCallDeps } from "@core/application/use-cases/calls";
import type { SubmitReviewDeps } from "@core/application/use-cases/submit-review";
import { PlaceholderPaymentGateway } from "./payments/placeholder-payment-gateway";
import { AdminWalletLedger } from "./repositories/admin-wallet-ledger";
import { AdminCallRepository } from "./repositories/admin-call-repository";
import { AdminReviewLedger } from "./repositories/admin-review-ledger";
import { AdminEventRepository } from "./events/admin-event-repository";
import { systemClock } from "./system/system-clock";
import { idGenerator } from "./system/id-generator";
import { sessionProvider } from "./system/session-provider";
import { serverRuntimeContext } from "./system/runtime-context";

/**
 * Server-side composition root. Wires privileged Admin-SDK adapters for use cases
 * that run in route handlers / Cloud Functions. Kept separate from the client
 * composition (composition.ts) so the Admin SDK never reaches the browser bundle.
 *
 * PAYMENT_PROVIDER selects the gateway; placeholder today, Razorpay/Stripe later
 * with no change to rechargeWallet.
 */
export function buildRechargeDeps(): RechargeWalletDeps {
  return {
    payments: new PlaceholderPaymentGateway(),
    ledger: new AdminWalletLedger(),
    events: new AdminEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: serverRuntimeContext,
  };
}

/** Deps for endCall — the server-owned half (billing) of a call's lifecycle. */
export function buildEndCallDeps(): EndCallDeps {
  return {
    calls: new AdminCallRepository(),
    ledger: new AdminWalletLedger(),
    events: new AdminEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: serverRuntimeContext,
  };
}

/** Deps for submitReview — the server-owned half (advisor rating aggregate). */
export function buildSubmitReviewDeps(): SubmitReviewDeps {
  return {
    calls: new AdminCallRepository(),
    reviews: new AdminReviewLedger(),
    events: new AdminEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: serverRuntimeContext,
  };
}
