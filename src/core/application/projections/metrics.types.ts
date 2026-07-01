/**
 * The shape returned by project(). Every field is DERIVED from the event log —
 * no dashboard ever stores these. Keys and meaning match analytics.js `project()`
 * exactly, so existing dashboard wiring (m.tcm, m.matchRate, …) ports unchanged.
 */

/** demand/supply liquidity for one project (buyers per active advisor). */
export interface ProjectLiquidity {
  demand: number;
  supply: number;
  ratio: number;
}

/** A simple { key -> count } tally used by bar charts and heatmaps. */
export type Tally = Record<string, number>;

export interface OperationalBottlenecks {
  verificationBacklog: number;
  slaBreaches: number;
  slowResponses: number;
  unconnectedRequests: number;
}

export interface RevenueLeakage {
  failedPaymentValue: number;
  abandonedRecharges: number;
  abandonedValue: number;
  idleWalletCount: number;
  missedDemand: number;
}

export interface AarrrFunnel {
  acquired: number;
  activated: number;
  retained: number;
  revenue: number;
}

/** One advisor's view -> request -> completed funnel — "who converts best?" */
export interface AdvisorConversion {
  advisorId: string;
  views: number;
  requests: number;
  completed: number;
  /** completed / views, rounded %. 0 when there are no views yet. */
  conversionRate: number;
}

export interface Metrics {
  // ── Founder · Executive Overview ──
  tcm: number;
  activeBuyers: number;
  activeAdvisors: number;
  completedCalls: number;
  matchRate: number;
  netRevenue: number;
  gmv: number;
  repeatBuyerRate: number;
  avgRating: number;

  // ── Marketplace Health ──
  callsRequested: number;
  callsCancelled: number;
  cancellationRate: number;
  demandByProject: Tally;

  // ── Buyer Intelligence ──
  demandByBudget: Tally;
  demandByCity: Tally;
  topConcerns: Tally;
  zeroResultQueries: Tally;

  // ── Revenue ──
  walletRecharged: number;
  advisorPayout: number;
  arpu: number;

  // ── Trust (summary) ──
  pendingVerification: number;
  verifiedAdvisors: number;
  rejectedAdvisors: number;

  // ── AARRR funnel ──
  funnel: AarrrFunnel;

  // ── Batch 2: drop-off, sessions, consent, virality ──
  viewToRequestRate: number;
  rechargeCompletion: number;
  paymentFailRate: number;
  lowBalanceHits: number;
  activeSessionUsers: number;
  avgSessionSec: number;
  sessionsToday: number;
  consentRate: number;
  recordingsCaptured: number;
  notifOpenRate: number;
  kFactor: number;
  referralsConverted: number;

  // ── Batch 3: closes the PARTIAL audit items ──
  medianResponseSec: number;
  acceptanceRate: number;
  repeatAdvisorRate: number;
  avgVerificationHours: number;
  liquidityByProject: Record<string, ProjectLiquidity>;
  advisorExpertise: Record<string, Tally>;
  stageProgressions: number;
  readyToBookNow: number;
  bottlenecks: OperationalBottlenecks;
  revenueLeakage: RevenueLeakage;
  ndtTrustIndex: number;
  advisorConversion: AdvisorConversion[];

  // ── meta ──
  _total: number;
  _generatedAt: number;
}
