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
