import { describe, it, expect } from "vitest";
import { pruneUndefined, pruneUndefinedDeep } from "./doc-helpers";

describe("pruneUndefined (shallow)", () => {
  it("drops top-level undefined values only", () => {
    expect(pruneUndefined({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});

describe("pruneUndefinedDeep", () => {
  it("drops nested undefined — the exact shape of an event with optional props", () => {
    // Regression: document_approved events carry props.reason === undefined and
    // the Firestore client SDK throws on nested undefined, which silently
    // dropped every approval event until the launch QA pass caught it.
    const event = {
      name: "document_approved",
      entity: { advisorId: "a1", projectId: undefined },
      props: { docType: "sale_deed", reason: undefined },
    };
    expect(pruneUndefinedDeep(event)).toEqual({
      name: "document_approved",
      entity: { advisorId: "a1" },
      props: { docType: "sale_deed" },
    });
  });

  it("cleans arrays element-wise and preserves null/false/0", () => {
    expect(
      pruneUndefinedDeep({ tags: [{ a: undefined, b: 0 }], n: null, f: false }),
    ).toEqual({ tags: [{ b: 0 }], n: null, f: false });
  });

  it("passes class instances through untouched (Timestamp/FieldValue sentinels)", () => {
    class Sentinel { constructor(public v = 1) {} }
    const s = new Sentinel();
    const out = pruneUndefinedDeep({ s });
    expect(out.s).toBe(s);
  });
});
