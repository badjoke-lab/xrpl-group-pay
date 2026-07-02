import type { HTMLAttributes, ReactNode } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";

export type SemanticStatusFamily =
  | "neutral"
  | "in_progress"
  | "complete"
  | "action_required"
  | "destructive";

const familyConfig: Record<
  SemanticStatusFamily,
  {
    icon: LucideIcon;
    badge: string;
    iconClassName: string;
    accent: string;
  }
> = {
  neutral: {
    icon: Circle,
    badge: "border-border bg-surface-subtle text-muted",
    iconClassName: "text-muted",
    accent: "border-l-border",
  },
  in_progress: {
    icon: LoaderCircle,
    badge: "border-brand/20 bg-brand-subtle text-brand",
    iconClassName: "text-brand",
    accent: "border-l-brand",
  },
  complete: {
    icon: CheckCircle2,
    badge: "border-success/25 bg-success-subtle text-success",
    iconClassName: "text-success",
    accent: "border-l-success",
  },
  action_required: {
    icon: TriangleAlert,
    badge: "border-warning/35 bg-warning-subtle text-foreground",
    iconClassName: "text-warning",
    accent: "border-l-warning",
  },
  destructive: {
    icon: CircleAlert,
    badge: "border-danger/25 bg-danger/10 text-danger",
    iconClassName: "text-danger",
    accent: "border-l-danger",
  },
};

export type StatusBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  family: SemanticStatusFamily;
  label: string;
  icon?: LucideIcon;
  animated?: boolean;
};

export function StatusBadge({
  family,
  label,
  icon,
  animated = false,
  className,
  ...props
}: StatusBadgeProps) {
  const config = familyConfig[family];
  const Icon = icon ?? config.icon;

  return (
    <span
      data-semantic-family={family}
      className={cn(
        "inline-flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-1 text-xs font-bold leading-none",
        config.badge,
        className,
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-3.5 shrink-0",
          config.iconClassName,
          animated && family === "in_progress" && "animate-spin",
        )}
      />
      <span>{label}</span>
    </span>
  );
}

export type CardAccentProps = HTMLAttributes<HTMLDivElement> & {
  family: SemanticStatusFamily;
  children: ReactNode;
};

export function CardAccent({
  family,
  children,
  className,
  ...props
}: CardAccentProps) {
  return (
    <div
      data-semantic-family={family}
      className={cn(
        "border-l-2",
        familyConfig[family].accent,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function semanticFamilyForRecoveryDisposition(
  disposition:
    | "safe_retry"
    | "wait_recheck"
    | "setup_required"
    | "review_required"
    | "already_paid"
    | "terminal",
): SemanticStatusFamily {
  switch (disposition) {
    case "safe_retry":
    case "setup_required":
    case "review_required":
      return "action_required";
    case "wait_recheck":
      return "in_progress";
    case "already_paid":
      return "complete";
    case "terminal":
      return "destructive";
  }
}
