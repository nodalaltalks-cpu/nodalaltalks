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
import type { WalletRepository } from "@core/application/ports";
import type { Transaction, Wallet } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";

/** Client-side, read-only wallet access (Security Rules permit owner reads). */
export class FirestoreWalletRepository implements WalletRepository {
  constructor(private readonly db: Firestore) {}

  async get(buyerId: string): Promise<Wallet | null> {
    const snap = await getDoc(doc(this.db, COLLECTIONS.WALLETS, buyerId));
    return snap.exists() ? (snap.data() as Wallet) : null;
  }

  async listTransactions(ownerId: string, max = 25): Promise<Transaction[]> {
    const snap = await getDocs(
      query(
        collection(this.db, COLLECTIONS.TRANSACTIONS),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc"),
        fsLimit(max),
      ),
    );
    return snap.docs.map((d) => d.data() as Transaction);
  }
}
