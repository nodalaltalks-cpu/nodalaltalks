import {
  type Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { UserRepository } from "@core/application/ports";
import type { User } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefined } from "../firebase/doc-helpers";

/** Firestore adapter for users/{uid}. */
export class FirestoreUserRepository implements UserRepository {
  constructor(private readonly db: Firestore) {}

  private ref(uid: string) {
    return doc(this.db, COLLECTIONS.USERS, uid);
  }

  async create(user: User): Promise<void> {
    await setDoc(this.ref(user.uid), pruneUndefined({ ...user }));
  }

  async get(uid: string): Promise<User | null> {
    const snap = await getDoc(this.ref(uid));
    return snap.exists() ? (snap.data() as User) : null;
  }

  async update(uid: string, patch: Partial<User>): Promise<void> {
    await updateDoc(this.ref(uid), pruneUndefined({ ...patch, updatedAt: Date.now() }));
  }
}
