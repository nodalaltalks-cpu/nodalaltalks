import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-[18px] rounded-lg border-[1.5px] border-border bg-white p-8 shadow-sh",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-2 text-sm font-bold text-ink">
      {icon && (
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-ink text-[13px]">
          {icon}
        </span>
      )}
      {children}
    </div>
  );
}
