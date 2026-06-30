"use client";

import {
  type ConfirmationResult,
  type User as FbUser,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as fbSignOut,
} from "firebase/auth";
import type {
  AuthService,
  AuthUser,
  OtpChallenge,
} from "@core/application/ports";
import { isRole, type Role } from "@core/domain/value-objects/role";
import { getFirebaseClient } from "../firebase/client";

/**
 * Firebase implementation of the AuthService port.
 *
 * Role resolution: the custom claim `role` is authoritative (set server-side via
 * the Admin SDK / a Cloud Function on account creation). New phone signups with
 * no claim yet default to "buyer" — matching the buyer-first onboarding flow.
 */
export class FirebaseAuthService implements AuthService {
  private cachedUser: AuthUser | null = null;
  // signInWithPhoneNumber returns a ConfirmationResult we must keep to confirm.
  private pendingConfirmations = new Map<string, ConfirmationResult>();

  // No work in the constructor: cachedUser is populated by onChange (wired by
  // AuthProvider), so this class never subscribes without a matching unsubscribe.

  current(): AuthUser | null {
    return this.cachedUser;
  }

  onChange(cb: (user: AuthUser | null) => void): () => void {
    const { auth } = getFirebaseClient();
    return onAuthStateChanged(auth, async (fb) => {
      this.cachedUser = fb ? await this.toAuthUser(fb) : null;
      cb(this.cachedUser);
    });
  }

  async sendPhoneOtp(phone: string, verifier: unknown): Promise<OtpChallenge> {
    const { auth } = getFirebaseClient();
    const result = await signInWithPhoneNumber(
      auth,
      phone,
      verifier as RecaptchaVerifier,
    );
    const verificationId = result.verificationId;
    this.pendingConfirmations.set(verificationId, result);
    return { verificationId };
  }

  async confirmPhoneOtp(
    challenge: OtpChallenge,
    code: string,
  ): Promise<AuthUser> {
    const confirmation = this.pendingConfirmations.get(challenge.verificationId);
    if (!confirmation) {
      throw new Error("OTP challenge expired or not found. Request a new code.");
    }
    const cred = await confirmation.confirm(code);
    this.pendingConfirmations.delete(challenge.verificationId);
    return this.toAuthUser(cred.user);
  }

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const { auth } = getFirebaseClient();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return this.toAuthUser(cred.user);
  }

  async signOut(): Promise<void> {
    const { auth } = getFirebaseClient();
    await fbSignOut(auth);
    this.cachedUser = null;
  }

  /** Build the typed AuthUser, reading the role custom claim. */
  private async toAuthUser(fb: FbUser): Promise<AuthUser> {
    const token = await fb.getIdTokenResult();
    const claimRole = token.claims.role;
    const role: Role = isRole(claimRole) ? claimRole : "buyer";
    return {
      uid: fb.uid,
      role,
      displayName: fb.displayName ?? undefined,
      email: fb.email ?? undefined,
      phone: fb.phoneNumber ?? undefined,
    };
  }
}

/**
 * Helper to build a Firebase RecaptchaVerifier for phone auth, kept here so the
 * provider/UI doesn't import firebase/auth directly.
 */
export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  const { auth } = getFirebaseClient();
  return new RecaptchaVerifier(auth, containerId, { size: "invisible" });
}
