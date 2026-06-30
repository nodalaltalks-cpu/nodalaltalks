"use client";

import { useMutation } from "@tanstack/react-query";
import {
  submitAdvisorApplication,
  type SubmitAdvisorApplicationInput,
  type SubmitAdvisorApplicationResult,
} from "@core/application/use-cases/submit-advisor-application";
import { buildAdvisorOnboardingDeps } from "@infra/composition";
import { useAuth } from "@/presentation/providers/auth-provider";

/**
 * Mutation hook for the onboarding form. Resolves the current user from auth,
 * builds the use-case deps from the composition root, and runs the use case.
 * The form depends only on this hook — never on Firebase or the use case wiring.
 */
export function useSubmitAdvisorApplication() {
  const { user } = useAuth();

  return useMutation<
    SubmitAdvisorApplicationResult,
    Error,
    SubmitAdvisorApplicationInput
  >({
    mutationFn: async (input) => {
      if (!user) {
        throw new Error("Please sign in before submitting your application.");
      }
      return submitAdvisorApplication(user, input, buildAdvisorOnboardingDeps());
    },
  });
}
