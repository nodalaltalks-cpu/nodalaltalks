import type { SubmitAdvisorApplicationDeps } from "@core/application/use-cases/submit-advisor-application";
import type { VerificationDeps } from "@core/application/use-cases/verification";
import type { RegisterBuyerDeps } from "@core/application/use-cases/register-buyer";
import type { CallDeps } from "@core/application/use-cases/calls";
import { FirestoreUserRepository } from "./repositories/firestore-user-repository";
import { FirestoreWalletRepository } from "./repositories/firestore-wallet-repository";
import { FirestoreCallRepository } from "./repositories/firestore-call-repository";
import { FirestoreReviewRepository } from "./repositories/firestore-review-repository";
import { FirestoreSystemSettingsRepository } from "./repositories/firestore-system-settings-repository";
import { FirestoreNotificationRepository } from "./repositories/firestore-notification-repository";
import { getFirebaseClient } from "./firebase/client";
import { getEventRepository } from "./events/event-repository.factory";
import { systemClock } from "./system/system-clock";
import { idGenerator } from "./system/id-generator";
import { sessionProvider } from "./system/session-provider";
import { webRuntimeContext } from "./system/runtime-context";
import { hashService } from "./system/web-crypto-hash-service";
import { FirebaseStorageService } from "./storage/firebase-storage-service";
import { PlaceholderCallService } from "./calling/placeholder-call-service";
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
    hash: hashService,
    settings: new FirestoreSystemSettingsRepository(db),
    events: getEventRepository(),
  };
}

/** Deps for the verifier's review actions. */
export function buildVerificationDeps(): VerificationDeps {
  const { db } = getFirebaseClient();
  return {
    advisors: new FirestoreAdvisorProfileRepository(db),
    documents: new FirestoreDocumentRepository(db),
    properties: new FirestorePropertyRepository(db),
    notifications: new FirestoreNotificationRepository(db),
    events: getEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: webRuntimeContext,
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

/** Deps for requestCall/cancelCall — the client-owned half of a call's lifecycle. */
export function buildCallDeps(): CallDeps {
  const { db } = getFirebaseClient();
  return {
    advisors: new FirestoreAdvisorProfileRepository(db),
    properties: new FirestorePropertyRepository(db),
    wallet: new FirestoreWalletRepository(db),
    calls: new FirestoreCallRepository(db),
    callService: new PlaceholderCallService(),
    events: getEventRepository(),
    clock: systemClock,
    ids: idGenerator,
    session: sessionProvider,
    runtime: webRuntimeContext,
  };
}

/** Client-side call read-model access (in-call screen, call history). */
export function buildCallReader() {
  const { db } = getFirebaseClient();
  return new FirestoreCallRepository(db);
}

/** Founder-only settings screen (read + update system_settings/global). */
export function buildSettingsRepo() {
  const { db } = getFirebaseClient();
  return new FirestoreSystemSettingsRepository(db);
}

/** The signed-in user's own notification inbox (list + markRead). */
export function buildNotificationReader() {
  const { db } = getFirebaseClient();
  return new FirestoreNotificationRepository(db);
}

/** Read-only repositories for rendering an advisor's dossier (profile,
 *  documents, property, buyer reviews). */
export function buildReviewReaders() {
  const { db } = getFirebaseClient();
  return {
    advisors: new FirestoreAdvisorProfileRepository(db),
    documents: new FirestoreDocumentRepository(db),
    properties: new FirestorePropertyRepository(db),
    reviews: new FirestoreReviewRepository(db),
  };
}
