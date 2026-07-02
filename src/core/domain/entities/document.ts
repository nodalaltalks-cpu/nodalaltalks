/**
 * documents/{documentId} — a verification artifact uploaded by an advisor.
 * The status lifecycle and labels match the documents dashboard exactly.
 * Sensitive: readable only by the owning advisor and staff (Security Rules).
 */
export type DocumentStatus =
  | "pending_upload"
  | "uploaded"
  | "under_review"
  | "needs_reupload"
  | "rejected"
  | "approved"
  | "expired";

/**
 * Where a document sits in a future (not-yet-built) processing pipeline.
 * "not_applicable" for pipelines that will never run on this doc type;
 * "pending" is the honest default today — no OCR/AI pipeline exists yet.
 */
export type DocumentProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "not_applicable";

export interface VerificationDocument {
  id: string;
  advisorId: string;
  propertyId?: string;

  /** Display name, e.g. "Registered Sale Deed". */
  name: string;
  /** Grouping, e.g. "Ownership Proof", "Identity (Aadhaar)". */
  group: string;
  docType: string;

  fileName?: string;
  /** Firebase Storage path; null until uploaded. */
  storagePath?: string;
  size?: number;
  mimeType?: string;
  /** SHA-256 hex digest of the file bytes — duplicate-document detection groundwork. */
  contentHash?: string;
  /** Emitting surface at upload time, e.g. "web-app". Mirrors the event envelope's `source`. */
  uploadSource?: string;

  status: DocumentStatus;
  uploadedBy?: string;
  uploadedAt?: number;

  // Reviewer decision
  reviewerId?: string;
  decidedAt?: number;
  notes?: string;

  /** Intelligence-ready seams (see ARCHITECTURE.md "AI-readiness") — declared
   *  now so a future pipeline is a status update, not a schema migration. */
  ocrStatus?: DocumentProcessingStatus;
  aiProcessingStatus?: DocumentProcessingStatus;
  /** Future semantic/search tags. Unpopulated until a tagging pipeline exists. */
  retrievalTags?: string[];

  createdAt: number;
  updatedAt: number;
  /** Shape version of this doc; lets future migrations run without a backfill. */
  schemaVersion: number;
}
