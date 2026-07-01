"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildReviewReaders } from "@infra/composition";
import { getFirebaseClient } from "@infra/firebase/client";

export interface SubmitReviewPayload {
  callId: string;
  rating: number;
  confidenceShift?: "more" | "same" | "less";
  concernTags?: string[];
  comment?: string;
}

/** Public review list for an advisor's profile. */
export function useAdvisorReviews(advisorId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "advisor", advisorId],
    enabled: !!advisorId,
    queryFn: () => buildReviewReaders().reviews.listByAdvisor(advisorId!),
  });
}

/** Whether the current buyer has already reviewed this call — gates the prompt. */
export function useReviewForCall(callId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "call", callId],
    enabled: !!callId,
    queryFn: () => buildReviewReaders().reviews.getByCall(callId!),
  });
}

/** Submits via the server route — the only path that can fold a rating into
 *  the advisor's cached ratingAvg/ratingCount. */
export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitReviewPayload) => {
      const { auth } = getFirebaseClient();
      const current = auth.currentUser;
      if (!current) throw new Error("Session expired.");
      const token = await current.getIdToken();

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { review?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit review.");
      return data;
    },
    onSuccess: (_data, { callId }) => {
      qc.invalidateQueries({ queryKey: ["reviews", "call", callId] });
    },
  });
}
