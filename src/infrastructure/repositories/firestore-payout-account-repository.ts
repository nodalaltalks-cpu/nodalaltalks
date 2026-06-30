import { type Firestore, doc, getDoc, setDoc } from "firebase/firestore";
import type {
  PayoutAccount,
  PayoutAccountRepository,
} from "@core/application/ports";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefined } from "../firebase/doc-helpers";

/**
 * Firestore adapter for payout_accounts/{advisorId} — PRIVATE bank details,
 * never stored on the public advisor profile (see firestore.rules).
 */
export class FirestorePayoutAccountRepository
  implements PayoutAccountRepository
{
  constructor(private readonly db: Firestore) {}

  private ref(advisorId: string) {
    return doc(this.db, COLLECTIONS.PAYOUT_ACCOUNTS, advisorId);
  }

  async upsert(account: PayoutAccount): Promise<void> {
    await setDoc(this.ref(account.advisorId), pruneUndefined({ ...account }), {
      merge: true,
    });
  }

  async get(advisorId: string): Promise<PayoutAccount | null> {
    const snap = await getDoc(this.ref(advisorId));
    return snap.exists() ? (snap.data() as PayoutAccount) : null;
  }
}
