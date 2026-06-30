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
import type { DocumentRepository } from "@core/application/ports";
import type { VerificationDocument } from "@core/domain/entities";
import { COLLECTIONS } from "../firebase/collections";
import { pruneUndefined } from "../firebase/doc-helpers";

/** Firestore adapter for documents/{documentId}. */
export class FirestoreDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return collection(this.db, COLLECTIONS.DOCUMENTS);
  }

  async create(d: VerificationDocument): Promise<void> {
    await setDoc(doc(this.col(), d.id), pruneUndefined({ ...d }));
  }

  async get(documentId: string): Promise<VerificationDocument | null> {
    const snap = await getDoc(doc(this.col(), documentId));
    return snap.exists() ? (snap.data() as VerificationDocument) : null;
  }

  async listByAdvisor(advisorId: string): Promise<VerificationDocument[]> {
    const snap = await getDocs(
      query(this.col(), where("advisorId", "==", advisorId)),
    );
    return snap.docs.map((d) => d.data() as VerificationDocument);
  }

  async update(
    documentId: string,
    patch: Partial<VerificationDocument>,
  ): Promise<void> {
    await updateDoc(
      doc(this.col(), documentId),
      pruneUndefined({ ...patch, updatedAt: Date.now() }),
    );
  }
}
