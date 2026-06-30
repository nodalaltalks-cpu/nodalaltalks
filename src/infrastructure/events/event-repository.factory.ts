import type { EventRepository } from "@core/application/ports";
import { eventBackend } from "../firebase/env";
import { getFirebaseClient } from "../firebase/client";
import { FirestoreEventRepository } from "./firestore-event-repository";
import { InMemoryEventRepository } from "./in-memory-event-repository";

/**
 * Selects the EventRepository adapter from NEXT_PUBLIC_EVENT_BACKEND, mirroring
 * NDT.config.backend. "local" → in-memory (dev/test); "firestore" → live log.
 * Callers depend only on the EventRepository port, never on the concrete class.
 */
let cached: EventRepository | null = null;

export function getEventRepository(): EventRepository {
  if (cached) return cached;
  cached =
    eventBackend() === "firestore"
      ? new FirestoreEventRepository(getFirebaseClient().db)
      : new InMemoryEventRepository();
  return cached;
}

/** Test/SSR helper — bypass the singleton with an explicit instance. */
export function setEventRepository(repo: EventRepository): void {
  cached = repo;
}
