import type { SubmitAdvisorApplicationDeps } from "@core/application/use-cases/submit-advisor-application";
import type { VerificationDeps } from "@core/application/use-cases/verification";
import type { RegisterBuyerDeps } from "@core/application/use-cases/register-buyer";
import type { RoleClaimService } from "@core/application/ports";
import { FirestoreUserRepository } from "./repositories/firestore-user-repository";
import { FirestoreWalletRepository } from "./repositories/firestore-wallet-repository";
import { getFirebaseClient } from "./firebase/client";
import { getEventRepository } from "./events/event-repository.factory";
import { systemClock } from "./system/system-clock";
import { idGenerator } from "./system/id-generator";
import { sessionProvider } from "./system/session-provider";
import { webRuntimeContext } from "./system/runtime-context";
import { FirebaseStorageService } from "./storage/firebase-storage-service";
import { HttpRoleClaimService } from "./auth/http-role-claim-service";
import { FirestoreAdvisorProfileRepository } from "./repositories/firestore-advisor-profile-repository";
import { FirestorePropertyRepository } from "./repositories/firestore-property-repository";
import { FirestoreDocumentRepository } from "./repositories/firestore-document-repository";
import { FirestorePayoutAccountRepository } from "./repositories/firestore-payout-account-repository";

/**
 * Composition root — the ONE place concrete adapters are wired to the ports a
 * use case needs. Client-side (uses the Firebase client SDK). Keeping this here
 * means use cases and hooks never `new` an adapter themselves; swapping an
 * implementation is a single edit.
 */
export function buildAdvisorOnboardingDeps(): SubmitAdvisorApplicationDeps {
  const { db, storage } = getFirebaseClient();
  return {
    ids: idGenerator,
    clock: systemClock,
    session: sessionProvider,
    runtime: webRuntimeContext,
    advisors: new FirestoreAdvisorProfileRepository(db),
    properties: new FirestorePropertyRepository(db),
    documents: new FirestoreDocumentRepository(db),
    payouts: new FirestorePayoutAccountRepository(db),
    storage: new FirebaseStorageService(storage),
    events: getEventRepository(),
  };
}

/** Deps for the verifier's review actions (+ the server-backed role grant). */
export function buildVerificationDeps(): VerificationDeps & {
  roleClaims: RoleClaimService;
} {
  const { db } = getFirebaseClient();
  return {
    advisors: new FirestoreAdvisorProfileRepository(db),
    documents: new FirestoreDocumentRepository(db),
    events: getEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: webRuntimeContext,
    roleClaims: new HttpRoleClaimService(),
  };
}

/** Deps for completing buyer signup (writes users/{uid} + emits buyer_signup). */
export function buildBuyerDeps(): RegisterBuyerDeps {
  const { db } = getFirebaseClient();
  return {
    users: new FirestoreUserRepository(db),
    events: getEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: webRuntimeContext,
  };
}

/** Client-side, read-only wallet access for the buyer's wallet screen. */
export function buildWalletReader() {
  const { db } = getFirebaseClient();
  return new FirestoreWalletRepository(db);
}

/** Read-only repositories for rendering an advisor's review dossier. */
export function buildReviewReaders() {
  const { db } = getFirebaseClient();
  return {
    advisors: new FirestoreAdvisorProfileRepository(db),
    documents: new FirestoreDocumentRepository(db),
    properties: new FirestorePropertyRepository(db),
  };
}
