import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-white shadow-sm hover:bg-action-hover active:translate-y-px",
  secondary:
    "border border-border bg-surface text-brand hover:bg-brand-subtle",
  ghost: "text-brand hover:bg-brand-subtle",
  danger: "bg-danger text-white hover:brightness-95",
};

export function buttonStyles({
  variant = "primary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
} = {}) {
  return cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-[background-color,box-shadow,transform] duration-fast ease-standard focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/35 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none",
    variantClasses[variant],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, className })}
      {...props}
    />
  ),
);

Button.displayName = "Button";
