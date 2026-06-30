"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateAdvisor,
  decideDocument,
  rejectAdvisor,
  startVerification,
  type DocumentOutcome,
} from "@core/application/use-cases/verification";
import {
  buildReviewReaders,
  buildVerificationDeps,
} from "@infra/composition";
import { useAuth } from "@/presentation/providers/auth-provider";

const QUEUE_KEY = ["verification", "queue"];
const dossierKey = (advisorId: string) => ["verification", "dossier", advisorId];

/** Pending applications, oldest first (the verifier's work queue). */
export function useVerificationQueue() {
  return useQuery({
    queryKey: QUEUE_KEY,
    queryFn: async () => {
      const { advisors } = buildReviewReaders();
      const list = await advisors.listByStatus(["submitted", "under_review"]);
      return list.sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
    },
  });
}

/** Full dossier for one advisor: profile + claimed property + documents. */
export function useAdvisorDossier(advisorId: string | null) {
  return useQuery({
    queryKey: dossierKey(advisorId ?? "none"),
    enabled: !!advisorId,
    queryFn: async () => {
      const { advisors, documents, properties } = buildReviewReaders();
      const [profile, docs, props] = await Promise.all([
        advisors.get(advisorId!),
        documents.listByAdvisor(advisorId!),
        properties.listByAdvisor(advisorId!),
      ]);
      return { profile, documents: docs, property: props[0] ?? null };
    },
  });
}

/** Verifier review actions. Each invalidates the queue + the open dossier. */
export function useReviewActions(advisorId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUEUE_KEY });
    if (advisorId) qc.invalidateQueries({ queryKey: dossierKey(advisorId) });
  };
  const requireUser = () => {
    if (!user) throw new Error("Sign in as a verifier to review applications.");
    return user;
  };

  const start = useMutation({
    mutationFn: (id: string) =>
      startVerification(id, requireUser(), buildVerificationDeps()),
    onSuccess: invalidate,
  });

  const decide = useMutation({
    mutationFn: (v: { documentId: string; outcome: DocumentOutcome; reason?: string }) =>
      decideDocument(v.documentId, v.outcome, v.reason, requireUser(), buildVerificationDeps()),
    onSuccess: invalidate,
  });

  const activate = useMutation({
    mutationFn: (id: string) =>
      activateAdvisor(id, requireUser(), buildVerificationDeps()),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (v: { id: string; reason: string }) =>
      rejectAdvisor(v.id, v.reason, requireUser(), buildVerificationDeps()),
    onSuccess: invalidate,
  });

  return { start, decide, activate, reject };
}
