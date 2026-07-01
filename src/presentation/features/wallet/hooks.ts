"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EVENT_NAMES } from "@core/domain/events";
import { paiseToRupees } from "@core/domain/value-objects/money";
import { buildWalletReader } from "@infra/composition";
import { getFirebaseClient } from "@infra/firebase/client";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useTrack } from "@/presentation/analytics/use-track";

/** Buyer's wallet balance + recent transactions (read-only). */
export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.uid ?? "none"],
    enabled: !!user,
    queryFn: async () => {
      const r = buildWalletReader();
      const [wallet, txns] = await Promise.all([
        r.get(user!.uid),
        r.listTransactions(user!.uid),
      ]);
      return { wallet, txns };
    },
  });
}

/** Recharge via the server route. Emits wallet_recharge_started client-side; the
 *  server emits wallet_recharged after the verified, atomic credit. */
export function useRecharge() {
  const { user } = useAuth();
  const track = useTrack();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (amountPaise: number) => {
      track(
        EVENT_NAMES.WALLET_RECHARGE_STARTED,
        { actorType: "buyer" },
        { amount: paiseToRupees(amountPaise), method: "placeholder" },
      );
      const { auth } = getFirebaseClient();
      const current = auth.currentUser;
      if (!current) throw new Error("Please sign in to recharge.");
      const token = await current.getIdToken();

      const res = await fetch("/api/wallet/recharge", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountPaise, method: "placeholder" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        balancePaise?: number;
        transactionId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Recharge failed.");
      return data;
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: ["wallet", user.uid] });
    },
  });
}
