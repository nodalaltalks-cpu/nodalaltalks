"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  registerBuyer,
  type RegisterBuyerInput,
} from "@core/application/use-cases/register-buyer";
import { buildBuyerDeps, buildReviewReaders } from "@infra/composition";
import { useAuth } from "@/presentation/providers/auth-provider";

/** Completes buyer signup after OTP auth. */
export function useRegisterBuyer() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: RegisterBuyerInput) => {
      if (!user) throw new Error("Verify your phone number first.");
      return registerBuyer(user, input, buildBuyerDeps());
    },
  });
}

/** Public directory of active advisors (highest-rated first). */
export function useActiveAdvisors() {
  return useQuery({
    queryKey: ["advisors", "active"],
    queryFn: () => buildReviewReaders().advisors.listActive(50),
  });
}

/** One advisor's public profile + their primary claimed property. */
export function useAdvisorProfile(advisorId: string) {
  return useQuery({
    queryKey: ["advisors", "profile", advisorId],
    queryFn: async () => {
      const { advisors, properties } = buildReviewReaders();
      const [profile, props] = await Promise.all([
        advisors.get(advisorId),
        properties.listByAdvisor(advisorId),
      ]);
      return { profile, property: props[0] ?? null };
    },
  });
}
