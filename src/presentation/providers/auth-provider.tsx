"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthService, AuthUser } from "@core/application/ports";
import type { AdvisorStatus } from "@core/domain/entities";
import { FirebaseAuthService } from "@infra/auth/firebase-auth-service";
import { buildReviewReaders } from "@infra/composition";

/**
 * Advisor is a CAPABILITY of a buyer identity, not an exclusive role: our
 * advisors are, by definition, property buyers — the same person advises on
 * the flat they own while shopping for their next one. The custom-claim
 * `role` is reserved for staff privilege (verifier/founder/admin); whether
 * someone is an advisor is determined by their advisor_profiles doc.
 */
export interface AdvisorCapability {
  /** True once an advisor profile exists AND is active (can take calls). */
  isActiveAdvisor: boolean;
  /** Full lifecycle state, or null if they never applied. */
  advisorStatus: AdvisorStatus | null;
  /** Capability lookup finished (false during the initial fetch). */
  resolved: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  capabilities: AdvisorCapability;
  /**
   * The underlying service, for OTP / email sign-in flows in feature screens.
   * Null during server render; populated on the client after mount.
   */
  auth: AuthService | null;
  signOut: () => Promise<void>;
}

const NO_CAPABILITY: AdvisorCapability = {
  isActiveAdvisor: false,
  advisorStatus: null,
  resolved: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provides auth state via the AuthService port. The Firebase adapter is created
 * only in the browser (guarded against SSR, where the Firebase client SDK must
 * not initialize). Components never import firebase/auth directly.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth] = useState<AuthService | null>(() =>
    typeof window === "undefined" ? null : new FirebaseAuthService(),
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<AdvisorCapability>(NO_CAPABILITY);

  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [auth]);

  // One-shot capability lookup per signed-in uid. Security Rules allow reading
  // your own advisor_profiles doc in any status, so this works pre-activation.
  useEffect(() => {
    if (!user) {
      setCapabilities({ ...NO_CAPABILITY, resolved: true });
      return;
    }
    let active = true;
    setCapabilities(NO_CAPABILITY);
    buildReviewReaders()
      .advisors.get(user.uid)
      .then((profile) => {
        if (!active) return;
        setCapabilities({
          isActiveAdvisor: profile?.status === "active",
          advisorStatus: profile?.status ?? null,
          resolved: true,
        });
      })
      .catch(() => {
        if (active) setCapabilities({ ...NO_CAPABILITY, resolved: true });
      });
    return () => {
      active = false;
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      capabilities,
      auth,
      signOut: async () => {
        await auth?.signOut();
      },
    }),
    [user, loading, capabilities, auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
