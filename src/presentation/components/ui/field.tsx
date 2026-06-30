import * as React from "react";
import { cn } from "@/lib/utils";

/** Label + control + inline error/hint, matching the prototype field styling. */
export function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label className="mb-2 block text-xs font-bold tracking-[.2px] text-ink">
          {label}
          {required && <span className="ml-0.5 text-rose">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[11.5px] font-medium text-rose">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-soft">{hint}</p>
      ) : null}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
