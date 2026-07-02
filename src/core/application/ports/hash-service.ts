/**
 * Content hashing — the basis for future duplicate-document detection
 * ("Intelligence Ready Documents" in the standing brief). Injected rather
 * than calling the Web Crypto API inline, same reasoning as Clock/IdGenerator:
 * keeps use cases pure and testable with deterministic fakes.
 */
export interface HashService {
  /** Lowercase hex SHA-256 digest of the given bytes. */
  sha256(bytes: ArrayBuffer): Promise<string>;
}
