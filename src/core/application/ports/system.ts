import type { Environment, Platform } from "../../domain/events";

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

/**
 * Ambient runtime identity stamped onto every event (source/platform/environment).
 * Injected rather than read from process.env inside a use case, so the same use
 * case behaves identically whether called from a web route, a server route, or a
 * future Cloud Function / mobile client.
 */
export interface RuntimeContext {
  source(): string;
  platform(): Platform;
  environment(): Environment;
}
