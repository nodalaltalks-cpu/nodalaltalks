"use client";

import { useQuery } from "@tanstack/react-query";
import { buildReviewReaders } from "@infra/composition";
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
