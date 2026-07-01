import type { EventName } from "./event-names";

/**
 * The event envelope — one immutable shape for every event in the log.
 * Mirrors the analytics.js envelope exactly, now fully typed.
 *
 *   { id, name, ts, actorId, actorType, sessionId, entity, props }
 *
 * Read-models (buyers, advisors, calls, metrics…) are PROJECTIONS of this log,
 * never authored directly. This is the Stripe/ledger pattern: events are truth.
 */

export type ActorType = "buyer" | "advisor" | "verifier" | "admin" | "system";

/** Where the event was emitted from — the surface, not the deployment target. */
export type Platform = "web" | "ios" | "android" | "server";

/** Deployment tier at emission time, for filtering test/staging noise out of AI training data later. */
export type Environment = "development" | "staging" | "production";

export type BuyerStage =
  | "exploring"
  | "shortlisting"
  | "negotiating"
  | "ready_to_book";

/**
 * The ids an event touches. Kept intentionally open: a single event may carry
 * several ids (a completed call references buyer, advisor, project and call).
 */
export interface EventEntity {
  actorId?: string;
  actorType?: ActorType;
  buyerId?: string;
  advisorId?: string;
  callId?: string;
  projectId?: string;
  verifierId?: string;
  documentId?: string;
}

/**
 * Event-specific payload. All optional because each verb populates only a few.
 * Known fields are typed for safe reads in project(); the index signature keeps
 * the envelope future-proof when new verbs add new props.
 */
export interface EventProps {
  // monetary
  amount?: number;
  amountCharged?: number;
  amountIntended?: number;
  advisorPayout?: number;
  balance?: number;
  balanceAfter?: number;
  method?: string;

  // call
  durationSec?: number;
  ratePerMin?: number;
  waitSec?: number;
  waitedSec?: number;
  responseSec?: number;
  // call quality (fields on call_completed — not separate verbs)
  connectionDrops?: number;
  avgLatencyMs?: number;
  setupTimeSec?: number;
  endReason?: string;

  // review
  rating?: number;
  confidenceShift?: "more" | "same" | "less";
  concernTags?: string[];

  // buyer intent / demand
  budget?: string;
  targetCity?: string;
  targetProject?: string;
  intent?: string;
  timeline?: string;
  stage?: BuyerStage;
  fromStage?: BuyerStage;
  toStage?: BuyerStage;
  source?: string;

  // search
  query?: string;
  filters?: Record<string, unknown>;

  // advisor
  project?: string;
  builder?: string;
  city?: string;
  expertise?: string[];
  pricePaid?: number;
  possession?: string;

  // verification / documents
  docType?: string;
  fileName?: string;
  size?: number;
  reason?: string;
  hoursWaiting?: number;

  // recording / consent
  url?: string;

  // re-engagement / virality
  type?: string;
  channel?: string;
  referredBy?: string;

  // session
  ref?: string;

  [key: string]: unknown;
}

export interface AnalyticsEvent {
  /** Globally unique, sortable id (e.g. "e_<ts>_<rand>"). */
  id: string;
  name: EventName;
  /** Epoch milliseconds. Server-stamped in the firestore backend. */
  ts: number;
  actorId: string;
  actorType: ActorType;
  /** Groups one visit; the denominator for retention/session metrics. */
  sessionId: string;
  entity: EventEntity;
  props: EventProps;

  /** Shape version of THIS verb's `props`. Bump only when that verb's payload changes shape. */
  eventVersion: number;
  /** Shape version of the envelope itself (this interface). Bump only on an envelope change. */
  schemaVersion: number;
  /** Emitting app/surface, e.g. "web-app", "server-api". Free-form, not a closed enum — new
   *  surfaces (Cloud Functions, mobile) add a new value, never redefine an old one. */
  source: string;
  platform: Platform;
  environment: Environment;
}

/** The minimal user identity an event needs at creation time. */
export interface EventActor {
  id: string;
  type: ActorType;
}
