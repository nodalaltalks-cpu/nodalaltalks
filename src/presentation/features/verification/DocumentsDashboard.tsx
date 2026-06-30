"use client";

import { useState } from "react";
import { isStaffRole } from "@core/domain/value-objects/role";
import { useAuth } from "@/presentation/providers/auth-provider";
import { VerificationQueue } from "./VerificationQueue";
import { ReviewWorkbench } from "./ReviewWorkbench";
import { useReviewActions } from "./hooks";

/**
 * Documents Dashboard container. Toggles between the queue and a per-advisor
 * review workbench. Access is gated client-side for UX; the real enforcement is
 * the Firestore Security Rules (only staff can read documents / write decisions).
 */
export function DocumentsDashboard() {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  // When opening an advisor, mark verification started (submitted → under_review).
  const { start } = useReviewActions(selected);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-[4%] py-24 text-center text-muted-foreground">Loading…</div>;
  }

  if (!user || !isStaffRole(user.role)) {
    return (
      <div className="mx-auto max-w-md px-[4%] py-24 text-center">
        <h1 className="text-xl font-extrabold">Verifier access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is restricted to the verification team. Sign in with a
          verifier account to continue.
        </p>
      </div>
    );
  }

  const open = (advisorId: string) => {
    setSelected(advisorId);
    start.mutate(advisorId);
  };

  return (
    <div className="mx-auto max-w-5xl px-[4%] py-10">
      {selected ? (
        <ReviewWorkbench advisorId={selected} onBack={() => setSelected(null)} />
      ) : (
        <VerificationQueue onOpen={open} />
      )}
    </div>
  );
}
