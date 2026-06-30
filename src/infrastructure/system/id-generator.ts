import type { IdGenerator } from "@core/application/ports";

/**
 * Sortable, collision-resistant id generator. Format mirrors analytics.js:
 *   "<prefix>_<epochMs>_<rand>"  e.g. "e_1700000000000_a1b2c"
 * The leading timestamp keeps ids roughly time-ordered for the event log.
 */
export class TimeRandomIdGenerator implements IdGenerator {
  next(prefix = "e"): string {
    const rand = Math.random().toString(36).slice(2, 9);
    return `${prefix}_${Date.now()}_${rand}`;
  }
}

export const idGenerator = new TimeRandomIdGenerator();
