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

  status: DocumentStatus;
  uploadedBy?: string;
  uploadedAt?: number;

  // Reviewer decision
  reviewerId?: string;
  decidedAt?: number;
  notes?: string;

  createdAt: number;
  updatedAt: number;
}
