import { describe, it, expect } from "vitest";
import {
  activateAdvisor,
  activationBlockers,
  decideDocument,
  rejectAdvisor,
} from "./verification";
import type { VerificationDeps } from "./verification";
import { InMemoryEventRepository } from "@infra/events/in-memory-event-repository";
import type {
  AdvisorProfile,
  Property,
  VerificationDocument,
} from "../../domain/entities";
import type { AuthUser } from "../ports";

const verifier: AuthUser = { uid: "ver_1", role: "verifier" };

function doc(
  id: string,
  group: string,
  status: VerificationDocument["status"],
): VerificationDocument {
  return {
    id,
    advisorId: "adv_1",
    name: id,
    group,
    docType: id,
    status,
    createdAt: 0,
    updatedAt: 0,
    schemaVersion: 1,
  };
}

function setup(docs: VerificationDocument[]) {
  const profiles = new Map<string, AdvisorProfile>([
    [
      "adv_1",
      {
        advisorId: "adv_1",
        firstName: "R",
        lastName: "M",
        city: "Thane",
        languages: [],
        availableDays: [],
        ratePerMinPaise: 5000,
        status: "under_review",
        ownershipVerified: false,
        ratingAvg: 0,
        ratingCount: 0,
        primaryPropertyId: "prop_1",
        createdAt: 0,
        updatedAt: 0,
      },
    ],
  ]);
  const properties: Property[] = [
    {
      id: "prop_1",
      advisorId: "adv_1",
      builder: "Lodha Group",
      project: "Lodha Palava City",
      city: "Dombivali",
      locality: "Palava",
      propertyType: "apartment",
      yearOfPurchase: 2021,
      possessionStatus: "received_living",
      expertise: [],
      createdAt: 0,
      updatedAt: 0,
    },
  ];
  const docStore = new Map(docs.map((d) => [d.id, d] as const));
  const events = new InMemoryEventRepository();

  const deps: VerificationDeps = {
    advisors: {
      create: async () => {},
      get: async (id) => profiles.get(id) ?? null,
      update: async (id, patch) =>
        void profiles.set(id, { ...profiles.get(id)!, ...patch }),
      listByStatus: async () => [...profiles.values()],
      listActive: async () => [...profiles.values()],
    },
    properties: {
      create: async () => {},
      get: async (id) => properties.find((p) => p.id === id) ?? null,
      listByAdvisor: async (advisorId) => properties.filter((p) => p.advisorId === advisorId),
    },
    documents: {
      create: async () => {},
      get: async (id) => docStore.get(id) ?? null,
      listByAdvisor: async () => [...docStore.values()],
      update: async (id, patch) =>
        void docStore.set(id, { ...docStore.get(id)!, ...patch }),
    },
    events,
    clock: { now: () => 1000 },
    ids: { next: (p = "e") => `${p}_x` },
    session: { sessionId: () => "s" },
    runtime: { source: () => "test", platform: () => "web", environment: () => "development" },
  };
  return { deps, profiles, docStore, events };
}

describe("activationBlockers", () => {
  it("blocks until ownership + identity are approved and nothing is open", () => {
    expect(
      activationBlockers([doc("d1", "Ownership Proof", "uploaded")]).length,
    ).toBeGreaterThan(0);

    const ready = [
      doc("d1", "Ownership Proof", "approved"),
      doc("d2", "Identity", "approved"),
    ];
    expect(activationBlockers(ready)).toEqual([]);
  });
});

describe("decideDocument", () => {
  it("records the decision and emits the matching audit event", async () => {
    const t = setup([doc("d1", "Ownership Proof", "uploaded")]);
    await decideDocument("d1", "approved", undefined, verifier, t.deps);
    expect(t.docStore.get("d1")?.status).toBe("approved");
    expect(t.docStore.get("d1")?.reviewerId).toBe("ver_1");
    const names = (await t.events.query()).map((e) => e.name);
    expect(names).toContain("document_approved");
  });
});

describe("activateAdvisor", () => {
  it("refuses activation while documents are unapproved", async () => {
    const t = setup([doc("d1", "Ownership Proof", "uploaded")]);
    await expect(activateAdvisor("adv_1", verifier, t.deps)).rejects.toThrow(
      /Cannot activate/,
    );
    expect(t.profiles.get("adv_1")?.status).toBe("under_review");
  });

  it("activates and verifies ownership — active status IS the advisor capability", async () => {
    const t = setup([
      doc("d1", "Ownership Proof", "approved"),
      doc("d2", "Identity", "approved"),
    ]);
    await activateAdvisor("adv_1", verifier, t.deps);
    expect(t.profiles.get("adv_1")?.status).toBe("active");
    expect(t.profiles.get("adv_1")?.ownershipVerified).toBe(true);
    const log = await t.events.query();
    expect(log.map((e) => e.name)).toContain("advisor_activated");
    // liquidityByProject's supply side reads this off advisor_activated.
    expect(log.find((e) => e.name === "advisor_activated")?.entity.projectId).toBe(
      "Lodha Palava City",
    );
  });
});

describe("rejectAdvisor", () => {
  it("sets rejected status with a reason and emits the event", async () => {
    const t = setup([]);
    await rejectAdvisor("adv_1", "Documents do not match claim", verifier, t.deps);
    expect(t.profiles.get("adv_1")?.status).toBe("rejected");
    expect(t.profiles.get("adv_1")?.rejectionReason).toBe(
      "Documents do not match claim",
    );
  });
});
