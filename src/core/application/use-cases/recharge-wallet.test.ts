import { describe, it, expect } from "vitest";
import { rechargeWallet } from "./recharge-wallet";
import type { RechargeWalletDeps } from "./recharge-wallet";
import { InMemoryEventRepository } from "@infra/events/in-memory-event-repository";
import { project } from "../projections/project";
import type { AuthUser, PaymentResult } from "../ports";

const actor: AuthUser = { uid: "b1", role: "buyer" };

function deps(overrides?: { verify?: PaymentResult }): {
  deps: RechargeWalletDeps;
  events: InMemoryEventRepository;
  balances: Map<string, number>;
} {
  const events = new InMemoryEventRepository();
  const balances = new Map<string, number>();
  let n = 0;
  const d: RechargeWalletDeps = {
    payments: {
      provider: "placeholder",
      createOrder: async () => ({ orderId: "ord_1", amountPaise: 0, currency: "INR", provider: "placeholder" }),
      verifyPayment: async () =>
        overrides?.verify ?? { ok: true, paymentId: "pay_1", amountPaise: 0, status: "captured" },
      refund: async () => ({ ok: true, paymentId: "pay_1", amountPaise: 0, status: "refunded" }),
    },
    ledger: {
      credit: async (buyerId, amountPaise) => {
        const bal = (balances.get(buyerId) ?? 0) + amountPaise;
        balances.set(buyerId, bal);
        return { balanceAfterPaise: bal, transactionId: `txn_${++n}` };
      },
      debit: async (buyerId, amountPaise) => {
        const bal = (balances.get(buyerId) ?? 0) - amountPaise;
        balances.set(buyerId, bal);
        return { balanceAfterPaise: bal, transactionId: `txn_${++n}` };
      },
      settleCall: async ({ buyerId, amountChargedPaise }) => {
        const bal = (balances.get(buyerId) ?? 0) - amountChargedPaise;
        balances.set(buyerId, bal);
        return { balanceAfterPaise: bal, transactionId: `txn_${++n}` };
      },
    },
    events,
    clock: { now: () => 1000 },
    ids: { next: (p = "e") => `${p}_${++n}` },
    session: { sessionId: () => "s" },
    runtime: { source: () => "test", platform: () => "server", environment: () => "development" },
  };
  return { deps: d, events, balances };
}

describe("rechargeWallet", () => {
  it("credits the wallet and emits wallet_recharged (rupees) feeding GMV", async () => {
    const t = deps();
    const res = await rechargeWallet(actor, { amountPaise: 100_000, method: "UPI" }, t.deps);

    expect(res.balanceAfterPaise).toBe(100_000); // ₹1000
    expect(t.balances.get("b1")).toBe(100_000);

    const log = await t.events.query();
    const recharged = log.find((e) => e.name === "wallet_recharged");
    expect(recharged?.props.amount).toBe(1000); // rupees in the analytics layer
    expect(project(log).gmv).toBe(1000);
  });

  it("emits payment_failed and does not credit on a failed verification", async () => {
    const t = deps({
      verify: { ok: false, paymentId: "x", amountPaise: 0, status: "failed", failureReason: "gateway_timeout" },
    });
    await expect(
      rechargeWallet(actor, { amountPaise: 50_000 }, t.deps),
    ).rejects.toThrow(/gateway_timeout/);

    expect(t.balances.get("b1")).toBeUndefined();
    const log = await t.events.query();
    expect(log.map((e) => e.name)).toContain("payment_failed");
    expect(log.map((e) => e.name)).not.toContain("wallet_recharged");
  });
});
