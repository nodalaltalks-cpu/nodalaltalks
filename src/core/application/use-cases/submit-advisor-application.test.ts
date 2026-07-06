import { describe, it, expect } from "vitest";
import { submitAdvisorApplication } from "./submit-advisor-application";
import type {
  SubmitAdvisorApplicationDeps,
  SubmitAdvisorApplicationInput,
} from "./submit-advisor-application";
import { InMemoryEventRepository } from "@infra/events/in-memory-event-repository";
import { project } from "../projections/project";
import type {
  AdvisorProfile,
  Property,
  VerificationDocument,
} from "../../domain/entities";
import type { AuthUser, PayoutAccount } from "../ports";

// ── deterministic fakes ──
function makeDeps() {
  let n = 0;
  const advisorsStore = new Map<string, AdvisorProfile>();
  const propsStore: Property[] = [];
  const docsStore: VerificationDocument[] = [];
  const payoutStore = new Map<string, PayoutAccount>();
  const uploaded: string[] = [];
  const events = new InMemoryEventRepository();

  const deps: SubmitAdvisorApplicationDeps = {
    ids: { next: (p = "e") => `${p}_${++n}` },
    clock: { now: () => 1_700_000_000_000 },
    session: { sessionId: () => "s_test" },
    runtime: { source: () => "test", platform: () => "web", environment: () => "development" },
    advisors: {
      create: async (p) => void advisorsStore.set(p.advisorId, p),
      get: async (id) => advisorsStore.get(id) ?? null,
      update: async () => {},
      listByStatus: async () => [...advisorsStore.values()],
      listActive: async () => [...advisorsStore.values()],
    },
    properties: {
      create: async (p) => void propsStore.push(p),
      get: async () => null,
      listByAdvisor: async (a) => propsStore.filter((p) => p.advisorId === a),
    },
    documents: {
      create: async (d) => void docsStore.push(d),
      get: async () => null,
      listByAdvisor: async (a) => docsStore.filter((d) => d.advisorId === a),
      update: async () => {},
    },
    payouts: {
      upsert: async (acc) => void payoutStore.set(acc.advisorId, acc),
      get: async (id) => payoutStore.get(id) ?? null,
    },
    storage: {
      upload: async (path) => {
        uploaded.push(path);
        return { path, url: `https://storage.test/${path}` };
      },
      getDownloadUrl: async (p) => `https://storage.test/${p}`,
      delete: async () => {},
    },
    hash: { sha256: async () => "fake_hash" },
    settings: {
      get: async () => ({
        platformCommissionRate: 0.2,
        walletRechargeMinPaise: 10_000,
        walletRechargeMaxPaise: 5_000_000,
        freeFirstCallMinutes: 5,
        advisorRateMinPaise: 3_000,
        advisorRateMaxPaise: 12_000,
        updatedAt: 0,
      }),
      update: async () => {},
    },
    events,
  };
  return { deps, advisorsStore, propsStore, docsStore, payoutStore, uploaded, events };
}

const actor: AuthUser = { uid: "adv_1", role: "buyer" };

const input: SubmitAdvisorApplicationInput = {
  personal: {
    firstName: "Rakesh",
    lastName: "Mehta",
    phone: "+919876543210",
    email: "rakesh@example.com",
    city: "Thane",
    languages: ["Hindi", "Marathi"],
    availableDays: ["Mon", "Tue"],
    maxCallsPerDay: "3-5",
  },
  property: {
    builder: "Lodha Group",
    project: "Lodha Palava City",
    city: "Dombivali",
    locality: "Palava",
    propertyType: "apartment",
    yearOfPurchase: 2021,
    purchasePriceBucket: "₹50 lakh – ₹1 crore",
    pricePaidPaise: 6_800_000_00,
    possessionStatus: "received_living",
    expertise: ["Possession delays & RERA", "Construction quality"],
  },
  payout: {
    accountHolderName: "Rakesh Mehta",
    bankName: "HDFC Bank",
    accountNumber: "0001112224432",
    ifsc: "HDFC0001234",
  },
  rate: { ratePerMinPaise: 5000 },
  documents: [
    {
      docType: "sale_deed",
      name: "Registered Sale Deed",
      group: "Ownership Proof",
      file: new Blob(["x"]),
      fileName: "deed.pdf",
      size: 2400,
      mimeType: "application/pdf",
    },
    {
      docType: "id_front",
      name: "Aadhaar — Front",
      group: "Identity",
      file: new Blob(["y"]),
      fileName: "aadhaar.jpg",
      size: 880,
      mimeType: "image/jpeg",
    },
  ],
};

describe("submitAdvisorApplication", () => {
  it("persists profile, property, documents and payout, and uploads each file", async () => {
    const t = makeDeps();
    const res = await submitAdvisorApplication(actor, input, t.deps);

    expect(res.advisorId).toBe("adv_1");
    expect(t.advisorsStore.get("adv_1")?.status).toBe("submitted");
    expect(t.advisorsStore.get("adv_1")?.ownershipVerified).toBe(false);
    expect(t.advisorsStore.get("adv_1")?.ratePerMinPaise).toBe(5000);
    // Public-safe copy of the property, so signed-out buyers (Security Rules
    // require sign-in to read properties/) can still see it pre-signup.
    expect(t.advisorsStore.get("adv_1")?.primaryProject).toBe("Lodha Palava City");
    expect(t.advisorsStore.get("adv_1")?.primaryBuilder).toBe("Lodha Group");
    expect(t.advisorsStore.get("adv_1")?.primaryCity).toBe("Dombivali");
    expect(t.advisorsStore.get("adv_1")?.expertise).toEqual([
      "Possession delays & RERA",
      "Construction quality",
    ]);
    expect(t.propsStore).toHaveLength(1);
    expect(t.docsStore).toHaveLength(2);
    expect(t.docsStore.every((d) => d.status === "uploaded")).toBe(true);
    // Intelligence-ready fields: computed now (hash, source) vs. honestly
    // "pending" until a real OCR/AI pipeline exists.
    expect(t.docsStore.every((d) => d.contentHash === "fake_hash")).toBe(true);
    expect(t.docsStore.every((d) => d.uploadSource === "test")).toBe(true);
    expect(t.docsStore.every((d) => d.ocrStatus === "pending")).toBe(true);
    expect(t.docsStore.every((d) => d.aiProcessingStatus === "pending")).toBe(true);
    expect(t.uploaded).toHaveLength(2);
    expect(t.payoutStore.get("adv_1")?.bankName).toBe("HDFC Bank");
  });

  it("rejects a rate outside the settings-driven bounds (server-side, not just UI)", async () => {
    const t = makeDeps();
    await expect(
      submitAdvisorApplication(actor, { ...input, rate: { ratePerMinPaise: 1_000_000 } }, t.deps),
    ).rejects.toThrow(/between ₹30 and ₹120/);
    // Nothing was written — validation runs before any persistence or event.
    expect(t.advisorsStore.size).toBe(0);
    expect(await t.events.query()).toEqual([]);
  });

  it("emits the onboarding events the dashboards derive from", async () => {
    const t = makeDeps();
    await submitAdvisorApplication(actor, input, t.deps);
    const log = await t.events.query();
    const names = log.map((e) => e.name);

    expect(names).toContain("advisor_signup_started");
    expect(names.filter((n) => n === "document_uploaded")).toHaveLength(2);
    expect(names).toContain("advisor_rate_set");
    expect(names).toContain("advisor_submitted");

    // The founder dashboard's pending-verification count derives from this log.
    const m = project(log);
    expect(m.pendingVerification).toBe(1);
    expect(m.verifiedAdvisors).toBe(0);
  });
});
