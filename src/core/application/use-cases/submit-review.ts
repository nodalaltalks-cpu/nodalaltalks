import { EVENT_NAMES } from "../../domain/events";
import type { Review } from "../../domain/entities";
import { createEventEmitter } from "../events/create-emitter";
import type {
  AuthUser,
  CallRepository,
  Clock,
  EventRepository,
  IdGenerator,
  ReviewLedger,
  RuntimeContext,
  SessionProvider,
} from "../ports";

/**
 * submitReview — a buyer rates a call they just had. Server-only (like
 * rechargeWallet/endCall): Security Rules only let staff write an advisor's
 * cached ratingAvg/ratingCount, so folding a new rating into that aggregate
 * can never happen from the client. ReviewLedger.submit does the review write
 * and the aggregate update atomically, and the doc id (== callId) makes
 * "one review per call" a Firestore-level guarantee, not an application check.
 */
export interface SubmitReviewInput {
  callId: string;
  rating: number; // 1–5
  confidenceShift?: "more" | "same" | "less";
  concernTags?: string[];
  comment?: string;
}

export interface SubmitReviewDeps {
  calls: CallRepository;
  reviews: ReviewLedger;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

export async function submitReview(
  buyer: AuthUser,
  input: SubmitReviewInput,
  deps: SubmitReviewDeps,
): Promise<Review> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be a whole number between 1 and 5.");
  }

  const call = await deps.calls.get(input.callId);
  if (!call) throw new Error("Call not found.");
  if (call.buyerId !== buyer.uid) throw new Error("You can only review your own calls.");
  if (call.status !== "completed") throw new Error("You can only review a completed call.");

  const review: Review = {
    id: input.callId,
    callId: input.callId,
    advisorId: call.advisorId,
    buyerId: buyer.uid,
    rating: input.rating,
    confidenceShift: input.confidenceShift,
    concernTags: input.concernTags ?? [],
    comment: input.comment,
    createdAt: deps.clock.now(),
    schemaVersion: 1,
  };
  await deps.reviews.submit(review);

  const emit = createEventEmitter(
    { id: buyer.uid, type: "buyer" },
    { callId: input.callId, buyerId: buyer.uid, advisorId: call.advisorId, actorId: buyer.uid, actorType: "buyer" },
    deps,
  );
  await emit(EVENT_NAMES.REVIEW_SUBMITTED, {
    rating: input.rating,
    confidenceShift: input.confidenceShift,
    concernTags: input.concernTags,
  });

  return review;
}
