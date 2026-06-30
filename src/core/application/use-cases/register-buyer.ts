import { EVENT_NAMES, createEvent } from "../../domain/events";
import type { BuyerStage } from "../../domain/events";
import type { User } from "../../domain/entities";
import type {
  AuthUser,
  Clock,
  EventRepository,
  IdGenerator,
  SessionProvider,
  UserRepository,
} from "../ports";

/**
 * registerBuyer — completes buyer signup AFTER phone-OTP auth. Creates the
 * users/{uid} record and emits buyer_signup with the demand-intelligence intent
 * (intent, project, budget, stage, timeline) — the seed of every demand metric.
 * Pure orchestration over ports.
 */
export interface RegisterBuyerInput {
  displayName: string;
  email: string;
  city: string;
  intent: "live_in" | "invest" | "resale";
  targetProject?: string;
  budget: string;
  stage: BuyerStage;
  timeline: string;
  source?: string;
}

export interface RegisterBuyerDeps {
  users: UserRepository;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
}

export async function registerBuyer(
  actor: AuthUser,
  input: RegisterBuyerInput,
  deps: RegisterBuyerDeps,
): Promise<void> {
  const now = deps.clock.now();

  const user: User = {
    uid: actor.uid,
    role: "buyer",
    displayName: input.displayName,
    email: input.email,
    phone: actor.phone,
    city: input.city,
    status: "active",
    buyer: {
      intent: input.intent,
      targetProject: input.targetProject,
      budget: input.budget,
      stage: input.stage,
      timeline: input.timeline,
      source: input.source ?? "organic",
    },
    createdAt: now,
    updatedAt: now,
  };
  await deps.users.create(user);

  await deps.events.append(
    createEvent(
      EVENT_NAMES.BUYER_SIGNUP,
      { actorId: actor.uid, actorType: "buyer", buyerId: actor.uid },
      {
        name: input.displayName,
        intent: input.intent,
        targetProject: input.targetProject,
        budget: input.budget,
        stage: input.stage,
        timeline: input.timeline,
        targetCity: input.city,
        source: input.source ?? "organic",
      },
      {
        id: deps.ids.next("e"),
        ts: now,
        actor: { id: actor.uid, type: "buyer" },
        sessionId: deps.session.sessionId(),
      },
    ),
  );
}
