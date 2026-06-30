import type { Role } from "../../domain/value-objects/role";

/**
 * Authentication abstraction. The Firebase adapter (phone OTP for buyers/
 * advisors, email/password for staff) implements this; presentation depends only
 * on the port. Role comes from the authoritative custom claim.
 */
export interface AuthUser {
  uid: string;
  role: Role;
  displayName?: string;
  email?: string;
  phone?: string;
}

/** Opaque handle returned by sendPhoneOtp and passed back to confirm. */
export interface OtpChallenge {
  verificationId: string;
}

export interface AuthService {
  /** Current user, or null if signed out. Synchronous read of cached state. */
  current(): AuthUser | null;

  /** Subscribe to auth state. Returns an unsubscribe function. */
  onChange(cb: (user: AuthUser | null) => void): () => void;

  /**
   * Start phone sign-in. `verifier` is the provider's bot-check widget handle
   * (e.g. a Firebase RecaptchaVerifier); typed as unknown to keep the port clean.
   */
  sendPhoneOtp(phone: string, verifier: unknown): Promise<OtpChallenge>;
  confirmPhoneOtp(challenge: OtpChallenge, code: string): Promise<AuthUser>;

  /** Staff sign-in. */
  signInWithEmail(email: string, password: string): Promise<AuthUser>;

  signOut(): Promise<void>;
}
