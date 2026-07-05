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

  // Availability — the advisor's own online/offline switch (AstroTalk's core
  // supply mechanic). Absent means offline: an advisor must consciously go
  // online before calls can reach them. Self-writable ONLY while status is
  // "active" (enforced in Security Rules).
  isAvailable?: boolean;
  lastOnlineAt?: number;

  /** Primary property shown on the card; full list lives in properties/. */
  primaryPropertyId?: string;

  // Public-safe copy of the primary property's non-sensitive fields, so a
  // signed-out buyer browsing before signup can see them without Security
  // Rules ever exposing the properties/ collection (which also holds
  // financing details like homeLoan) to anonymous readers. Set once at
  // submission from the same source of truth as primaryPropertyId.
  primaryProject?: string;
  primaryBuilder?: string;
  primaryCity?: string;
  expertise?: string[];

  createdAt: number;
  updatedAt: number;
}
