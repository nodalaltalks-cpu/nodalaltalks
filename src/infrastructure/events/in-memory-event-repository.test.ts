import { describe, it, expect, vi } from "vitest";
import { InMemoryEventRepository } from "./in-memory-event-repository";
import type { AnalyticsEvent } from "@core/domain/events";

function ev(name: string, ts: number, actorId = "a"): AnalyticsEvent {
  return {
    id: `e_${ts}`,
    name: name as AnalyticsEvent["name"],
    ts,
    actorId,
    actorType: "buyer",
    sessionId: "s",
    entity: {},
    props: {},
  };
}

describe("InMemoryEventRepository", () => {
  it("appends and returns events ordered by ts", async () => {
    const repo = new InMemoryEventRepository();
    await repo.append(ev("call_completed", 200));
    await repo.append(ev("buyer_signup", 100));
    const all = await repo.query();
    expect(all.map((e) => e.ts)).toEqual([100, 200]);
  });

  it("filters by name, actor and time window", async () => {
    const repo = new InMemoryEventRepository([
      ev("buyer_signup", 100, "b1"),
      ev("call_completed", 200, "b1"),
      ev("call_completed", 300, "b2"),
    ]);
    expect((await repo.query({ names: ["call_completed"] })).length).toBe(2);
    expect((await repo.query({ actorId: "b2" })).length).toBe(1);
    expect((await repo.query({ since: 250 })).length).toBe(1);
  });

  it("notifies subscribers immediately and on append", async () => {
    const repo = new InMemoryEventRepository();
    const cb = vi.fn();
    const unsub = repo.subscribe(cb);
    expect(cb).toHaveBeenCalledTimes(1); // immediate emit
    await repo.append(ev("app_open", 100));
    expect(cb).toHaveBeenCalledTimes(2);
    unsub();
    await repo.append(ev("app_open", 200));
    expect(cb).toHaveBeenCalledTimes(2); // no longer notified
  });
});
