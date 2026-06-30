/**
 * File storage abstraction. The Firebase Storage adapter implements it; use
 * cases depend only on this port. `Blob` is a web standard available in both
 * the browser and Node 18+, so the domain stays platform-neutral.
 */
export interface StoredFile {
  /** Storage path the object was written to. */
  path: string;
  /** A download URL (may be a short-lived signed URL depending on adapter). */
  url: string;
}

export interface StorageService {
  upload(
    path: string,
    data: Blob,
    opts?: { contentType?: string },
  ): Promise<StoredFile>;
  getDownloadUrl(path: string): Promise<string>;
  delete(path: string): Promise<void>;
}
