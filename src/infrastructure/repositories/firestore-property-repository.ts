import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { PropertyRepository } from "@core/application/ports";
import type { Property } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefined } from "../firebase/doc-helpers";

/** Firestore adapter for properties/{propertyId}. */
export class FirestorePropertyRepository implements PropertyRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return collection(this.db, COLLECTIONS.PROPERTIES);
  }

  async create(property: Property): Promise<void> {
    await setDoc(doc(this.col(), property.id), pruneUndefined({ ...property }));
  }

  async get(propertyId: string): Promise<Property | null> {
    const snap = await getDoc(doc(this.col(), propertyId));
    return snap.exists() ? (snap.data() as Property) : null;
  }

  async listByAdvisor(advisorId: string): Promise<Property[]> {
    const snap = await getDocs(
      query(this.col(), where("advisorId", "==", advisorId)),
    );
    return snap.docs.map((d) => d.data() as Property);
  }
}
