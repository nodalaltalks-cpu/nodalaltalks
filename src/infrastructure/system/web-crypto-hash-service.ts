import type { HashService } from "@core/application/ports";

/**
 * Web Crypto SHA-256 — works unchanged in the browser (advisor onboarding
 * runs client-side) and in Node (globalThis.crypto has been stable since
 * Node 19), so this needs no environment branching.
 */
export class WebCryptoHashService implements HashService {
  async sha256(bytes: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

export const hashService = new WebCryptoHashService();
