import "server-only";
import type { ReviewLedger } from "@core/application/ports";
import type { Review } from "@core/domain/entities";
import { getFirebaseAdmin } from "../firebase/admin";
import { COLLECTIONS } from "../firebase/collections";

/**
 * Admin-SDK review ledger. Writes the review and recomputes the advisor's
 * cached ratingAvg/ratingCount in a single Firestore transaction, so a review
 * can never exist without the aggregate reflecting it (and vice versa) —
 * same shape as AdminWalletLedger.settleCall's buyer-debit + advisor-payout.
 */
export class AdminReviewLedger implements ReviewLedger {
  private readonly db = getFirebaseAdmin().db;

  async submit(review: Review): Promise<void> {
    const reviewRef = this.db.collection(COLLECTIONS.REVIEWS).doc(review.id);
    const advisorRef = this.db.collection(COLLECTIONS.ADVISOR_PROFILES).doc(review.advisorId);

    await this.db.runTransaction(async (tx) => {
      const [reviewSnap, advisorSnap] = await Promise.all([tx.get(reviewRef), tx.get(advisorRef)]);
      if (reviewSnap.exists) throw new Error("This call has already been reviewed.");
      if (!advisorSnap.exists) throw new Error("Advisor not found.");

      const data = advisorSnap.data()!;
      const prevAvg = (data.ratingAvg as number) ?? 0;
      const prevCount = (data.ratingCount as number) ?? 0;
      const nextCount = prevCount + 1;
      const nextAvg = Math.round(((prevAvg * prevCount + review.rating) / nextCount) * 100) / 100;

      tx.set(reviewRef, review);
      tx.update(advisorRef, {
        ratingAvg: nextAvg,
        ratingCount: nextCount,
        updatedAt: Date.now(),
      });
    });
  }
}
