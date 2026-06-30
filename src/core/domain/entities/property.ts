/**
 * properties/{propertyId} — a property an advisor owns and can speak about.
 * Modeled from the advisor onboarding "Property Details" step. One advisor may
 * own several (added post-approval); each requires its own document verification.
 *
 * The V1 intelligence fields (pricePaid, possession promised vs actual) are the
 * highest-value, unbackfillable signals — kept private, used only in aggregate.
 */
export type PossessionStatus =
  | "received_living"
  | "received_rented"
  | "under_construction";

export interface Property {
  id: string;
  advisorId: string;

  builder: string;
  project: string;
  city: string;
  locality: string;
  address?: string;

  propertyType:
    | "apartment"
    | "villa"
    | "rowhouse"
    | "commercial"
    | "plot"
    | "other";
  configuration?: string; // "2 BHK", etc.
  carpetAreaSqft?: number;
  floor?: string;
  tower?: string;

  yearOfPurchase: number;
  /** Either a free range bucket (onboarding) or exact paise (V1 capture). */
  purchasePriceBucket?: string;
  pricePaidPaise?: number;

  possessionStatus: PossessionStatus;
  possessionPromisedYear?: number;
  possessionActualYear?: number;

  homeLoan?: "bank" | "hfc_nbfc" | "self_funded";

  /** Topics the advisor can speak confidently about. */
  expertise: string[];
  notes?: string;

  createdAt: number;
  updatedAt: number;
}
