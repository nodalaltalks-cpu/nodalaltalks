import {
  type Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { AdvisorProfileRepository } from "@core/application/ports";
import type { AdvisorProfile } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefined } from "../firebase/doc-helpers";

/** Firestore adapter for advisor_profiles/{advisorId}. */
export class FirestoreAdvisorProfileRepository
  implements AdvisorProfileRepository
{
  constructor(private readonly db: Firestore) {}

  private ref(advisorId: string) {
    return doc(this.db, COLLECTIONS.ADVISOR_PROFILES, advisorId);
  }

  async create(profile: AdvisorProfile): Promise<void> {
    await setDoc(this.ref(profile.advisorId), pruneUndefined({ ...profile }));
  }

  async get(advisorId: string): Promise<AdvisorProfile | null> {
    const snap = await getDoc(this.ref(advisorId));
    return snap.exists() ? (snap.data() as AdvisorProfile) : null;
  }

  async update(advisorId: string, patch: Partial<AdvisorProfile>): Promise<void> {
    await updateDoc(
      this.ref(advisorId),
      pruneUndefined({ ...patch, updatedAt: Date.now() }),
    );
  }
}
