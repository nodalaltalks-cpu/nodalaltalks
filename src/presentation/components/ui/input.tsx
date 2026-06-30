import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-[10px] border-2 border-[color:var(--border-2)] bg-white px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-soft focus:border-amber focus:shadow-[0_0_0_3px_rgba(245,158,11,.1)]";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(base, "min-h-[96px] resize-y leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, "appearance-none pr-10", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
