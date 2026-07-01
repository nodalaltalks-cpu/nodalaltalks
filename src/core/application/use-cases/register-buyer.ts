import { EVENT_NAMES } from "../../domain/events";
import type { BuyerStage } from "../../domain/events";
import type { User } from "../../domain/entities";
import { createEventEmitter } from "../events/create-emitter";
import type {
  AuthUser,
  Clock,
  EventRepository,
  IdGenerator,
  RuntimeContext,
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
  runtime: RuntimeContext;
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

  const emit = createEventEmitter(
    { id: actor.uid, type: "buyer" },
    { actorId: actor.uid, actorType: "buyer", buyerId: actor.uid },
    deps,
  );
  await emit(EVENT_NAMES.BUYER_SIGNUP, {
    name: input.displayName,
    intent: input.intent,
    targetProject: input.targetProject,
    budget: input.budget,
    stage: input.stage,
    timeline: input.timeline,
    targetCity: input.city,
    source: input.source ?? "organic",
  });
}
