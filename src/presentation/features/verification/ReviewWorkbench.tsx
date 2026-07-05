"use client";

import { useState } from "react";
import { activationBlockers } from "@core/application/use-cases/verification";
import type { VerificationDocument } from "@core/domain/entities";
import { formatPaise } from "@core/domain/value-objects/money";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdvisorDossier, useReviewActions } from "./hooks";

const STATUS_BADGE: Record<VerificationDocument["status"], { label: string; cls: string }> = {
  pending_upload: { label: "Pending Upload", cls: "bg-surface-2 text-muted-foreground" },
  uploaded: { label: "Uploaded", cls: "bg-[#EFF6FF] text-[#075985]" },
  under_review: { label: "Under Review", cls: "bg-amber-pale text-[#92400E]" },
  needs_reupload: { label: "Needs Re-upload", cls: "bg-[#FFF7ED] text-[#9A3412]" },
  rejected: { label: "Rejected", cls: "bg-[#FFF1F2] text-[#9F1239]" },
  approved: { label: "Approved", cls: "bg-[#DCFCE7] text-[#065F46]" },
  expired: { label: "Expired", cls: "bg-[#F3F4F6] text-[#6B7280]" },
};

export function ReviewWorkbench({
  advisorId,
  onBack,
}: {
  advisorId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useAdvisorDossier(advisorId);
  const actions = useReviewActions(advisorId);
  const [reason, setReason] = useState<{ docId: string; text: string } | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectText, setRejectText] = useState("");

  if (isLoading || !data?.profile) {
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="text-[13px] font-bold text-muted-foreground">← Back to queue</button>
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  const { profile, property, documents } = data;
  const blockers = activationBlockers(documents);
  const canActivate = blockers.length === 0 && !actions.activate.isPending;

  const decide = (documentId: string, outcome: "approved" | "rejected" | "needs_reupload", text?: string) => {
    actions.decide.mutate({ documentId, outcome, reason: text });
    setReason(null);
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[color:var(--border-2)] bg-white px-3.5 py-2 text-[12.5px] font-bold text-muted-foreground hover:border-ink hover:text-ink">
        ← Back to queue
      </button>

      {/* header */}
      <div className="mb-4 flex items-center gap-4 rounded-lg border-[1.5px] border-border bg-white p-5 shadow-sh">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber to-rose text-2xl font-extrabold text-white">
          {(profile.firstName[0] ?? "") + (profile.lastName[0] ?? "")}
        </div>
        <div>
          <h1 className="text-xl font-extrabold">{profile.firstName} {profile.lastName}</h1>
          <p className="text-[13px] text-muted-foreground">
            {property ? <>Claims <b className="text-ink-2">{property.project}</b> · {property.builder} · {property.city}</> : "No property on file"}
          </p>
          <p className="mt-1 text-[12px] text-soft">
            Rate {formatPaise(profile.ratePerMinPaise)}/min · {profile.languages.join(", ")}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-amber-pale px-3 py-1.5 text-[11px] font-bold text-[#92400E]">
          {profile.status}
        </span>
      </div>

      {actions.decide.isError && (
        <p className="mb-3 rounded-lg bg-[#FFF1F2] px-3 py-2 text-[12px] font-semibold text-rose">
          Decision failed: {actions.decide.error?.message} — the document may not have been updated.
        </p>
      )}

      {/* documents */}
      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((doc) => {
          const badge = STATUS_BADGE[doc.status];
          const decided = doc.status === "approved" || doc.status === "rejected";
          return (
            <div key={doc.id} className="rounded-2xl border-[1.5px] border-border bg-white p-4 shadow-sh">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-lg">📄</div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold leading-tight">{doc.name}</div>
                  <div className="break-all text-[11px] text-muted-foreground">{doc.fileName ?? "no file"}</div>
                  <div className="text-[10.5px] text-soft">{doc.group}</div>
                </div>
                <span className={cn("ml-auto flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", badge.cls)}>
                  {badge.label}
                </span>
              </div>

              {doc.notes && (
                <div className="mb-3 rounded-lg bg-amber-pale px-3 py-2 text-[11px] leading-snug text-[#92400E]">
                  <b>Note:</b> {doc.notes}
                </div>
              )}

              {reason?.docId === doc.id ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={reason.text}
                    onChange={(e) => setReason({ docId: doc.id, text: e.target.value })}
                    placeholder="Reason (shared with the advisor)…"
                    className="w-full rounded-lg border-2 border-[color:var(--border-2)] px-3 py-2 text-[12px] outline-none focus:border-rose"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decide(doc.id, "needs_reupload", reason.text)}>Request re-upload</Button>
                    <Button size="sm" variant="outline" className="border-rose text-rose" onClick={() => decide(doc.id, "rejected", reason.text)}>Reject</Button>
                    <button onClick={() => setReason(null)} className="text-[11.5px] font-semibold text-soft">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => decide(doc.id, "approved")}
                    disabled={actions.decide.isPending}
                    className={cn(
                      "rounded-lg border-[1.5px] px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                      doc.status === "approved"
                        ? "border-green bg-green text-white"
                        : "border-green/40 text-green hover:bg-green hover:text-white",
                    )}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setReason({ docId: doc.id, text: "" })}
                    disabled={actions.decide.isPending}
                    className="rounded-lg border-[1.5px] border-[color:var(--border-2)] px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:border-ink"
                  >
                    ✕ Reject / Re-upload
                  </button>
                  {decided && <span className="self-center text-[10.5px] font-semibold text-soft">decided</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* decision bar */}
      <div className="sticky bottom-4 mt-5 rounded-2xl border-[1.5px] border-border bg-white p-5 shadow-sh2">
        <h3 className="text-[15px] font-extrabold">Final decision</h3>
        {blockers.length > 0 ? (
          <ul className="mb-3 mt-1 list-inside list-disc text-[12px] text-muted-foreground">
            {blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        ) : (
          <p className="mb-3 mt-1 text-[12px] font-semibold text-green">
            ✓ All required documents approved — ready to activate.
          </p>
        )}

        {actions.activate.isError && (
          <p className="mb-2 text-[12px] font-semibold text-rose">{actions.activate.error?.message}</p>
        )}

        {rejectMode ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={rejectText}
              onChange={(e) => setRejectText(e.target.value)}
              placeholder="Why is this application rejected?"
              className="w-full rounded-lg border-2 border-[color:var(--border-2)] px-3 py-2 text-[12px] outline-none focus:border-rose"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-rose text-rose"
                disabled={!rejectText.trim() || actions.reject.isPending}
                onClick={() => actions.reject.mutate({ id: advisorId, reason: rejectText.trim() }, { onSuccess: onBack })}
              >
                Confirm rejection
              </Button>
              <button onClick={() => setRejectMode(false)} className="text-[12px] font-semibold text-soft">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!canActivate}
              onClick={() => actions.activate.mutate(advisorId, { onSuccess: onBack })}
            >
              {actions.activate.isPending ? "Activating…" : "✓ Approve & Activate"}
            </Button>
            <Button variant="outline" className="border-rose text-rose" onClick={() => setRejectMode(true)}>
              Reject application
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
