/**
 * Ambient system capabilities, injected so the domain stays pure and testable.
 * Production uses real implementations; tests pass deterministic fakes.
 */

/** Source of "now" — never call Date.now() inside use cases directly. */
export interface Clock {
  now(): number;
}

/** Source of unique, sortable event/entity ids. */
export interface IdGenerator {
  /** e.g. "e_<ts>_<rand>" for events, or a uuid for entities. */
  next(prefix?: string): string;
}

/** Identifies the current session for grouping events into one visit. */
export interface SessionProvider {
  sessionId(): string;
}
