import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { AdvisorProfileRepository } from "@core/application/ports";
import type { AdvisorProfile, AdvisorStatus } from "@core/domain/entities";
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

  async listByStatus(statuses: AdvisorStatus[]): Promise<AdvisorProfile[]> {
    if (statuses.length === 0) return [];
    const snap = await getDocs(
      query(
        collection(this.db, COLLECTIONS.ADVISOR_PROFILES),
        where("status", "in", statuses.slice(0, 10)),
      ),
    );
    return snap.docs.map((d) => d.data() as AdvisorProfile);
  }
}
