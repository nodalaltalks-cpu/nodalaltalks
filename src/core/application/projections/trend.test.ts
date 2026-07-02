import { describe, it, expect } from "vitest";
import { comparePeriod } from "./trend";

describe("comparePeriod()", () => {
  it("computes a rounded percentage change", () => {
    expect(comparePeriod(120, 100)).toEqual({ current: 120, previous: 100, deltaPct: 20 });
    expect(comparePeriod(80, 100)).toEqual({ current: 80, previous: 100, deltaPct: -20 });
  });

  it("returns a null delta when there's no previous-period baseline", () => {
    expect(comparePeriod(10, 0)).toEqual({ current: 10, previous: 0, deltaPct: null });
  });
});
