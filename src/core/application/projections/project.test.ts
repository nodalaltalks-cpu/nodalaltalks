import { describe, it, expect } from "vitest";
import { project } from "./project";
import { EVENT_NAMES as E } from "../../domain/events/event-names";
import type {
  AnalyticsEvent,
  EventEntity,
  EventName,
  EventProps,
} from "../../domain/events";

/**
 * Parity tests for project(). These replay the exact scenarios the event-driven
 * demo exercises and assert the same derived metrics analytics.js produces.
 * If a formula ever drifts from the approved reducer, one of these fails.
 */

let seq = 0;
function ev(
  name: EventName,
  entity: EventEntity = {},
  props: EventProps = {},
  ts = 1_700_000_000_000 + seq * 1000,
): AnalyticsEvent {
  seq += 1;
  return {
    id: `e_${seq}`,
    name,
    ts,
    actorId: entity.actorId ?? "anon",
    actorType: entity.actorType ?? "buyer",
    sessionId: "s_test",
    entity,
    props,
    eventVersion: 1,
    schemaVersion: 1,
    source: "test",
    platform: "web",
    environment: "development",
  };
}

describe("project() — empty log", () => {
  const m = project([], 123);

  it("returns zeroed metrics with no events", () => {
    expect(m._total).toBe(0);
    expect(m._generatedAt).toBe(123);
    expect(m.tcm).toBe(0);
    expect(m.matchRate).toBe(0);
    expect(m.avgRating).toBe(0);
    expect(m.ndtTrustIndex).toBe(0);
    expect(m.demandByProject).toEqual({});
    expect(m.funnel).toEqual({ acquired: 0, activated: 0, retained: 0, revenue: 0 });
  });
});

describe("project() — North Star (Trusted Consultation Minutes)", () => {
  it("counts only completed calls rated >= 4, in minutes", () => {
    const events = [
      ev(E.CALL_COMPLETED, { callId: "c1", buyerId: "b1", advisorId: "a1" }, { durationSec: 600 }),
      ev(E.REVIEW_SUBMITTED, { callId: "c1", advisorId: "a1", buyerId: "b1" }, { rating: 5 }),
      // rated 3 -> excluded from TCM though still a completed call
      ev(E.CALL_COMPLETED, { callId: "c2", buyerId: "b2", advisorId: "a1" }, { durationSec: 900 }),
      ev(E.REVIEW_SUBMITTED, { callId: "c2", advisorId: "a1", buyerId: "b2" }, { rating: 3 }),
    ];
    const m = project(events);
    expect(m.tcm).toBe(10); // 600s / 60 = 10 min; c2 excluded
    expect(m.completedCalls).toBe(2);
    expect(m.avgRating).toBe(4); // (5 + 3) / 2
  });
});

describe("project() — marketplace & revenue", () => {
  it("computes match rate, net revenue, GMV and ARPU", () => {
    const events = [
      ev(E.CALL_REQUESTED, { buyerId: "b1", advisorId: "a1" }),
      ev(E.CALL_REQUESTED, { buyerId: "b1", advisorId: "a1" }),
      ev(E.CALL_COMPLETED, { callId: "c1", buyerId: "b1", advisorId: "a1" }, { amountCharged: 509, advisorPayout: 407 }),
      ev(E.WALLET_RECHARGED, { actorId: "b1", actorType: "buyer" }, { amount: 1000 }),
    ];
    const m = project(events);
    expect(m.matchRate).toBe(50); // 1 completed / 2 requested
    expect(m.netRevenue).toBe(102); // 509 - 407
    expect(m.gmv).toBe(1000);
    expect(m.walletRecharged).toBe(1000);
    expect(m.arpu).toBe(1000); // 1000 / 1 buyer-with-completed-call
  });
});

describe("project() — two-sided retention", () => {
  it("flags a repeat buyer after 2 completed calls", () => {
    const events = [
      ev(E.CALL_COMPLETED, { callId: "c1", buyerId: "b1", advisorId: "a1" }, { durationSec: 60 }),
      ev(E.CALL_COMPLETED, { callId: "c2", buyerId: "b1", advisorId: "a1" }, { durationSec: 60 }),
    ];
    const m = project(events);
    expect(m.repeatBuyerRate).toBe(100); // 1 of 1 buyer repeated
  });
});

describe("project() — demand & active counts", () => {
  it("tallies demand by project from profile views and unique buyers from signups", () => {
    const events = [
      ev(E.BUYER_SIGNUP, { actorId: "b1", actorType: "buyer" }, { budget: "₹50L–1Cr", targetCity: "Pune" }),
      ev(E.BUYER_SIGNUP, { actorId: "b2", actorType: "buyer" }, { budget: "₹1–2 Cr", targetCity: "Thane" }),
      ev(E.ADVISOR_PROFILE_VIEW, { advisorId: "a1", projectId: "Lodha Palava" }),
      ev(E.ADVISOR_PROFILE_VIEW, { advisorId: "a1", projectId: "Lodha Palava" }),
      ev(E.ADVISOR_PROFILE_VIEW, { advisorId: "a2", projectId: "Godrej Infinity" }),
    ];
    const m = project(events);
    expect(m.activeBuyers).toBe(2);
    expect(m.demandByProject).toEqual({ "Lodha Palava": 2, "Godrej Infinity": 1 });
    expect(m.demandByCity).toEqual({ Pune: 1, Thane: 1 });
  });
});

describe("project() — advisor response & acceptance (Batch 3)", () => {
  it("computes median response time and acceptance rate", () => {
    const events = [
      ev(E.CALL_ACCEPTED, { callId: "c1", advisorId: "a1" }, { responseSec: 30 }),
      ev(E.CALL_ACCEPTED, { callId: "c2", advisorId: "a1" }, { responseSec: 90 }),
      ev(E.CALL_ACCEPTED, { callId: "c3", advisorId: "a1" }, { responseSec: 150 }),
      ev(E.CALL_DECLINED, { callId: "c4", advisorId: "a1" }, { reason: "busy" }),
    ];
    const m = project(events);
    expect(m.medianResponseSec).toBe(90); // middle of [30,90,150]
    expect(m.acceptanceRate).toBe(75); // 3 accepted / 4 total
    expect(m.bottlenecks.slowResponses).toBe(1); // only 150 > 120
  });
});

describe("project() — NDT Trust Index composite", () => {
  it("blends verified supply, quality, delivery and consent into 0–100", () => {
    const events = [
      // supply: 1 submitted, 1 activated -> verifiedShare = 1
      ev(E.ADVISOR_SUBMITTED, { advisorId: "a1" }, {}, 1_700_000_000_000),
      ev(E.ADVISOR_ACTIVATED, { advisorId: "a1" }, {}, 1_700_000_360_000),
      // delivery: 1 requested, 1 completed -> deliveryShare = 1
      ev(E.CALL_REQUESTED, { buyerId: "b1", advisorId: "a1" }),
      ev(E.CALL_COMPLETED, { callId: "c1", buyerId: "b1", advisorId: "a1" }, { durationSec: 600 }),
      // quality: 1 review >= 4 -> qualityShare = 1
      ev(E.REVIEW_SUBMITTED, { callId: "c1", advisorId: "a1", buyerId: "b1" }, { rating: 5 }),
      // consent: 1 granted, 0 declined -> consentShare = 1
      ev(E.CONSENT_GRANTED, { callId: "c1" }),
    ];
    const m = project(events);
    // all four shares = 1 -> 100 * (0.30+0.30+0.25+0.15) = 100
    expect(m.ndtTrustIndex).toBe(100);
    // verification time derived from timestamps: 360_000 ms = 0.1h
    expect(m.avgVerificationHours).toBe(0.1);
  });
});

describe("project() — liquidity per project", () => {
  it("computes buyers-per-advisor demand/supply ratio", () => {
    const events = [
      ev(E.CALL_REQUESTED, { buyerId: "b1", projectId: "Lodha Palava" }),
      ev(E.CALL_REQUESTED, { buyerId: "b2", projectId: "Lodha Palava" }),
      ev(E.CALL_REQUESTED, { buyerId: "b3", projectId: "Lodha Palava" }),
      ev(E.ADVISOR_ACTIVATED, { advisorId: "a1" }, { project: "Lodha Palava" }),
    ];
    const m = project(events);
    expect(m.liquidityByProject["Lodha Palava"]).toEqual({
      demand: 3,
      supply: 1,
      ratio: 3,
    });
  });
});
