import type { AnalyticsEvent } from "../../domain/events/event.types";

/**
 * The single write/read path for the event log, abstracted from storage.
 *
 *  - MVP/dev adapter  → localStorage / in-memory (mirrors analytics.js "local").
 *  - Scale adapter    → Firestore `analytics_events/{id}` (analytics.js "firestore").
 *
 * Swapping adapters changes WHERE events live, never HOW the app uses them —
 * exactly the contract analytics.js promised. Use cases depend on this port only.
 */
export interface EventRepository {
  /** Append one immutable event. Never updates or deletes. */
  append(event: AnalyticsEvent): Promise<void>;

  /**
   * Read events for projection. Implementations may window by time/actor for
   * scale; the MVP adapter returns the full log.
   */
  query(filter?: EventQuery): Promise<AnalyticsEvent[]>;

  /**
   * Subscribe to live changes (Firestore onSnapshot at scale; a no-op or
   * polling shim for the local adapter). Returns an unsubscribe function.
   */
  subscribe?(
    onChange: (events: AnalyticsEvent[]) => void,
    filter?: EventQuery,
  ): () => void;
}

export interface EventQuery {
  /** Inclusive lower bound, epoch ms. */
  since?: number;
  /** Inclusive upper bound, epoch ms. */
  until?: number;
  actorId?: string;
  names?: string[];
  limit?: number;
}
