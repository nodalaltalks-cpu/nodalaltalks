import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — themed to the prototypes. Primary = ink fill that warms to amber on
 * hover (the signature interaction across every approved screen).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[11px] font-display font-extrabold transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:-translate-y-0.5 hover:bg-amber hover:text-ink hover:shadow-[0_10px_30px_rgba(245,158,11,.3)]",
        outline:
          "border-[1.5px] border-[color:var(--border-2)] bg-white text-muted-foreground hover:border-ink hover:text-ink",
        ghost: "text-muted-foreground hover:bg-surface hover:text-ink",
      },
      size: {
        md: "px-7 py-3.5 text-sm",
        sm: "px-4 py-2 text-[13px]",
        block: "w-full px-7 py-3.5 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
