import { describe, it, expect } from "vitest";
import { submitReview } from "./submit-review";
import type { SubmitReviewDeps } from "./submit-review";
import { InMemoryEventRepository } from "@infra/events/in-memory-event-repository";
import { project } from "../projections/project";
import type { Call, Review } from "../../domain/entities";
import type { AuthUser } from "../ports";

const buyer: AuthUser = { uid: "b1", role: "buyer" };

const completedCall: Call = {
  id: "call_1",
  buyerId: "b1",
  advisorId: "adv_1",
  status: "completed",
  ratePerMinPaise: 5000,
  requestedAt: 0,
  startedAt: 0,
  endedAt: 90_000,
  durationSec: 90,
  amountChargedPaise: 10_000,
  advisorPayoutPaise: 8_000,
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: 1,
};

function harness(call: Call | null = completedCall) {
  const events = new InMemoryEventRepository();
  const submitted: Review[] = [];
  let n = 0;

  const deps: SubmitReviewDeps = {
    calls: {
      create: async () => {},
      get: async (id) => (id === call?.id ? call : null),
      update: async () => {},
      listRecentByBuyer: async () => [],
    },
    reviews: {
      submit: async (review) => {
        if (submitted.some((r) => r.id === review.id)) {
          throw new Error("This call has already been reviewed.");
        }
        submitted.push(review);
      },
    },
    events,
    clock: { now: () => 1_700_000_000_000 },
    ids: { next: (p = "e") => `${p}_${++n}` },
    session: { sessionId: () => "s" },
    runtime: { source: () => "test", platform: () => "server", environment: () => "development" },
  };

  return { deps, events, submitted };
}

describe("submitReview", () => {
  it("records the review and emits review_submitted, feeding avgRating", async () => {
    const t = harness();
    const review = await submitReview(
      buyer,
      { callId: "call_1", rating: 5, confidenceShift: "more", concernTags: ["Construction quality"] },
      t.deps,
    );

    expect(review.id).toBe("call_1");
    expect(review.advisorId).toBe("adv_1");
    expect(t.submitted).toHaveLength(1);

    const log = await t.events.query();
    expect(log.map((e) => e.name)).toContain("review_submitted");
    expect(project(log).avgRating).toBe(5);
  });

  it("rejects an out-of-range rating", async () => {
    const t = harness();
    await expect(submitReview(buyer, { callId: "call_1", rating: 6 }, t.deps)).rejects.toThrow(
      /between 1 and 5/,
    );
  });

  it("refuses to review someone else's call", async () => {
    const t = harness({ ...completedCall, buyerId: "someone_else" });
    await expect(submitReview(buyer, { callId: "call_1", rating: 4 }, t.deps)).rejects.toThrow(
      /your own calls/,
    );
  });

  it("refuses to review a call that hasn't completed", async () => {
    const t = harness({ ...completedCall, status: "started" });
    await expect(submitReview(buyer, { callId: "call_1", rating: 4 }, t.deps)).rejects.toThrow(
      /completed call/,
    );
  });

  it("refuses a second review for the same call", async () => {
    const t = harness();
    await submitReview(buyer, { callId: "call_1", rating: 4 }, t.deps);
    await expect(submitReview(buyer, { callId: "call_1", rating: 2 }, t.deps)).rejects.toThrow(
      /already been reviewed/,
    );
  });
});
