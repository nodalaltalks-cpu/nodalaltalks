"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * File picker styled as the prototype's dashed upload box. Controlled: the
 * parent owns the File in state (so it can be passed to the storage upload).
 */
export function UploadBox({
  label,
  sublabel,
  accept,
  file,
  onPick,
  required,
}: {
  label: string;
  sublabel?: string;
  accept?: string;
  file: File | null;
  onPick: (file: File | null) => void;
  required?: boolean;
}) {
  const id = React.useId();
  return (
    <div>
      <label
        htmlFor={id}
        className={cn(
          "relative block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
          file
            ? "border-green bg-[rgba(16,185,129,.04)]"
            : "border-[color:var(--border-2)] bg-white hover:border-amber hover:bg-[rgba(245,158,11,.03)]",
        )}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <span className="mb-2 block text-2xl">{file ? "✅" : "📂"}</span>
        <div className="font-display text-[15px] font-bold text-ink">
          {file ? file.name : label}
          {required && !file && <span className="ml-0.5 text-rose">*</span>}
        </div>
        <div className="mt-1 text-xs text-soft">
          {file ? `${(file.size / 1024).toFixed(0)} KB · click to replace` : sublabel}
        </div>
      </label>
      {file && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="mt-2 text-[11.5px] font-bold text-rose"
        >
          Remove
        </button>
      )}
    </div>
  );
}
