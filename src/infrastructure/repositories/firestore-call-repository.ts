import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { CallRepository } from "@core/application/ports";
import type { Call } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefined } from "../firebase/doc-helpers";

/**
 * Client-side calls/{callId}. Security Rules let a buyer create their own
 * "requested" call and either participant update status fields — the billing
 * fields (amountChargedPaise, advisorPayoutPaise) only ever become authoritative
 * via the server-side endCall (AdminCallRepository).
 */
export class FirestoreCallRepository implements CallRepository {
  constructor(private readonly db: Firestore) {}

  private ref(callId: string) {
    return doc(this.db, COLLECTIONS.CALLS, callId);
  }

  async create(call: Call): Promise<void> {
    await setDoc(this.ref(call.id), pruneUndefined({ ...call }));
  }

  async get(callId: string): Promise<Call | null> {
    const snap = await getDoc(this.ref(callId));
    return snap.exists() ? (snap.data() as Call) : null;
  }

  async update(callId: string, patch: Partial<Call>): Promise<void> {
    await updateDoc(this.ref(callId), pruneUndefined({ ...patch, updatedAt: Date.now() }));
  }

  async listRecentByBuyer(buyerId: string, max = 25): Promise<Call[]> {
    const snap = await getDocs(
      query(
        collection(this.db, COLLECTIONS.CALLS),
        where("buyerId", "==", buyerId),
        orderBy("requestedAt", "desc"),
        fsLimit(max),
      ),
    );
    return snap.docs.map((d) => d.data() as Call);
  }

  async listRecentByAdvisor(advisorId: string, max = 25): Promise<Call[]> {
    const snap = await getDocs(
      query(
        collection(this.db, COLLECTIONS.CALLS),
        where("advisorId", "==", advisorId),
        orderBy("requestedAt", "desc"),
        fsLimit(max),
      ),
    );
    return snap.docs.map((d) => d.data() as Call);
  }
}
