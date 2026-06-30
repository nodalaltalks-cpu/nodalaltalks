"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthService, AuthUser } from "@core/application/ports";
import { FirebaseAuthService } from "@infra/auth/firebase-auth-service";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /**
   * The underlying service, for OTP / email sign-in flows in feature screens.
   * Null during server render; populated on the client after mount.
   */
  auth: AuthService | null;
  signOut: () => Promise<void>;
}

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

  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      auth,
      signOut: async () => {
        await auth?.signOut();
      },
    }),
    [user, loading, auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
