import "server-only";
import type { SystemSettingsRepository } from "@core/application/ports";
import type { SystemSettings } from "@core/domain/entities";
import { DEFAULT_SYSTEM_SETTINGS } from "@core/domain/entities";
import { getFirebaseAdmin } from "../firebase/admin";
import { COLLECTIONS } from "../firebase/collections";

const DOC_ID = "global";

/** Admin-SDK system_settings/global — read from server-only use cases (endCall,
 *  the recharge route's bounds check). */
export class AdminSystemSettingsRepository implements SystemSettingsRepository {
  private readonly db = getFirebaseAdmin().db;

  async get(): Promise<SystemSettings> {
    const snap = await this.db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc(DOC_ID).get();
    if (!snap.exists) return DEFAULT_SYSTEM_SETTINGS;
    return { ...DEFAULT_SYSTEM_SETTINGS, ...snap.data() } as SystemSettings;
  }

  async update(patch: Partial<SystemSettings>, updatedBy: string): Promise<void> {
    await this.db
      .collection(COLLECTIONS.SYSTEM_SETTINGS)
      .doc(DOC_ID)
      .set({ ...patch, updatedAt: Date.now(), updatedBy }, { merge: true });
  }
}
