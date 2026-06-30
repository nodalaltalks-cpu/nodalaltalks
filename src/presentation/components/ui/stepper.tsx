import { cn } from "@/lib/utils";

export interface Step {
  n: number;
  label: string;
}

/** Horizontal progress stepper — mirrors the onboarding prototype's header. */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <div className="flex items-center justify-center overflow-x-auto">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex flex-shrink-0 items-center">
            <div className="flex items-center gap-2.5 px-3.5 py-4">
              <div
                className={cn(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 font-display text-[13px] font-bold transition-all",
                  done && "border-green bg-green text-white",
                  active && "border-ink bg-ink text-white",
                  !done && !active && "border-[color:var(--border-2)] text-soft",
                )}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-semibold transition-all",
                  done && "text-green",
                  active && "text-ink",
                  !done && !active && "text-soft",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-9 flex-shrink-0",
                  done ? "bg-green" : "bg-[color:var(--border-2)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
