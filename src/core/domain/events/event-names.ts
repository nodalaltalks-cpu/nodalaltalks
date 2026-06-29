/**
 * THE EVENT TAXONOMY — the single source of truth for the whole platform.
 *
 * Ported verbatim from analytics.js (`NDT.EVENTS`). Every verb maps to a real
 * user action in the approved prototypes. Adding analytics later = add a verb
 * here + one `track()` call at the call site. Nothing else changes.
 *
 * IMMUTABLE CONTRACT: never rename or repurpose an existing string value —
 * the event log is append-only and historical events carry these exact names.
 * Adding new verbs is always safe; changing old ones rewrites history.
 *
 * Note on call quality: per the original design, call-quality signals
 * (connectionDrops, avgLatencyMs, setupTimeSec, endReason) are FIELDS on the
 * existing `call_completed` event — not separate verbs. See CallCompletedProps.
 */
export const EVENT_NAMES = {
  // ── Buyer flow ──
  BUYER_OTP_REQUESTED: "buyer_otp_requested",
  BUYER_OTP_VERIFIED: "buyer_otp_verified",
  BUYER_SIGNUP: "buyer_signup",
  SEARCH_PERFORMED: "search_performed",
  SEARCH_ZERO_RESULT: "search_zero_result",
  FILTER_APPLIED: "filter_applied",
  ADVISOR_PROFILE_VIEW: "advisor_profile_view",
  ADVISOR_SHORTLISTED: "advisor_shortlisted",
  WALLET_RECHARGE_STARTED: "wallet_recharge_started",
  WALLET_RECHARGED: "wallet_recharged",
  PAYMENT_FAILED: "payment_failed",
  CALL_REQUESTED: "call_requested",
  CALL_STARTED: "call_started",
  CALL_COMPLETED: "call_completed",
  CALL_CANCELLED: "call_cancelled",
  REVIEW_SUBMITTED: "review_submitted",
  WALLET_IDLE: "wallet_idle",

  // ── Advisor onboarding ──
  ADVISOR_SIGNUP_STARTED: "advisor_signup_started",
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_REMOVED: "document_removed",
  ADVISOR_RATE_SET: "advisor_rate_set",
  ADVISOR_SUBMITTED: "advisor_submitted",

  // ── Verification / documents dashboard ──
  VERIFICATION_STARTED: "verification_started",
  DOCUMENT_APPROVED: "document_approved",
  DOCUMENT_REJECTED: "document_rejected",
  DOCUMENT_REUPLOAD_REQUESTED: "document_reupload_requested",
  DOCUMENT_REOPENED: "document_reopened",
  ADVISOR_ACTIVATED: "advisor_activated",
  ADVISOR_REJECTED: "advisor_rejected",
  VERIFICATION_SLA_BREACHED: "verification_sla_breached",

  // ── Batch 2: sessions, consent, drop-off, virality (unbackfillable) ──
  SESSION_START: "session_start",
  SESSION_END: "session_end",
  APP_OPEN: "app_open",
  CONSENT_GRANTED: "consent_granted",
  CONSENT_DECLINED: "consent_declined",
  RECORDING_CAPTURED: "recording_captured",
  PROFILE_VIEW_NO_REQUEST: "profile_view_no_request",
  RECHARGE_ABANDONED: "recharge_abandoned",
  CALL_REQUEST_NO_CONNECT: "call_request_no_connect",
  LOW_BALANCE_HIT: "low_balance_hit",
  NOTIFICATION_SENT: "notification_sent",
  NOTIFICATION_OPENED: "notification_opened",
  REFERRAL_SENT: "referral_sent",
  REFERRAL_CONVERTED: "referral_converted",

  // ── Batch 3: advisor response time + buyer stage ──
  CALL_ACCEPTED: "call_accepted",
  CALL_DECLINED: "call_declined",
  BUYER_STAGE_CHANGED: "buyer_stage_changed",
} as const;

/** Union of every valid event name string, e.g. "call_completed". */
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/** Runtime guard — useful when ingesting events from an untrusted boundary. */
const ALL_EVENT_NAMES: ReadonlySet<string> = new Set(Object.values(EVENT_NAMES));
export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && ALL_EVENT_NAMES.has(value);
}
