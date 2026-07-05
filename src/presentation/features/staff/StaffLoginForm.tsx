"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isStaffRole } from "@core/domain/value-objects/role";
import { useAuth } from "@/presentation/providers/auth-provider";
import { Button } from "@/presentation/components/ui/button";

/**
 * Staff sign-in (verifier / founder / admin) — email + password via the
 * existing AuthService port. Buyers/advisors never use this page; their
 * accounts have no password, so a sign-in attempt simply fails. After
 * sign-in, routes by role: verifier → documents queue, founder/admin →
 * cockpit, with an optional ?next= override for deep links.
 */
export function StaffLoginForm() {
  const { auth, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already signed in as staff? Go straight to the right console.
  if (user && isStaffRole(user.role)) {
    router.replace(params.get("next") ?? (user.role === "verifier" ? "/verifier/documents" : "/founder"));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setPending(true);
    try {
      const signedIn = await auth.signInWithEmail(email.trim(), password);
      if (!isStaffRole(signedIn.role)) {
        await auth.signOut();
        throw new Error("This account doesn't have staff access.");
      }
      router.replace(
        params.get("next") ?? (signedIn.role === "verifier" ? "/verifier/documents" : "/founder"),
      );
    } catch (err) {
      setError((err as Error).message || "Sign-in failed. Check your email and password.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-[4%] py-20">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber-pale px-3.5 py-1.5 text-[11.5px] font-bold text-[#92400E]">
          🔐 STAFF ONLY
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Team Sign In</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Verification and founder consoles. Buyers &amp; advisors sign in with their phone number instead.
        </p>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border-[1.5px] border-border bg-white p-6 shadow-sh">
        <label className="text-[12.5px] font-bold text-ink-2">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 mt-1.5 w-full rounded-[10px] border-[1.5px] border-[color:var(--border-2)] px-3 py-2.5 text-[14px] outline-none focus:border-amber"
        />
        <label className="text-[12.5px] font-bold text-ink-2">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 mt-1.5 w-full rounded-[10px] border-[1.5px] border-[color:var(--border-2)] px-3 py-2.5 text-[14px] outline-none focus:border-amber"
        />
        {error && <p className="mb-3 text-[12.5px] font-semibold text-rose">{error}</p>}
        <Button type="submit" size="block" disabled={pending || !auth} className="bg-amber text-ink hover:bg-amber-2">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
