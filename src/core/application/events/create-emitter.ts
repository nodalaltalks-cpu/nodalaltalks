import { createEvent } from "../../domain/events";
import type { EventActor, EventEntity, EventName, EventProps } from "../../domain/events";
import type { Clock, EventRepository, IdGenerator, RuntimeContext, SessionProvider } from "../ports";

export interface EventEmitterDeps {
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

/**
 * Builds a scoped `emit()` for one use case: the actor and a base entity (e.g.
 * `{ advisorId }`) are fixed once, then id/ts/session/runtime are stamped on
 * every call via `createEvent`. This is the single place every use case's event
 * envelope assembly goes through — previously each use case duplicated this
 * wiring locally, which is also why source/platform/environment could drift
 * between them. `entity` on the returned function merges over (never under)
 * `baseEntity` for the rare call that needs to add an id the base doesn't have.
 */
export function createEventEmitter(
  actor: EventActor,
  baseEntity: EventEntity,
  deps: EventEmitterDeps,
) {
  return (name: EventName, props: EventProps = {}, entity: EventEntity = {}) =>
    deps.events.append(
      createEvent(name, { ...baseEntity, ...entity }, props, {
        id: deps.ids.next("e"),
        ts: deps.clock.now(),
        actor,
        sessionId: deps.session.sessionId(),
        source: deps.runtime.source(),
        platform: deps.runtime.platform(),
        environment: deps.runtime.environment(),
      }),
    );
}
