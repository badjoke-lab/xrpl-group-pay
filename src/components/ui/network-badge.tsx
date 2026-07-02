import type { HTMLAttributes } from "react";
import { FlaskConical, RadioTower } from "lucide-react";

import { cn } from "@/lib/cn";

export type AppNetwork = "testnet" | "mainnet";

export type NetworkBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  network: AppNetwork;
  label?: string;
};

export function NetworkBadge({
  network,
  label,
  className,
  ...props
}: NetworkBadgeProps) {
  const isMainnet = network === "mainnet";
  const Icon = isMainnet ? RadioTower : FlaskConical;

  return (
    <span
      data-network={network}
      className={cn(
        "inline-flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-1 text-xs font-bold leading-none",
        isMainnet
          ? "border-warning/40 bg-warning-subtle text-foreground"
          : "border-brand/20 bg-brand-subtle text-brand",
        className,
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-3.5 shrink-0",
          isMainnet ? "text-warning" : "text-brand",
        )}
      />
      <span>{label ?? (isMainnet ? "Mainnet · live" : "Testnet")}</span>
    </span>
  );
}
