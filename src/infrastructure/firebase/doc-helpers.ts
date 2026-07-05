/**
 * Firestore rejects `undefined` field values. Entities carry optional fields,
 * so strip undefined before any write. (We persist entity timestamps as plain
 * numbers — epoch ms — keeping the domain free of Firestore's Timestamp type.)
 */
export function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/**
 * Recursive variant for values with nested plain objects — the event envelope's
 * `entity` and `props` maps routinely carry optional fields (reason, projectId,
 * targetProject, …) that arrive as `undefined`. The client SDK THROWS on any
 * nested undefined (unlike the Admin SDK, which we configure with
 * ignoreUndefinedProperties), so every client-side Firestore write of nested
 * data must pass through this. Arrays are cleaned element-wise; class instances
 * (Timestamp, FieldValue sentinels) are passed through untouched.
 */
export function pruneUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => pruneUndefinedDeep(v)) as T;
  }
  if (value !== null && typeof value === "object" && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = pruneUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}
