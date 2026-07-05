import { EVENT_NAMES } from "../../domain/events";
import type { Call } from "../../domain/entities";
import { formatPaise, paiseToRupees } from "../../domain/value-objects/money";
import { splitCallCharge } from "../../domain/value-objects/commission";
import { createEventEmitter } from "../events/create-emitter";
import type {
  AdvisorProfileRepository,
  AuthUser,
  CallRepository,
  CallService,
  CallSession,
  Clock,
  EventRepository,
  IdGenerator,
  NotificationRepository,
  NotificationService,
  PropertyRepository,
  RuntimeContext,
  SessionProvider,
  SystemSettingsRepository,
  WalletLedger,
  WalletRepository,
} from "../ports";

/**
 * Calls (Phase 2, Feature 8) — a buyer talks to a verified owner, billed per
 * minute from their prepaid wallet. Two trust boundaries, mirroring Wallet:
 *
 *  • requestCall runs CLIENT-SIDE (Security Rules let a buyer create/update
 *    their own call doc and read their own wallet balance). It fixes the
 *    per-minute rate, mints a calling session, and flips the doc to "started".
 *    No money moves here — only a pre-flight affordability check.
 *  • endCall runs SERVER-SIDE (Admin SDK) via WalletLedger.settleCall, exactly
 *    like rechargeWallet — wallets/transactions are server-owned, so the
 *    actual charge can only ever be written from a trusted server route.
 *
 * The placeholder CallService connects immediately (no advisor-side "answer"
 * step yet — that needs an advisor call-inbox UI, a later slice). Swapping in
 * Agora/Twilio later means a real accept/decline wait can slot in between
 * CALL_REQUESTED and CALL_ACCEPTED without changing either use case's shape.
 */

const MIN_BILLABLE_MINUTES = 1;

export interface CallDeps {
  advisors: AdvisorProfileRepository;
  properties: PropertyRepository;
  wallet: WalletRepository;
  calls: CallRepository;
  callService: CallService;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

export interface RequestCallInput {
  advisorId: string;
  recordingConsented?: boolean;
}

export interface RequestCallResult {
  call: Call;
  session: CallSession;
}

export async function requestCall(
  buyer: AuthUser,
  input: RequestCallInput,
  deps: CallDeps,
): Promise<RequestCallResult> {
  const advisor = await deps.advisors.get(input.advisorId);
  if (!advisor || advisor.status !== "active") {
    throw new Error("This advisor isn't available for calls right now.");
  }
  // Availability is opt-in (absent = offline): the advisor must have flipped
  // their online switch. Without live presence infra this is the honest
  // supply signal — see M8 in the roadmap.
  if (advisor.isAvailable !== true) {
    throw new Error("This advisor is offline right now — try again later or shortlist them.");
  }

  const wallet = await deps.wallet.get(buyer.uid);
  const balancePaise = wallet?.balancePaise ?? 0;
  const minCostPaise = advisor.ratePerMinPaise * MIN_BILLABLE_MINUTES;
  if (balancePaise < minCostPaise) {
    const emit = createEventEmitter(
      { id: buyer.uid, type: "buyer" },
      { buyerId: buyer.uid, advisorId: input.advisorId, actorId: buyer.uid, actorType: "buyer" },
      deps,
    );
    await emit(EVENT_NAMES.LOW_BALANCE_HIT, {
      balance: paiseToRupees(balancePaise),
      ratePerMin: paiseToRupees(advisor.ratePerMinPaise),
    });
    throw new Error("Add money to your wallet to start this call.");
  }

  // Resolve the project once, at request time, and carry it on the call doc —
  // this is the demand side of liquidityByProject (Marketplace Health's "who
  // needs advisor recruitment" panel), which reads entity.projectId off
  // call_requested. Without it every project reads as zero demand forever.
  const primaryProperty = advisor.primaryPropertyId
    ? await deps.properties.get(advisor.primaryPropertyId)
    : null;
  const projectId = primaryProperty?.project;

  const now = deps.clock.now();
  const callId = deps.ids.next("call");
  const recordingConsented = input.recordingConsented ?? false;
  const call: Call = {
    id: callId,
    buyerId: buyer.uid,
    advisorId: input.advisorId,
    projectId,
    status: "requested",
    ratePerMinPaise: advisor.ratePerMinPaise,
    requestedAt: now,
    recordingConsented,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
  await deps.calls.create(call);

  const emit = createEventEmitter(
    { id: buyer.uid, type: "buyer" },
    {
      callId,
      buyerId: buyer.uid,
      advisorId: input.advisorId,
      projectId,
      actorId: buyer.uid,
      actorType: "buyer",
    },
    deps,
  );
  await emit(EVENT_NAMES.CALL_REQUESTED, { ratePerMin: paiseToRupees(advisor.ratePerMinPaise) });

  const session = await deps.callService.createSession({
    callId,
    advisorId: input.advisorId,
    buyerId: buyer.uid,
    recordingConsented,
  });

  const startedAt = deps.clock.now();
  await deps.calls.update(callId, { status: "started", acceptedAt: startedAt, startedAt, updatedAt: startedAt });
  await emit(EVENT_NAMES.CALL_ACCEPTED, {});
  await emit(EVENT_NAMES.CALL_STARTED, { ratePerMin: paiseToRupees(advisor.ratePerMinPaise) });

  return {
    call: { ...call, status: "started", acceptedAt: startedAt, startedAt },
    session,
  };
}

/** Either participant backs out before/while it's ringing — no billing involved. */
export async function cancelCall(
  callId: string,
  actor: AuthUser,
  reason: string | undefined,
  deps: CallDeps,
): Promise<void> {
  const call = await deps.calls.get(callId);
  if (!call) throw new Error("Call not found.");
  if (call.status !== "requested" && call.status !== "started") {
    throw new Error("This call can no longer be cancelled.");
  }

  await deps.calls.update(callId, { status: "cancelled", updatedAt: deps.clock.now() });

  const actorType = actor.uid === call.advisorId ? "advisor" : "buyer";
  const emit = createEventEmitter(
    { id: actor.uid, type: actorType },
    {
      callId,
      buyerId: call.buyerId,
      advisorId: call.advisorId,
      projectId: call.projectId,
      actorId: actor.uid,
      actorType,
    },
    deps,
  );
  await emit(EVENT_NAMES.CALL_CANCELLED, { reason });
}

export interface EndCallDeps {
  calls: CallRepository;
  ledger: WalletLedger;
  settings: SystemSettingsRepository;
  notifications: NotificationRepository;
  notify: NotificationService;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

export type EndCallReason = "buyer_hangup" | "advisor_hangup" | "connection_lost";

/**
 * Server-only settlement: computes duration/charge from server-trusted
 * timestamps, debits the buyer and records the advisor's payout atomically
 * (WalletLedger.settleCall), then reconciles the call doc + emits call_completed.
 *
 * Known MVP limitation: the placeholder calling path has no live, minute-by-
 * minute metering, so in theory a call could outlast the buyer's balance
 * between requestCall's pre-flight check and hangup. settleCall throwing in
 * that case is left as a surfaced error rather than silently capped — real
 * live metering needs duration truth from an actual provider (Agora/Twilio),
 * which is exactly what swapping the CallService adapter later gives us.
 */
export async function endCall(
  callId: string,
  actor: AuthUser,
  endReason: EndCallReason,
  deps: EndCallDeps,
): Promise<Call> {
  const call = await deps.calls.get(callId);
  if (!call) throw new Error("Call not found.");
  if (call.status !== "started" || !call.startedAt) {
    throw new Error("This call isn't in progress.");
  }

  const now = deps.clock.now();
  const durationSec = Math.max(1, Math.round((now - call.startedAt) / 1000));
  const settings = await deps.settings.get();

  // Subsidized first experience: the buyer's FIRST completed call gets
  // settings.freeFirstCallMinutes free. Determined server-side from the
  // call history (never client input). Only the excess minutes bill; the
  // advisor's payout is a split of what was actually charged — the free
  // window is the platform's growth cost, not the advisor's.
  const priorCalls = await deps.calls.listRecentByBuyer(call.buyerId);
  const isFirstCompletedCall = !priorCalls.some(
    (c) => c.status === "completed" && c.id !== callId,
  );
  const freeSec = isFirstCompletedCall ? settings.freeFirstCallMinutes * 60 : 0;

  const billableSec = Math.max(0, durationSec - freeSec);
  const billableMinutes =
    billableSec === 0
      ? 0
      : freeSec > 0
        ? Math.ceil(billableSec / 60) // no minimum on a partially-free first call
        : Math.max(MIN_BILLABLE_MINUTES, Math.ceil(billableSec / 60));
  const amountChargedPaise = billableMinutes * call.ratePerMinPaise;
  const { advisorPayoutPaise } = splitCallCharge(amountChargedPaise, settings.platformCommissionRate);

  // A fully-free call moves no money — skip the ledger entirely rather than
  // writing zero-amount transactions.
  if (amountChargedPaise > 0) {
    await deps.ledger.settleCall({
      callId,
      buyerId: call.buyerId,
      advisorId: call.advisorId,
      amountChargedPaise,
      advisorPayoutPaise,
    });
  }

  const patch: Partial<Call> = {
    status: "completed",
    endedAt: now,
    durationSec,
    amountChargedPaise,
    advisorPayoutPaise,
    endReason,
    updatedAt: now,
  };
  await deps.calls.update(callId, patch);

  const emit = createEventEmitter(
    { id: actor.uid, type: actor.uid === call.advisorId ? "advisor" : "buyer" },
    { callId, buyerId: call.buyerId, advisorId: call.advisorId, projectId: call.projectId, actorId: actor.uid },
    deps,
  );
  await emit(EVENT_NAMES.CALL_COMPLETED, {
    durationSec,
    ratePerMin: paiseToRupees(call.ratePerMinPaise),
    amountCharged: paiseToRupees(amountChargedPaise),
    advisorPayout: paiseToRupees(advisorPayoutPaise),
    endReason,
  });

  // Both sides get a receipt — in-app notification (real, read by the
  // recipient's inbox) plus a push attempt through the placeholder adapter,
  // which becomes real once FCM replaces it, no use-case change needed.
  const buyerNotification = {
    id: deps.ids.next("notif"),
    userId: call.buyerId,
    type: "call_completed",
    title: "Call ended",
    body: `${Math.round(durationSec / 60)} min call — ${formatPaise(amountChargedPaise)} charged.`,
    read: false,
    data: { callId },
    createdAt: now,
  };
  const advisorNotification = {
    id: deps.ids.next("notif"),
    userId: call.advisorId,
    type: "call_completed",
    title: "You completed a call",
    body: `You earned ${formatPaise(advisorPayoutPaise)}.`,
    read: false,
    data: { callId },
    createdAt: now,
  };
  await Promise.all([
    deps.notifications.create(buyerNotification),
    deps.notifications.create(advisorNotification),
    deps.notify.push({ to: call.buyerId, title: buyerNotification.title, body: buyerNotification.body, data: { callId } }),
    deps.notify.push({ to: call.advisorId, title: advisorNotification.title, body: advisorNotification.body, data: { callId } }),
  ]);

  return { ...call, ...patch };
}
