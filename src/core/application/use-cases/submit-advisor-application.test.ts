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
    expect(t.propsStore).toHaveLength(1);
    expect(t.docsStore).toHaveLength(2);
    expect(t.docsStore.every((d) => d.status === "uploaded")).toBe(true);
    expect(t.uploaded).toHaveLength(2);
    expect(t.payoutStore.get("adv_1")?.bankName).toBe("HDFC Bank");
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
