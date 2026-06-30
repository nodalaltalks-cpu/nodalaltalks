import {
  type FirebaseStorage,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import type { StorageService, StoredFile } from "@core/application/ports";

/**
 * Firebase Cloud Storage implementation of the StorageService port. Storage
 * Security Rules (storage.rules) enforce who may write where and the size/type
 * limits; this adapter just performs the transfer.
 */
export class FirebaseStorageService implements StorageService {
  constructor(private readonly storage: FirebaseStorage) {}

  async upload(
    path: string,
    data: Blob,
    opts?: { contentType?: string },
  ): Promise<StoredFile> {
    const objectRef = ref(this.storage, path);
    await uploadBytes(objectRef, data, {
      contentType: opts?.contentType,
    });
    const url = await getDownloadURL(objectRef);
    return { path, url };
  }

  async getDownloadUrl(path: string): Promise<string> {
    return getDownloadURL(ref(this.storage, path));
  }

  async delete(path: string): Promise<void> {
    await deleteObject(ref(this.storage, path));
  }
}
