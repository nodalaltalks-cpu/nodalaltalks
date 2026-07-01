import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import type { ReviewRepository } from "@core/application/ports";
import type { Review } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";

/** Client-side, read-only reviews access (public read; writes are server-owned). */
export class FirestoreReviewRepository implements ReviewRepository {
  constructor(private readonly db: Firestore) {}

  async listByAdvisor(advisorId: string, max = 20): Promise<Review[]> {
    const snap = await getDocs(
      query(
        collection(this.db, COLLECTIONS.REVIEWS),
        where("advisorId", "==", advisorId),
        orderBy("createdAt", "desc"),
        fsLimit(max),
      ),
    );
    return snap.docs.map((d) => d.data() as Review);
  }

  async getByCall(callId: string): Promise<Review | null> {
    const snap = await getDoc(doc(this.db, COLLECTIONS.REVIEWS, callId));
    return snap.exists() ? (snap.data() as Review) : null;
  }
}
