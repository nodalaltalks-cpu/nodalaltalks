import {
  type Firestore,
  collection,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { NotificationRepository } from "@core/application/ports";
import type { Notification } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefinedDeep } from "../firebase/doc-helpers";

/** Client-side notifications/{id} — the recipient's inbox, plus STAFF-only
 *  creation (Security Rules allow create for staff; verification decisions
 *  notify the advisor straight from the verifier's session). Non-staff
 *  creates are rejected by rules, not by this adapter. */
export class FirestoreNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Firestore) {}

  async create(notification: Notification): Promise<void> {
    await setDoc(
      doc(this.db, COLLECTIONS.NOTIFICATIONS, notification.id),
      pruneUndefinedDeep({ ...notification }),
    );
  }

  async listByUser(userId: string, max = 25): Promise<Notification[]> {
    const snap = await getDocs(
      query(
        collection(this.db, COLLECTIONS.NOTIFICATIONS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        fsLimit(max),
      ),
    );
    return snap.docs.map((d) => d.data() as Notification);
  }

  async markRead(notificationId: string): Promise<void> {
    await updateDoc(doc(this.db, COLLECTIONS.NOTIFICATIONS, notificationId), { read: true });
  }
}
