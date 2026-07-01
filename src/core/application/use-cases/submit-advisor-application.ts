import { EVENT_NAMES } from "../../domain/events";
import type {
  AdvisorProfile,
  Property,
  VerificationDocument,
} from "../../domain/entities";
import type { PossessionStatus } from "../../domain/entities";
import { createEventEmitter } from "../events/create-emitter";
import type {
  AdvisorProfileRepository,
  AuthUser,
  Clock,
  DocumentRepository,
  EventRepository,
  IdGenerator,
  PayoutAccount,
  PayoutAccountRepository,
  PropertyRepository,
  RuntimeContext,
  SessionProvider,
  StorageService,
} from "../ports";

/**
 * submitAdvisorApplication — the single transaction-like flow behind the
 * advisor onboarding form. Pure orchestration over ports; no Firebase, no React.
 *
 * It writes the read-models (advisor_profiles, properties, documents, private
 * payout_accounts), uploads each file via the StorageService, and emits the
 * onboarding events (advisor_signup_started, document_uploaded×N,
 * advisor_rate_set, advisor_submitted) through the EventRepository — exactly the
 * hooks the analytics blueprint specifies. The dashboards then derive from these
 * events; nothing is hardcoded.
 */

export interface ApplicationDocumentUpload {
  docType: string;
  name: string;
  group: string;
  file: Blob;
  fileName: string;
  size: number;
  mimeType: string;
}

export interface SubmitAdvisorApplicationInput {
  personal: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    city: string;
    languages: string[];
    occupation?: string;
    industry?: string;
    bio?: string;
    availableDays: string[];
    callHoursFrom?: string;
    callHoursTo?: string;
    maxCallsPerDay: "1-2" | "3-5" | "unlimited";
  };
  property: {
    builder: string;
    project: string;
    city: string;
    locality: string;
    address?: string;
    propertyType: Property["propertyType"];
    configuration?: string;
    carpetAreaSqft?: number;
    floor?: string;
    tower?: string;
    yearOfPurchase: number;
    purchasePriceBucket: string;
    pricePaidPaise?: number;
    possessionStatus: PossessionStatus;
    possessionPromisedYear?: number;
    possessionActualYear?: number;
    homeLoan?: Property["homeLoan"];
    expertise: string[];
    notes?: string;
  };
  payout: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    upiId?: string;
  };
  rate: { ratePerMinPaise: number; headline?: string };
  documents: ApplicationDocumentUpload[];
}

export interface SubmitAdvisorApplicationDeps {
  ids: IdGenerator;
  clock: Clock;
  session: SessionProvider;
  runtime: RuntimeContext;
  advisors: AdvisorProfileRepository;
  properties: PropertyRepository;
  documents: DocumentRepository;
  payouts: PayoutAccountRepository;
  storage: StorageService;
  events: EventRepository;
}

export interface SubmitAdvisorApplicationResult {
  advisorId: string;
  propertyId: string;
  documentIds: string[];
}

export async function submitAdvisorApplication(
  actor: AuthUser,
  input: SubmitAdvisorApplicationInput,
  deps: SubmitAdvisorApplicationDeps,
): Promise<SubmitAdvisorApplicationResult> {
  const { ids, clock, advisors, properties, documents, payouts, storage } = deps;
  const advisorId = actor.uid;
  const now = clock.now();

  const emit = createEventEmitter(
    { id: advisorId, type: "advisor" },
    { advisorId, actorId: advisorId, actorType: "advisor" },
    deps,
  );

  await emit(EVENT_NAMES.ADVISOR_SIGNUP_STARTED, {
    name: `${input.personal.firstName} ${input.personal.lastName}`,
    city: input.personal.city,
  });

  // 1) Property
  const propertyId = ids.next("prop");
  const property: Property = {
    id: propertyId,
    advisorId,
    builder: input.property.builder,
    project: input.property.project,
    city: input.property.city,
    locality: input.property.locality,
    address: input.property.address,
    propertyType: input.property.propertyType,
    configuration: input.property.configuration,
    carpetAreaSqft: input.property.carpetAreaSqft,
    floor: input.property.floor,
    tower: input.property.tower,
    yearOfPurchase: input.property.yearOfPurchase,
    purchasePriceBucket: input.property.purchasePriceBucket,
    pricePaidPaise: input.property.pricePaidPaise,
    possessionStatus: input.property.possessionStatus,
    possessionPromisedYear: input.property.possessionPromisedYear,
    possessionActualYear: input.property.possessionActualYear,
    homeLoan: input.property.homeLoan,
    expertise: input.property.expertise,
    notes: input.property.notes,
    createdAt: now,
    updatedAt: now,
  };
  await properties.create(property);

  // 2) Documents — upload then record, emitting one event each
  const documentIds: string[] = [];
  for (const upload of input.documents) {
    const documentId = ids.next("doc");
    const path = `documents/${advisorId}/${upload.docType}_${documentId}_${upload.fileName}`;
    const stored = await storage.upload(path, upload.file, {
      contentType: upload.mimeType,
    });

    const doc: VerificationDocument = {
      id: documentId,
      advisorId,
      propertyId,
      name: upload.name,
      group: upload.group,
      docType: upload.docType,
      fileName: upload.fileName,
      storagePath: stored.path,
      size: upload.size,
      mimeType: upload.mimeType,
      status: "uploaded",
      uploadedBy: advisorId,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await documents.create(doc);
    documentIds.push(documentId);

    await emit(EVENT_NAMES.DOCUMENT_UPLOADED, {
      docType: upload.docType,
      fileName: upload.fileName,
      size: upload.size,
    });
  }

  // 3) Payout (private)
  const payout: PayoutAccount = {
    advisorId,
    accountHolderName: input.payout.accountHolderName,
    bankName: input.payout.bankName,
    accountNumber: input.payout.accountNumber,
    ifsc: input.payout.ifsc,
    upiId: input.payout.upiId,
    createdAt: now,
    updatedAt: now,
  };
  await payouts.upsert(payout);

  // 4) Advisor profile (submitted for verification; verification fields locked)
  const profile: AdvisorProfile = {
    advisorId,
    firstName: input.personal.firstName,
    lastName: input.personal.lastName,
    city: input.personal.city,
    languages: input.personal.languages,
    occupation: input.personal.occupation,
    industry: input.personal.industry,
    bio: input.personal.bio,
    availableDays: input.personal.availableDays,
    callHoursFrom: input.personal.callHoursFrom,
    callHoursTo: input.personal.callHoursTo,
    maxCallsPerDay: input.personal.maxCallsPerDay,
    ratePerMinPaise: input.rate.ratePerMinPaise,
    headline: input.rate.headline,
    status: "submitted",
    ownershipVerified: false,
    ratingAvg: 0,
    ratingCount: 0,
    primaryPropertyId: propertyId,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await advisors.create(profile);

  await emit(EVENT_NAMES.ADVISOR_RATE_SET, {
    ratePerMin: input.rate.ratePerMinPaise,
  });
  await emit(EVENT_NAMES.ADVISOR_SUBMITTED, {
    builder: input.property.builder,
    project: input.property.project,
    city: input.property.city,
    expertise: input.property.expertise,
    pricePaid: input.property.pricePaidPaise,
    possession: input.property.possessionStatus,
  });

  return { advisorId, propertyId, documentIds };
}
