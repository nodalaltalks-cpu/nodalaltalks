import type {
  AdvisorProfile,
  AdvisorStatus,
  Call,
  Property,
  Review,
  SystemSettings,
  Transaction,
  User,
  Wallet,
  VerificationDocument,
} from "../../domain/entities";

/** Client-side, read-only wallet access (writes happen server-side only). */
export interface WalletRepository {
  get(buyerId: string): Promise<Wallet | null>;
  listTransactions(ownerId: string, max?: number): Promise<Transaction[]>;
}

export interface UserRepository {
  create(user: User): Promise<void>;
  get(uid: string): Promise<User | null>;
  update(uid: string, patch: Partial<User>): Promise<void>;
}

/**
 * Read-model repository ports. Each abstracts a Firestore collection so use
 * cases never touch Firestore directly. Adapters live in infrastructure.
 * Patches are shallow partials; adapters stamp `updatedAt`.
 */

export interface AdvisorProfileRepository {
  create(profile: AdvisorProfile): Promise<void>;
  get(advisorId: string): Promise<AdvisorProfile | null>;
  update(advisorId: string, patch: Partial<AdvisorProfile>): Promise<void>;
  /** Verification queue feed — advisors in the given lifecycle states. */
  listByStatus(statuses: AdvisorStatus[]): Promise<AdvisorProfile[]>;
  /** Public discovery feed — active advisors, highest-rated first. */
  listActive(max?: number): Promise<AdvisorProfile[]>;
}

export interface PropertyRepository {
  create(property: Property): Promise<void>;
  get(propertyId: string): Promise<Property | null>;
  listByAdvisor(advisorId: string): Promise<Property[]>;
}

export interface DocumentRepository {
  create(doc: VerificationDocument): Promise<void>;
  get(documentId: string): Promise<VerificationDocument | null>;
  listByAdvisor(advisorId: string): Promise<VerificationDocument[]>;
  update(documentId: string, patch: Partial<VerificationDocument>): Promise<void>;
}

/** Bank details for advisor payouts — PRIVATE (never on the public profile). */
export interface PayoutAccount {
  advisorId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PayoutAccountRepository {
  upsert(account: PayoutAccount): Promise<void>;
  get(advisorId: string): Promise<PayoutAccount | null>;
}

/**
 * calls/{callId} read-model. Status transitions (requested → started →
 * completed) may be written by participants client-side per Security Rules;
 * the billing fields (amountChargedPaise, advisorPayoutPaise) are only ever
 * authoritative once reconciled server-side by endCall.
 */
export interface CallRepository {
  create(call: Call): Promise<void>;
  get(callId: string): Promise<Call | null>;
  update(callId: string, patch: Partial<Call>): Promise<void>;
  listRecentByBuyer(buyerId: string, max?: number): Promise<Call[]>;
}

/** Client-side, read-only reviews access (writes are server-owned — ReviewLedger). */
export interface ReviewRepository {
  listByAdvisor(advisorId: string, max?: number): Promise<Review[]>;
  /** Doc id == callId; used to check whether a just-ended call has been reviewed yet. */
  getByCall(callId: string): Promise<Review | null>;
}

/**
 * system_settings/global. `get()` never throws/returns null — it falls back
 * to DEFAULT_SYSTEM_SETTINGS so every consumer works before a founder has
 * ever visited the settings screen. `update()` is a founder-only client path
 * (Security Rules: isAdmin()); reads happen from both client (settings
 * screen) and server (endCall, wallet recharge bounds).
 */
export interface SystemSettingsRepository {
  get(): Promise<SystemSettings>;
  update(patch: Partial<SystemSettings>, updatedBy: string): Promise<void>;
}
