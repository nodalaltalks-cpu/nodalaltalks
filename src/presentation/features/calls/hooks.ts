"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestCall } from "@core/application/use-cases/calls";
import type { EndCallReason } from "@core/application/use-cases/calls";
import { buildCallDeps, buildCallReader } from "@infra/composition";
import { getFirebaseClient } from "@infra/firebase/client";
import { useAuth } from "@/presentation/providers/auth-provider";

/** Requests + auto-connects a call with an advisor (placeholder provider). */
export function useRequestCall() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (advisorId: string) => {
      if (!user) throw new Error("Sign in to start a call.");
      return requestCall(user, { advisorId }, buildCallDeps());
    },
  });
}

/** Polls the call read-model — cheap, bounded-duration alternative to a live
 *  listener for something only one active screen ever watches. */
export function useCall(callId: string | undefined) {
  return useQuery({
    queryKey: ["call", callId],
    enabled: !!callId,
    refetchInterval: (query) => (query.state.data?.status === "started" ? 4000 : false),
    queryFn: () => buildCallReader().get(callId!),
  });
}

/** Ends the call via the server route — the only path allowed to bill it. */
export function useEndCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ callId, reason }: { callId: string; reason: EndCallReason }) => {
      const { auth } = getFirebaseClient();
      const current = auth.currentUser;
      if (!current) throw new Error("Session expired.");
      const token = await current.getIdToken();

      const res = await fetch(`/api/calls/${callId}/end`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        durationSec?: number;
        amountChargedPaise?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not end call.");
      return data;
    },
    onSuccess: (_data, { callId }) => {
      qc.invalidateQueries({ queryKey: ["call", callId] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
