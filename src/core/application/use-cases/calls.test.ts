import { describe, it, expect } from "vitest";
import { cancelCall, endCall, requestCall } from "./calls";
import type { CallDeps, EndCallDeps } from "./calls";
import { InMemoryEventRepository } from "@infra/events/in-memory-event-repository";
import { PlaceholderCallService } from "@infra/calling/placeholder-call-service";
import { project } from "../projections/project";
import type { AdvisorProfile, Call, Property, Wallet } from "../../domain/entities";
import type { AuthUser, CallSettlement } from "../ports";

const buyer: AuthUser = { uid: "b1", role: "buyer" };

const advisor: AdvisorProfile = {
  advisorId: "adv_1",
  firstName: "R",
  lastName: "M",
  city: "Thane",
  languages: [],
  availableDays: [],
  ratePerMinPaise: 5000, // ₹50/min
  status: "active",
  ownershipVerified: true,
  ratingAvg: 0,
  ratingCount: 0,
  primaryPropertyId: "prop_1",
  createdAt: 0,
  updatedAt: 0,
};

const property: Property = {
  id: "prop_1",
  advisorId: "adv_1",
  builder: "Lodha Group",
  project: "Lodha Palava City",
  city: "Dombivali",
  locality: "Palava",
  propertyType: "apartment",
  yearOfPurchase: 2021,
  purchasePriceBucket: "₹50 lakh – ₹1 crore",
  possessionStatus: "received_living",
  expertise: [],
  createdAt: 0,
  updatedAt: 0,
};

function harness(opts: { walletBalancePaise?: number; commissionRate?: number } = {}) {
  const events = new InMemoryEventRepository();
  const calls = new Map<string, Call>();
  const wallets = new Map<string, Wallet>([
    [
      "b1",
      {
        buyerId: "b1",
        balancePaise: opts.walletBalancePaise ?? 100_000,
        totalRechargedPaise: 0,
        status: "active",
        createdAt: 0,
        updatedAt: 0,
        version: 1,
      },
    ],
  ]);
  let n = 0;

  const callRepo = {
    create: async (c: Call) => void calls.set(c.id, c),
    get: async (id: string) => calls.get(id) ?? null,
    update: async (id: string, patch: Partial<Call>) =>
      void calls.set(id, { ...calls.get(id)!, ...patch }),
    listRecentByBuyer: async (buyerId: string) =>
      [...calls.values()].filter((c) => c.buyerId === buyerId),
  };

  const deps: CallDeps = {
    advisors: {
      create: async () => {},
      get: async (id) => (id === "adv_1" ? advisor : null),
      update: async () => {},
      listByStatus: async () => [advisor],
      listActive: async () => [advisor],
    },
    properties: {
      create: async () => {},
      get: async (id) => (id === "prop_1" ? property : null),
      listByAdvisor: async () => [property],
    },
    wallet: {
      get: async (id) => wallets.get(id) ?? null,
      listTransactions: async () => [],
    },
    calls: callRepo,
    callService: new PlaceholderCallService(),
    events,
    clock: { now: () => 1_700_000_000_000 },
    ids: { next: (p = "e") => `${p}_${++n}` },
    session: { sessionId: () => "s" },
    runtime: { source: () => "test", platform: () => "server", environment: () => "development" },
  };

  let settled: CallSettlement | null = null;
  const endDeps: EndCallDeps = {
    calls: callRepo,
    settings: {
      get: async () => ({
        platformCommissionRate: opts.commissionRate ?? 0.2,
        walletRechargeMinPaise: 10_000,
        walletRechargeMaxPaise: 5_000_000,
        updatedAt: 0,
      }),
      update: async () => {},
    },
    ledger: {
      credit: async (buyerId, amountPaise) => {
        const w = wallets.get(buyerId)!;
        w.balancePaise += amountPaise;
        return { balanceAfterPaise: w.balancePaise, transactionId: `txn_${++n}` };
      },
      debit: async (buyerId, amountPaise) => {
        const w = wallets.get(buyerId)!;
        w.balancePaise -= amountPaise;
        return { balanceAfterPaise: w.balancePaise, transactionId: `txn_${++n}` };
      },
      settleCall: async (settlement) => {
        settled = settlement;
        const w = wallets.get(settlement.buyerId)!;
        if (w.balancePaise < settlement.amountChargedPaise) throw new Error("Insufficient wallet balance.");
        w.balancePaise -= settlement.amountChargedPaise;
        return { balanceAfterPaise: w.balancePaise, transactionId: `txn_${++n}` };
      },
    },
    events,
    clock: deps.clock,
    ids: deps.ids,
    session: deps.session,
    runtime: deps.runtime,
  };

  return { deps, endDeps, events, calls, wallets, getSettled: () => settled };
}

describe("requestCall", () => {
  it("connects immediately (placeholder) and emits the requested→accepted→started sequence", async () => {
    const t = harness();
    const { call, session } = await requestCall(buyer, { advisorId: "adv_1" }, t.deps);

    expect(call.status).toBe("started");
    expect(call.ratePerMinPaise).toBe(5000);
    expect(call.projectId).toBe("Lodha Palava City");
    expect(session.provider).toBe("placeholder");

    const log = await t.events.query();
    expect(log.map((e) => e.name)).toEqual(["call_requested", "call_accepted", "call_started"]);
    // liquidityByProject's demand side reads entity.projectId off call_requested.
    expect(log[0]!.entity.projectId).toBe("Lodha Palava City");
  });

  it("refuses an inactive advisor", async () => {
    const t = harness();
    await expect(
      requestCall(buyer, { advisorId: "not_active" }, t.deps),
    ).rejects.toThrow(/isn't available/);
  });

  it("blocks the call and emits low_balance_hit when the wallet can't cover a minute", async () => {
    const t = harness({ walletBalancePaise: 100 }); // ₹1, rate is ₹50/min
    await expect(requestCall(buyer, { advisorId: "adv_1" }, t.deps)).rejects.toThrow(
      /Add money/,
    );
    const names = (await t.events.query()).map((e) => e.name);
    expect(names).toEqual(["low_balance_hit"]);
  });
});

describe("cancelCall", () => {
  it("cancels a started call and emits call_cancelled", async () => {
    const t = harness();
    const { call } = await requestCall(buyer, { advisorId: "adv_1" }, t.deps);
    await cancelCall(call.id, buyer, "changed my mind", t.deps);
    expect((await t.deps.calls.get(call.id))?.status).toBe("cancelled");
    const names = (await t.events.query()).map((e) => e.name);
    expect(names).toContain("call_cancelled");
  });
});

describe("endCall", () => {
  it("bills per minute (rounded up), splits the advisor payout, and feeds GMV", async () => {
    const t = harness();
    const { call } = await requestCall(buyer, { advisorId: "adv_1" }, t.deps);

    // 90s elapsed → bills 2 minutes at ₹50/min = ₹100.
    const laterClock: EndCallDeps = {
      ...t.endDeps,
      clock: { now: () => t.deps.clock.now() + 90_000 },
    };
    const ended = await endCall(call.id, buyer, "buyer_hangup", laterClock);

    expect(ended.durationSec).toBe(90);
    expect(ended.amountChargedPaise).toBe(10_000); // ₹100
    expect(ended.advisorPayoutPaise).toBe(8_000); // 80% of ₹100
    expect(t.getSettled()).toEqual({
      callId: call.id,
      buyerId: "b1",
      advisorId: "adv_1",
      amountChargedPaise: 10_000,
      advisorPayoutPaise: 8_000,
    });

    const log = await t.events.query();
    expect(log.map((e) => e.name)).toContain("call_completed");
    // The founder dashboard's completedCalls/netRevenue/advisorPayout all derive
    // from this event, in rupees — nothing here is hardcoded.
    const m = project(log);
    expect(m.completedCalls).toBe(1);
    expect(m.advisorPayout).toBe(80); // ₹80
    expect(m.netRevenue).toBe(20); // ₹100 charged − ₹80 payout = ₹20 platform take
  });

  it("refuses to end a call that hasn't started", async () => {
    const t = harness();
    await expect(endCall("nonexistent", buyer, "buyer_hangup", t.endDeps)).rejects.toThrow(
      /not found/,
    );
  });

  it("uses the founder-configured commission rate, not a hardcoded one", async () => {
    const t = harness({ commissionRate: 0.3 }); // founder set 30% instead of the 20% default
    const { call } = await requestCall(buyer, { advisorId: "adv_1" }, t.deps);
    const laterClock: EndCallDeps = {
      ...t.endDeps,
      clock: { now: () => t.deps.clock.now() + 90_000 },
    };
    const ended = await endCall(call.id, buyer, "buyer_hangup", laterClock);

    expect(ended.amountChargedPaise).toBe(10_000); // ₹100 charged, same as before
    expect(ended.advisorPayoutPaise).toBe(7_000); // 70% of ₹100, not 80%
  });
});
