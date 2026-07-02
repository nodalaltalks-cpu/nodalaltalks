import { type Firestore, doc, getDoc, setDoc } from "firebase/firestore";
import type { SystemSettingsRepository } from "@core/application/ports";
import type { SystemSettings } from "@core/domain/entities";
import { DEFAULT_SYSTEM_SETTINGS } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";

const DOC_ID = "global";

/** Client-side system_settings/global — the founder settings screen. Security
 *  Rules restrict writes to isAdmin(); reads to isStaff(). */
export class FirestoreSystemSettingsRepository implements SystemSettingsRepository {
  constructor(private readonly db: Firestore) {}

  private ref() {
    return doc(this.db, COLLECTIONS.SYSTEM_SETTINGS, DOC_ID);
  }

  async get(): Promise<SystemSettings> {
    const snap = await getDoc(this.ref());
    if (!snap.exists()) return DEFAULT_SYSTEM_SETTINGS;
    return { ...DEFAULT_SYSTEM_SETTINGS, ...snap.data() } as SystemSettings;
  }

  async update(patch: Partial<SystemSettings>, updatedBy: string): Promise<void> {
    await setDoc(
      this.ref(),
      { ...patch, updatedAt: Date.now(), updatedBy },
      { merge: true },
    );
  }
}
