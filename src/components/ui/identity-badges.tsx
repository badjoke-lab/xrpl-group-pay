import type { HTMLAttributes } from "react";
import {
  BarChart3,
  Coins,
  Eye,
  FileCheck2,
  Link2,
  ShieldCheck,
  UserRoundCheck,
  UserRoundCog,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import type { Locale } from "@/features/localization/catalog";
import { semanticTranslate } from "@/features/localization/semantic-catalog";
import { cn } from "@/lib/cn";

import {
  StatusBadge,
  type SemanticStatusFamily,
} from "./semantic-status";

type IdentityBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  label: string;
  icon: LucideIcon;
  emphasis?: "neutral" | "brand";
};

function IdentityBadge({
  label,
  icon: Icon,
  emphasis = "neutral",
  className,
  ...props
}: IdentityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-1 text-xs font-bold leading-none",
        emphasis === "brand"
          ? "border-brand/20 bg-brand-subtle text-brand"
          : "border-border bg-surface text-foreground",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export type AssetBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  symbol: string;
  official?: boolean;
  locale?: Locale;
};

export function AssetBadge({
  symbol,
  official = false,
  locale = "en",
  className,
  ...props
}: AssetBadgeProps) {
  const label = official
    ? `${symbol} · ${semanticTranslate(locale, "official")}`
    : symbol;

  return (
    <IdentityBadge
      label={label}
      icon={Coins}
      className={className}
      {...props}
    />
  );
}

export type RoleBadgeRole = "recipient" | "operator" | "payer";

const roleIcons: Record<RoleBadgeRole, LucideIcon> = {
  recipient: UserRoundCheck,
  operator: UserRoundCog,
  payer: WalletCards,
};

export type RoleBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  role: RoleBadgeRole;
  locale?: Locale;
  label?: string;
};

export function RoleBadge({
  role,
  locale = "en",
  label,
  className,
  ...props
}: RoleBadgeProps) {
  return (
    <IdentityBadge
      label={label ?? semanticTranslate(locale, role)}
      icon={roleIcons[role]}
      emphasis="brand"
      className={className}
      {...props}
    />
  );
}

export type LinkType =
  | "management"
  | "read_only"
  | "payment"
  | "progress"
  | "preparation"
  | "proof";

const linkConfig: Record<
  LinkType,
  {
    icon: LucideIcon;
    key:
      | "managementLink"
      | "readOnlyLink"
      | "paymentLink"
      | "progressLink"
      | "preparationLink"
      | "proofLink";
  }
> = {
  management: { icon: UserRoundCog, key: "managementLink" },
  read_only: { icon: Eye, key: "readOnlyLink" },
  payment: { icon: Link2, key: "paymentLink" },
  progress: { icon: BarChart3, key: "progressLink" },
  preparation: { icon: ShieldCheck, key: "preparationLink" },
  proof: { icon: FileCheck2, key: "proofLink" },
};

export type LinkTypeBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  type: LinkType;
  locale?: Locale;
  label?: string;
};

export function LinkTypeBadge({
  type,
  locale = "en",
  label,
  className,
  ...props
}: LinkTypeBadgeProps) {
  const config = linkConfig[type];
  return (
    <IdentityBadge
      label={label ?? semanticTranslate(locale, config.key)}
      icon={config.icon}
      className={className}
      {...props}
    />
  );
}

export type ReadinessBadgeStatus =
  | "ready"
  | "blocked"
  | "unavailable"
  | "checking";

const readinessConfig: Record<
  ReadinessBadgeStatus,
  {
    family: SemanticStatusFamily;
    key:
      | "readinessReady"
      | "readinessBlocked"
      | "readinessUnavailable"
      | "readinessChecking";
  }
> = {
  ready: { family: "complete", key: "readinessReady" },
  blocked: { family: "action_required", key: "readinessBlocked" },
  unavailable: { family: "neutral", key: "readinessUnavailable" },
  checking: { family: "in_progress", key: "readinessChecking" },
};

export type ReadinessBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  status: ReadinessBadgeStatus;
  locale?: Locale;
  label?: string;
};

export function ReadinessBadge({
  status,
  locale = "en",
  label,
  className,
  ...props
}: ReadinessBadgeProps) {
  const config = readinessConfig[status];
  return (
    <StatusBadge
      family={config.family}
      label={label ?? semanticTranslate(locale, config.key)}
      animated={status === "checking"}
      className={className}
      {...props}
    />
  );
}
