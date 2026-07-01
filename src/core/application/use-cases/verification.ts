import { EVENT_NAMES } from "../../domain/events";
import type { EventName } from "../../domain/events";
import type { VerificationDocument } from "../../domain/entities";
import { createEventEmitter } from "../events/create-emitter";
import type {
  AdvisorProfileRepository,
  AuthUser,
  Clock,
  DocumentRepository,
  EventRepository,
  IdGenerator,
  RoleClaimService,
  RuntimeContext,
  SessionProvider,
} from "../ports";

/**
 * Verification use cases — the verifier's actions over an advisor application.
 * Pure orchestration; every decision is recorded as an immutable event (the
 * audit trail), and the read-models are updated to reflect the decision.
 *
 * Proptech discipline baked in:
 *  • activation is gated by a required-document checklist (KYC-style);
 *  • the `advisor` role is granted only via the server-side RoleClaimService —
 *    a verifier can never elevate access purely client-side;
 *  • nothing is deleted: rejections and re-uploads are new events over history.
 */

export interface VerificationDeps {
  advisors: AdvisorProfileRepository;
  documents: DocumentRepository;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

function emitter(verifier: AuthUser, advisorId: string, deps: VerificationDeps) {
  return createEventEmitter(
    { id: verifier.uid, type: "verifier" },
    { advisorId, verifierId: verifier.uid, actorId: verifier.uid, actorType: "verifier" },
    deps,
  );
}

/** Verifier opens an application — moves submitted → under_review. */
export async function startVerification(
  advisorId: string,
  verifier: AuthUser,
  deps: VerificationDeps,
): Promise<void> {
  const profile = await deps.advisors.get(advisorId);
  if (profile && profile.status === "submitted") {
    await deps.advisors.update(advisorId, { status: "under_review" });
  }
  await emitter(verifier, advisorId, deps)(EVENT_NAMES.VERIFICATION_STARTED, {
    verifierId: verifier.uid,
  });
}

export type DocumentOutcome = "approved" | "rejected" | "needs_reupload";

const OUTCOME_EVENT: Record<DocumentOutcome, EventName> = {
  approved: EVENT_NAMES.DOCUMENT_APPROVED,
  rejected: EVENT_NAMES.DOCUMENT_REJECTED,
  needs_reupload: EVENT_NAMES.DOCUMENT_REUPLOAD_REQUESTED,
};

/** Verifier decides a single document; records the decision + audit event. */
export async function decideDocument(
  documentId: string,
  outcome: DocumentOutcome,
  reason: string | undefined,
  verifier: AuthUser,
  deps: VerificationDeps,
): Promise<void> {
  const doc = await deps.documents.get(documentId);
  if (!doc) throw new Error("Document not found.");

  await deps.documents.update(documentId, {
    status: outcome,
    reviewerId: verifier.uid,
    decidedAt: deps.clock.now(),
    notes: reason,
  });

  await emitter(verifier, doc.advisorId, deps)(OUTCOME_EVENT[outcome], {
    docType: doc.docType,
    reason,
  });
}

/** Required-document checklist for activation (the proptech "owner verified" bar). */
export function activationBlockers(docs: VerificationDocument[]): string[] {
  const blockers: string[] = [];
  const approved = docs.filter((d) => d.status === "approved");
  const hasOwnership = approved.some((d) => d.group === "Ownership Proof");
  const hasIdentity = approved.some((d) => d.group === "Identity");
  const stillOpen = docs.filter(
    (d) =>
      d.status === "uploaded" ||
      d.status === "under_review" ||
      d.status === "needs_reupload",
  );

  if (!hasOwnership) blockers.push("Ownership proof not yet approved");
  if (!hasIdentity) blockers.push("Identity document not yet approved");
  if (stillOpen.length > 0)
    blockers.push(`${stillOpen.length} document(s) still pending a decision`);
  return blockers;
}

/**
 * Approve & activate. Verifies the checklist, flips status/ownership, GRANTS the
 * advisor role via the server-side RoleClaimService, and records the activation.
 */
export async function activateAdvisor(
  advisorId: string,
  verifier: AuthUser,
  deps: VerificationDeps & { roleClaims: RoleClaimService },
): Promise<void> {
  const docs = await deps.documents.listByAdvisor(advisorId);
  const blockers = activationBlockers(docs);
  if (blockers.length > 0) {
    throw new Error(`Cannot activate yet: ${blockers.join("; ")}.`);
  }

  await deps.advisors.update(advisorId, {
    status: "active",
    ownershipVerified: true,
    verifierId: verifier.uid,
    activatedAt: deps.clock.now(),
  });

  // Privileged: grant the advisor role server-side.
  await deps.roleClaims.setRole(advisorId, "advisor");

  await emitter(verifier, advisorId, deps)(EVENT_NAMES.ADVISOR_ACTIVATED, {
    verifierId: verifier.uid,
  });
}

/** Reject the whole application with a reason. */
export async function rejectAdvisor(
  advisorId: string,
  reason: string,
  verifier: AuthUser,
  deps: VerificationDeps,
): Promise<void> {
  await deps.advisors.update(advisorId, {
    status: "rejected",
    rejectionReason: reason,
  });
  await emitter(verifier, advisorId, deps)(EVENT_NAMES.ADVISOR_REJECTED, {
    reason,
  });
}
