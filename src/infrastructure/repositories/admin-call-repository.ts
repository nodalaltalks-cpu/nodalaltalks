import "server-only";
import type { CallRepository } from "@core/application/ports";
import type { Call } from "@core/domain/entities";
import { getFirebaseAdmin } from "../firebase/admin";
import { COLLECTIONS } from "../firebase/collections";

/** Admin-SDK calls/{callId} — used by endCall to write the reconciled billing fields. */
export class AdminCallRepository implements CallRepository {
  private readonly db = getFirebaseAdmin().db;

  async create(call: Call): Promise<void> {
    await this.db.collection(COLLECTIONS.CALLS).doc(call.id).set(call);
  }

  async get(callId: string): Promise<Call | null> {
    const snap = await this.db.collection(COLLECTIONS.CALLS).doc(callId).get();
    return snap.exists ? (snap.data() as Call) : null;
  }

  async update(callId: string, patch: Partial<Call>): Promise<void> {
    await this.db
      .collection(COLLECTIONS.CALLS)
      .doc(callId)
      .set({ ...patch, updatedAt: Date.now() }, { merge: true });
  }

  async listRecentByBuyer(buyerId: string, max = 25): Promise<Call[]> {
    const snap = await this.db
      .collection(COLLECTIONS.CALLS)
      .where("buyerId", "==", buyerId)
      .orderBy("requestedAt", "desc")
      .limit(max)
      .get();
    return snap.docs.map((d) => d.data() as Call);
  }

  async listRecentByAdvisor(advisorId: string, max = 25): Promise<Call[]> {
    const snap = await this.db
      .collection(COLLECTIONS.CALLS)
      .where("advisorId", "==", advisorId)
      .orderBy("requestedAt", "desc")
      .limit(max)
      .get();
    return snap.docs.map((d) => d.data() as Call);
  }
}
