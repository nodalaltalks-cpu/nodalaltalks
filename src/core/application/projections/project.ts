import { EVENT_NAMES } from "../../domain/events/event-names";
import type { AnalyticsEvent } from "../../domain/events/event.types";
import type {
  AdvisorConversion,
  Metrics,
  ProjectLiquidity,
  Tally,
} from "./metrics.types";

/**
 * project(events) — the ONE pure reducer. The only place marketplace business
 * logic lives. Ported field-for-field from analytics.js `NDT.project()`.
 *
 * Pure and deterministic: no I/O, no Date.now() except the meta timestamp,
 * which is injected (`now`) for testability. The same function runs in the
 * browser (MVP) and later inside a Cloud Function (scale) with identical output.
 *
 * @param events  The full (or windowed) append-only event log.
 * @param now     Epoch ms used only for `_generatedAt`. Defaults to Date.now().
 */
export function project(
  events: readonly AnalyticsEvent[],
  now: number = Date.now(),
): Metrics {
  const E = EVENT_NAMES;
  const by = (n: string) => events.filter((e) => e.name === n);
  const uniq = <T>(arr: T[], key: (e: T) => unknown): number =>
    new Set(arr.map(key)).size;
  const sum = <T>(arr: T[], f: (e: T) => number | undefined): number =>
    arr.reduce((a, e) => a + (f(e) || 0), 0);

  const signups = by(E.BUYER_SIGNUP);
  const recharges = by(E.WALLET_RECHARGED);
  const requested = by(E.CALL_REQUESTED);
  const completed = by(E.CALL_COMPLETED);
  const cancelled = by(E.CALL_CANCELLED);
  const reviews = by(E.REVIEW_SUBMITTED);
  const submissions = by(E.ADVISOR_SUBMITTED);
  const activations = by(E.ADVISOR_ACTIVATED);
  const rejections = by(E.ADVISOR_REJECTED);
  const profileViews = by(E.ADVISOR_PROFILE_VIEW);
  const zeroResults = by(E.SEARCH_ZERO_RESULT);

  // Batch 2 sources
  const sessionStarts = by(E.SESSION_START);
  const sessionEnds = by(E.SESSION_END);
  const consentYes = by(E.CONSENT_GRANTED);
  const consentNo = by(E.CONSENT_DECLINED);
  const recordings = by(E.RECORDING_CAPTURED);
  const rechargeStart = by(E.WALLET_RECHARGE_STARTED);
  const paymentFails = by(E.PAYMENT_FAILED);
  const lowBalance = by(E.LOW_BALANCE_HIT);
  const notifsSent = by(E.NOTIFICATION_SENT);
  const notifsOpened = by(E.NOTIFICATION_OPENED);
  const refsConverted = by(E.REFERRAL_CONVERTED);

  // Batch 3 sources
  const accepted = by(E.CALL_ACCEPTED);
  const declined = by(E.CALL_DECLINED);
  const stageChanges = by(E.BUYER_STAGE_CHANGED);
  const profileNoReq = by(E.PROFILE_VIEW_NO_REQUEST);
  const rechargeAband = by(E.RECHARGE_ABANDONED);
  const noConnect = by(E.CALL_REQUEST_NO_CONNECT);

  // ── North Star: Trusted Consultation Minutes (completed & rated >= 4) ──
  const ratingByCall: Record<string, number> = {};
  reviews.forEach((r) => {
    if (r.entity.callId != null && r.props.rating != null) {
      ratingByCall[r.entity.callId] = r.props.rating;
    }
  });
  const trustedMins = sum(completed, (e) =>
    e.entity.callId != null && (ratingByCall[e.entity.callId] ?? 0) >= 4
      ? (e.props.durationSec || 0) / 60
      : 0,
  );

  // ── Repeat-buyer logic over completed calls ──
  const callsPerBuyer: Record<string, number> = {};
  completed.forEach((e) => {
    const b = e.entity.buyerId;
    if (b) callsPerBuyer[b] = (callsPerBuyer[b] || 0) + 1;
  });
  const buyersWith1 = Object.keys(callsPerBuyer).length;
  const buyersWith2 = Object.values(callsPerBuyer).filter((n) => n >= 2).length;

  // ── Generic group tally ──
  const tally = <T>(arr: T[], keyFn: (e: T) => unknown): Tally =>
    arr.reduce<Tally>((m, e) => {
      const k = keyFn(e);
      if (k == null) return m;
      const key = String(k);
      m[key] = (m[key] || 0) + 1;
      return m;
    }, {});

  const concerns: Tally = {};
  reviews.forEach((r) =>
    (r.props.concernTags || []).forEach(
      (t) => (concerns[t] = (concerns[t] || 0) + 1),
    ),
  );

  // ── Batch 2 derived ──
  const viewToRequest = profileViews.length
    ? Math.round((100 * requested.length) / profileViews.length)
    : 0;
  const rechargeCompletion = rechargeStart.length
    ? Math.round((100 * recharges.length) / rechargeStart.length)
    : 0;
  const paymentFailRate =
    recharges.length + paymentFails.length
      ? Math.round(
          (100 * paymentFails.length) / (recharges.length + paymentFails.length),
        )
      : 0;
  const activeSessionUsers = uniq(sessionStarts, (e) => e.actorId);
  const avgSessionSec = sessionEnds.length
    ? Math.round(sum(sessionEnds, (e) => e.props.durationSec || 0) / sessionEnds.length)
    : 0;
  const consentRate =
    consentYes.length + consentNo.length
      ? Math.round((100 * consentYes.length) / (consentYes.length + consentNo.length))
      : 0;
  const notifOpenRate = notifsSent.length
    ? Math.round((100 * notifsOpened.length) / notifsSent.length)
    : 0;
  const kFactor = signups.length
    ? +(refsConverted.length / signups.length).toFixed(2)
    : 0;

  // ── Batch 3 derived ──

  // (A) Advisor response time — median seconds request -> accept
  const respTimes = accepted
    .map((e) => e.props.responseSec)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const medianResponseSec = respTimes.length
    ? respTimes[Math.floor(respTimes.length / 2)]!
    : 0;
  const acceptanceRate =
    accepted.length + declined.length
      ? Math.round((100 * accepted.length) / (accepted.length + declined.length))
      : 0;

  // (B) Repeat advisor — delivered calls in >= 2 distinct weeks
  const weekOf = (ts: number): string => {
    const d = new Date(ts);
    const o = new Date(d.getFullYear(), 0, 1);
    return (
      d.getFullYear() +
      "-W" +
      Math.ceil(((d.getTime() - o.getTime()) / 86400000 + o.getDay() + 1) / 7)
    );
  };
  const advisorWeeks: Record<string, Set<string>> = {};
  completed.forEach((e) => {
    const a = e.entity.advisorId;
    if (!a) return;
    (advisorWeeks[a] = advisorWeeks[a] || new Set()).add(weekOf(e.ts));
  });
  const advisorsWith1 = Object.keys(advisorWeeks).length;
  const advisorsRepeat = Object.values(advisorWeeks).filter((s) => s.size >= 2).length;
  const repeatAdvisorRate = advisorsWith1
    ? Math.round((100 * advisorsRepeat) / advisorsWith1)
    : 0;

  // (C) Verification time — avg hours advisor_submitted -> advisor_activated
  const submitAt: Record<string, number> = {};
  submissions.forEach((e) => {
    if (e.entity.advisorId) submitAt[e.entity.advisorId] = e.ts;
  });
  const verifyHours = activations
    .map((e) => {
      const a = e.entity.advisorId;
      return a != null && submitAt[a] != null ? (e.ts - submitAt[a]!) / 3.6e6 : null;
    })
    .filter((h): h is number => h != null);
  const avgVerificationHours = verifyHours.length
    ? +(verifyHours.reduce((a, b) => a + b, 0) / verifyHours.length).toFixed(1)
    : 0;

  // (D) Marketplace liquidity — demand (requests) vs supply (active advisors) per project
  const demandByProj = tally(requested, (e) => e.entity.projectId);
  const supplyByProj: Tally = {};
  activations.forEach((e) => {
    const p = e.props.project || e.entity.projectId;
    if (p) supplyByProj[String(p)] = (supplyByProj[String(p)] || 0) + 1;
  });
  const liquidityByProject: Record<string, ProjectLiquidity> = {};
  Object.keys(demandByProj).forEach((p) => {
    const s = supplyByProj[p] || 0;
    const demand = demandByProj[p]!;
    liquidityByProject[p] = {
      demand,
      supply: s,
      ratio: s ? +(demand / s).toFixed(1) : demand,
    };
  });

  // (E) Advisor expertise tags — from completed calls' projects + linked concern tags
  const concernByCall: Record<string, string[]> = {};
  reviews.forEach((r) => {
    if (r.entity.callId) concernByCall[r.entity.callId] = r.props.concernTags || [];
  });
  const advisorExpertise: Record<string, Tally> = {};
  completed.forEach((e) => {
    const a = e.entity.advisorId;
    if (!a) return;
    const set = (advisorExpertise[a] = advisorExpertise[a] || {});
    if (e.entity.projectId) {
      set[e.entity.projectId] = (set[e.entity.projectId] || 0) + 1;
    }
    (e.entity.callId ? concernByCall[e.entity.callId] || [] : []).forEach(
      (t) => (set[t] = (set[t] || 0) + 1),
    );
  });

  // (D2) Per-advisor conversion — view -> request -> completed. "Which advisors
  // convert best?" straight from the taxonomy; no repository join needed since
  // advisorId is on all three event types already.
  const viewsByAdvisor = tally(profileViews, (e) => e.entity.advisorId);
  const requestsByAdvisor = tally(requested, (e) => e.entity.advisorId);
  const completedByAdvisor = tally(completed, (e) => e.entity.advisorId);
  const advisorIds = new Set([
    ...Object.keys(viewsByAdvisor),
    ...Object.keys(requestsByAdvisor),
    ...Object.keys(completedByAdvisor),
  ]);
  const advisorConversion: AdvisorConversion[] = [...advisorIds]
    .map((advisorId) => {
      const views = viewsByAdvisor[advisorId] || 0;
      const conversionRequests = requestsByAdvisor[advisorId] || 0;
      const conversionCompleted = completedByAdvisor[advisorId] || 0;
      return {
        advisorId,
        views,
        requests: conversionRequests,
        completed: conversionCompleted,
        conversionRate: views ? Math.round((100 * conversionCompleted) / views) : 0,
      };
    })
    .sort((a, b) => b.conversionRate - a.conversionRate || b.completed - a.completed);

  // (F) Operational bottlenecks
  const bottlenecks = {
    verificationBacklog: submissions.length - activations.length - rejections.length,
    slaBreaches: by(E.VERIFICATION_SLA_BREACHED).length,
    slowResponses: respTimes.filter((s) => s > 120).length,
    unconnectedRequests: noConnect.length,
  };

  // (G) Revenue leakage
  const leakage = {
    failedPaymentValue: Math.round(sum(paymentFails, (e) => e.props.amount || 0)),
    abandonedRecharges: rechargeAband.length,
    abandonedValue: Math.round(sum(rechargeAband, (e) => e.props.amountIntended || 0)),
    idleWalletCount: by(E.WALLET_IDLE).length,
    missedDemand: profileNoReq.length + noConnect.length,
  };

  // (H) NDT Trust Index — composite unique to NoDalalTalks (0–100)
  const verifiedShare = submissions.length ? activations.length / submissions.length : 0;
  const qualityShare = reviews.length
    ? sum(reviews, (e) => ((e.props.rating || 0) >= 4 ? 1 : 0)) / reviews.length
    : 0;
  const deliveryShare = requested.length ? completed.length / requested.length : 0;
  const consentShare =
    consentYes.length + consentNo.length
      ? consentYes.length / (consentYes.length + consentNo.length)
      : 0;
  const ndtTrustIndex = Math.round(
    100 *
      (0.3 * verifiedShare +
        0.3 * qualityShare +
        0.25 * deliveryShare +
        0.15 * consentShare),
  );

  return {
    // Founder · Executive Overview
    tcm: Math.round(trustedMins),
    activeBuyers: uniq(signups, (e) => e.actorId),
    activeAdvisors: activations.length,
    completedCalls: completed.length,
    matchRate: requested.length
      ? Math.round((100 * completed.length) / requested.length)
      : 0,
    netRevenue: Math.round(
      sum(completed, (e) => (e.props.amountCharged || 0) - (e.props.advisorPayout || 0)),
    ),
    gmv: Math.round(sum(recharges, (e) => e.props.amount || 0)),
    repeatBuyerRate: buyersWith1 ? Math.round((100 * buyersWith2) / buyersWith1) : 0,
    avgRating: reviews.length
      ? +(sum(reviews, (e) => e.props.rating || 0) / reviews.length).toFixed(2)
      : 0,

    // Marketplace Health
    callsRequested: requested.length,
    callsCancelled: cancelled.length,
    cancellationRate: requested.length
      ? Math.round((100 * cancelled.length) / requested.length)
      : 0,
    demandByProject: tally(profileViews, (e) => e.entity.projectId),

    // Buyer Intelligence
    demandByBudget: tally(signups, (e) => e.props.budget),
    demandByCity: tally(signups, (e) => e.props.targetCity),
    topConcerns: concerns,
    zeroResultQueries: tally(zeroResults, (e) => e.props.query),

    // Revenue
    walletRecharged: Math.round(sum(recharges, (e) => e.props.amount || 0)),
    advisorPayout: Math.round(sum(completed, (e) => e.props.advisorPayout || 0)),
    arpu: buyersWith1
      ? Math.round(sum(recharges, (e) => e.props.amount || 0) / buyersWith1)
      : 0,

    // Trust (summary)
    pendingVerification: submissions.length - activations.length - rejections.length,
    verifiedAdvisors: activations.length,
    rejectedAdvisors: rejections.length,

    // AARRR funnel
    funnel: {
      acquired: signups.length,
      activated: recharges.length,
      retained: completed.length,
      revenue: Math.round(sum(recharges, (e) => e.props.amount || 0)),
    },

    // Batch 2
    viewToRequestRate: viewToRequest,
    rechargeCompletion,
    paymentFailRate,
    lowBalanceHits: lowBalance.length,
    activeSessionUsers,
    avgSessionSec,
    sessionsToday: sessionStarts.length,
    consentRate,
    recordingsCaptured: recordings.length,
    notifOpenRate,
    kFactor,
    referralsConverted: refsConverted.length,

    // Batch 3
    medianResponseSec,
    acceptanceRate,
    repeatAdvisorRate,
    avgVerificationHours,
    liquidityByProject,
    advisorExpertise,
    advisorConversion,
    stageProgressions: stageChanges.length,
    readyToBookNow: stageChanges.filter((e) => e.props.toStage === "ready_to_book").length,
    bottlenecks,
    revenueLeakage: leakage,
    ndtTrustIndex,

    // meta
    _total: events.length,
    _generatedAt: now,
  };
}
