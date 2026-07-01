import type { Review } from "../../domain/entities";

/**
 * Server-side, atomic review submission. Implemented by an Admin-SDK adapter
 * that writes the review AND folds its rating into the advisor's cached
 * ratingAvg/ratingCount in the same Firestore transaction — Security Rules
 * only let staff touch those fields, so a buyer client can never write them
 * directly, mirroring why wallet mutations are server-owned (WalletLedger).
 */
export interface ReviewLedger {
  /** Doc id is `review.id` (== callId), so a call can only be reviewed once —
   *  throws if a review already exists for it. */
  submit(review: Review): Promise<void>;
}
