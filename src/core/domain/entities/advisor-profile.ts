/**
 * advisor_profiles/{advisorId} — keyed by the advisor's Auth uid. Lifted from
 * the documents-dashboard ADVISORS record. Public-facing fields are readable by
 * buyers once `status === "active"`; verification fields are writable only by
 * staff (enforced in Security Rules).
 */
export type AdvisorStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "active"
  | "rejected"
  | "suspended";

export interface AdvisorProfile {
  advisorId: string;

  // Personal (public)
  firstName: string;
  lastName: string;
  city: string;
  languages: string[];
  occupation?: string;
  industry?: string;
  bio?: string;
  photoPath?: string;

  // Availability
  availableDays: string[];
  callHoursFrom?: string;
  callHoursTo?: string;
  maxCallsPerDay?: "1-2" | "3-5" | "unlimited";

  // Profile & rate (rate in paise/min)
  ratePerMinPaise: number;
  headline?: string;

  // Verification (staff-controlled)
  status: AdvisorStatus;
  ownershipVerified: boolean;
  verifierId?: string;
  rejectionReason?: string;
  submittedAt?: number;
  activatedAt?: number;

  // Derived reputation (projected from reviews; cached for listing/sort)
  ratingAvg: number;
  ratingCount: number;

  /** Primary property shown on the card; full list lives in properties/. */
  primaryPropertyId?: string;

  createdAt: number;
  updatedAt: number;
}
