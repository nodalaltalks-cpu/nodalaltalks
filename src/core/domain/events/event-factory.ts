import type { EventName } from "./event-names";
import type {
  AnalyticsEvent,
  Environment,
  EventActor,
  EventEntity,
  EventProps,
  Platform,
} from "./event.types";

/** Bump only when the envelope shape (this file's output) changes. */
const SCHEMA_VERSION = 1;

/**
 * Context required to stamp an event. Injected (not imported) so the factory
 * stays pure and deterministic — the same inputs always produce the same event.
 * Real id/timestamp generation lives in infrastructure (IdGenerator, Clock ports);
 * source/platform/environment come from the RuntimeContext port. Tests pass
 * fixed values for all of it.
 */
export interface EventContext {
  id: string;
  ts: number;
  actor: EventActor;
  sessionId: string;
  source: string;
  platform: Platform;
  environment: Environment;
}

/**
 * The ONLY constructor for an event. Mirrors analytics.js `track()`'s envelope
 * assembly, minus the side effect of writing — persistence is a separate port
 * (EventRepository). entity.actorId / entity.actorType may override the actor
 * (e.g. a system event acting on a specific buyer), exactly as the original did.
 */
export function createEvent(
  name: EventName,
  entity: EventEntity = {},
  props: EventProps = {},
  ctx: EventContext,
): AnalyticsEvent {
  return {
    id: ctx.id,
    name,
    ts: ctx.ts,
    actorId: entity.actorId ?? ctx.actor.id,
    actorType: entity.actorType ?? ctx.actor.type,
    sessionId: ctx.sessionId,
    entity,
    props,
    eventVersion: 1,
    schemaVersion: SCHEMA_VERSION,
    source: ctx.source,
    platform: ctx.platform,
    environment: ctx.environment,
  };
}
