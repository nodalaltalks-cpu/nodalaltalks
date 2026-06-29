import { describe, it, expect } from "vitest";
import { createEvent } from "./event-factory";
import { EVENT_NAMES, isEventName } from "./event-names";

const ctx = {
  id: "e_fixed",
  ts: 1_700_000_000_000,
  actor: { id: "u_1", type: "buyer" as const },
  sessionId: "s_1",
};

describe("createEvent()", () => {
  it("stamps the envelope from context and defaults actor to the current user", () => {
    const e = createEvent(EVENT_NAMES.BUYER_SIGNUP, { buyerId: "u_1" }, { budget: "₹1–2 Cr" }, ctx);
    expect(e).toEqual({
      id: "e_fixed",
      name: "buyer_signup",
      ts: 1_700_000_000_000,
      actorId: "u_1",
      actorType: "buyer",
      sessionId: "s_1",
      entity: { buyerId: "u_1" },
      props: { budget: "₹1–2 Cr" },
    });
  });

  it("lets entity.actorId / actorType override the ambient actor (system acting on a user)", () => {
    const e = createEvent(
      EVENT_NAMES.WALLET_IDLE,
      { actorId: "b_99", actorType: "system", buyerId: "b_99" },
      { balance: 450 },
      ctx,
    );
    expect(e.actorId).toBe("b_99");
    expect(e.actorType).toBe("system");
  });

  it("is pure: identical inputs produce identical events", () => {
    const a = createEvent(EVENT_NAMES.APP_OPEN, {}, {}, ctx);
    const b = createEvent(EVENT_NAMES.APP_OPEN, {}, {}, ctx);
    expect(a).toEqual(b);
  });
});

describe("isEventName()", () => {
  it("accepts known verbs and rejects unknown strings", () => {
    expect(isEventName("call_completed")).toBe(true);
    expect(isEventName("definitely_not_an_event")).toBe(false);
    expect(isEventName(42)).toBe(false);
  });
});
