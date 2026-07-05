"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildCallReader, buildReviewReaders, buildWalletReader } from "@infra/composition";
import { useAuth } from "@/presentation/providers/auth-provider";

/** The signed-in user's own advisor profile (any status — rules allow self-read). */
export function useOwnAdvisorProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["advisor", "self", user?.uid ?? "none"],
    enabled: !!user,
    queryFn: () => buildReviewReaders().advisors.get(user!.uid),
  });
}

/** Flip the online/offline switch. Rules only allow this while status is active. */
export function useSetAvailability() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isAvailable: boolean) => {
      if (!user) throw new Error("Sign in first.");
      return buildReviewReaders().advisors.update(user.uid, {
        isAvailable,
        lastOnlineAt: Date.now(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advisor", "self", user?.uid ?? "none"] });
      qc.invalidateQueries({ queryKey: ["advisors", "active"] });
    },
  });
}

/** Advisor-side call history (rules: participant read; query filters advisorId==self). */
export function useAdvisorCalls(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["advisor", "calls", user?.uid ?? "none"],
    enabled: enabled && !!user,
    queryFn: () => buildCallReader().listRecentByAdvisor(user!.uid),
  });
}

/**
 * Advisor earnings: the immutable advisor_payout transaction lines where this
 * advisor is the owner. Derived, never stored — same discipline as dashboards.
 */
export function useAdvisorEarnings(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["advisor", "earnings", user?.uid ?? "none"],
    enabled: enabled && !!user,
    queryFn: async () => {
      const txns = await buildWalletReader().listTransactions(user!.uid, 100);
      const payouts = txns.filter((t) => t.type === "advisor_payout");
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return {
        payouts,
        lifetimePaise: payouts.reduce((a, t) => a + t.amountPaise, 0),
        thisWeekPaise: payouts
          .filter((t) => t.createdAt >= weekAgo)
          .reduce((a, t) => a + t.amountPaise, 0),
      };
    },
  });
}
