import {
  type Firestore,
  collection,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import type { NotificationRepository } from "@core/application/ports";
import type { Notification } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";

/** Client-side notifications/{id} — the recipient's inbox. Security Rules deny
 *  client create; `markRead` is the only client write, and only for `read`. */
export class FirestoreNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Firestore) {}

  async create(): Promise<void> {
    throw new Error("Notifications are created server-side only.");
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
