import type { Role } from "../value-objects/role";
import type { BuyerStage } from "../events/event.types";

/**
 * users/{uid} — the identity record for every account, keyed by Firebase Auth
 * uid. Role is mirrored from the custom claim (claims are authoritative for
 * rules; this copy is for queries/joins). Buyer-specific intent is embedded;
 * advisors carry their detail in advisor_profiles/{uid}.
 */
export interface User {
  uid: string;
  role: Role;
  displayName: string;
  email?: string;
  phone?: string;
  city?: string;
  status: "active" | "suspended";
  /** FCM device tokens for push (Feature 2 phase / Phase 2 notifications). */
  fcmTokens?: string[];
  /** Present only when role === "buyer". */
  buyer?: BuyerIntent;
  createdAt: number;
  updatedAt: number;
}

/** Captured at signup; the seed of demand intelligence. */
export interface BuyerIntent {
  intent?: "live_in" | "invest" | "resale";
  targetProject?: string;
  budget?: string;
  stage?: BuyerStage;
  /** Predicted purchase window. */
  timeline?: string;
  source?: string;
}
