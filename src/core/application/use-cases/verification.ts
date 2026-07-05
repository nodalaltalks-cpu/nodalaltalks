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
  NotificationRepository,
  PropertyRepository,
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
 *  • advisor is a CAPABILITY, not a role claim: activation flips the profile
 *    to `active`, and everything downstream (rules, UI, call routing) keys off
 *    that server-verified status — no privilege claim is granted, so there is
 *    nothing for a compromised verifier session to escalate;
 *  • nothing is deleted: rejections and re-uploads are new events over history.
 */

export interface VerificationDeps {
  advisors: AdvisorProfileRepository;
  documents: DocumentRepository;
  properties: PropertyRepository;
  notifications: NotificationRepository;
  events: EventRepository;
  clock: Clock;
  ids: IdGenerator;
  session: SessionProvider;
  runtime: RuntimeContext;
}

/** In-app notification to the advisor about a verification decision. Only
 *  actionable/final decisions notify — per-document approvals stay quiet
 *  until the application-level outcome. */
function notifyAdvisor(
  deps: VerificationDeps,
  advisorId: string,
  type: string,
  title: string,
  body: string,
) {
  return deps.notifications.create({
    id: deps.ids.next("notif"),
    userId: advisorId,
    type,
    title,
    body,
    read: false,
    createdAt: deps.clock.now(),
  });
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

  if (outcome === "needs_reupload") {
    await notifyAdvisor(
      deps, doc.advisorId, "document_reupload",
      "Action needed: re-upload a document",
      `${doc.name}: ${reason ?? "please upload a clearer copy."}`,
    );
  } else if (outcome === "rejected") {
    await notifyAdvisor(
      deps, doc.advisorId, "document_rejected",
      "A document was rejected",
      `${doc.name}${reason ? `: ${reason}` : ""}`,
    );
  }
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
 * Approve & activate. Verifies the checklist, flips status/ownership, and
 * records the activation. The `active` profile status IS the advisor
 * capability — no role claim is involved (see the module header).
 */
export async function activateAdvisor(
  advisorId: string,
  verifier: AuthUser,
  deps: VerificationDeps,
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

  // Stamp the project on activation — this is the supply side of
  // liquidityByProject (Marketplace Health's "who needs advisor recruitment"
  // panel); without it, every project reads as zero supply forever.
  const profile = await deps.advisors.get(advisorId);
  const properties = await deps.properties.listByAdvisor(advisorId);
  const primaryProperty =
    properties.find((p) => p.id === profile?.primaryPropertyId) ?? properties[0];

  await emitter(verifier, advisorId, deps)(
    EVENT_NAMES.ADVISOR_ACTIVATED,
    { verifierId: verifier.uid },
    { projectId: primaryProperty?.project },
  );

  await notifyAdvisor(
    deps, advisorId, "advisor_activated",
    "You're live! 🎉",
    "Your ownership is verified. Go online from your advisor dashboard to start taking calls.",
  );
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

  await notifyAdvisor(
    deps, advisorId, "advisor_rejected",
    "Your application was not approved",
    reason,
  );
}
