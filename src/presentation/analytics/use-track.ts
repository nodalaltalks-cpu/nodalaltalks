"use client";

import { useCallback } from "react";
import { type EventEntity, type EventName, type EventProps, type ActorType } from "@core/domain/events";
import { createEventEmitter } from "@core/application/events/create-emitter";
import { getEventRepository } from "@infra/events/event-repository.factory";
import { idGenerator } from "@infra/system/id-generator";
import { systemClock } from "@infra/system/system-clock";
import { sessionProvider } from "@infra/system/session-provider";
import { webRuntimeContext } from "@infra/system/runtime-context";
import { useAuth } from "@/presentation/providers/auth-provider";

/**
 * The React equivalent of analytics.js `track()`: fire-and-forget event capture
 * for lightweight user actions (search, profile view, OTP, shortlist). Heavier
 * state transitions (signup, verification, calls) go through use cases instead.
 * The current auth user is the default actor; `entity` may override it.
 */
export function useTrack() {
  const { user } = useAuth();

  return useCallback(
    (name: EventName, entity: EventEntity = {}, props: EventProps = {}) => {
      const type: ActorType = user
        ? user.role === "founder"
          ? "admin"
          : user.role
        : "buyer";
      const actor = { id: user?.uid ?? "anon", type };
      const emit = createEventEmitter(actor, {}, {
        events: getEventRepository(),
        clock: systemClock,
        ids: idGenerator,
        session: sessionProvider,
        runtime: webRuntimeContext,
      });
      void emit(name, props, entity);
    },
    [user],
  );
}
