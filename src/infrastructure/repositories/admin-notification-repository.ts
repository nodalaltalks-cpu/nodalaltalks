import "server-only";
import type { NotificationRepository } from "@core/application/ports";
import type { Notification } from "@core/domain/entities";
import { getFirebaseAdmin } from "../firebase/admin";
import { COLLECTIONS } from "../firebase/collections";

/** Admin-SDK notifications/{id} — the only path that can create one (Security
 *  Rules deny client create). Reads/markRead go through the client adapter. */
export class AdminNotificationRepository implements NotificationRepository {
  private readonly db = getFirebaseAdmin().db;

  async create(notification: Notification): Promise<void> {
    await this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notification.id).set(notification);
  }

  async listByUser(userId: string, max = 25): Promise<Notification[]> {
    const snap = await this.db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(max)
      .get();
    return snap.docs.map((d) => d.data() as Notification);
  }

  async markRead(notificationId: string): Promise<void> {
    await this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({ read: true });
  }
}
