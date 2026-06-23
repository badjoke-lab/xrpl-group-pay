import { cn } from "@/lib/cn";

export type AppNetwork = "testnet" | "mainnet";

type NetworkBadgeProps = {
  network: AppNetwork;
  className?: string;
};

export function NetworkBadge({ network, className }: NetworkBadgeProps) {
  const isMainnet = network === "mainnet";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        isMainnet
          ? "border-warning/35 bg-warning-subtle text-foreground"
          : "border-brand/15 bg-brand-subtle text-brand",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          isMainnet ? "bg-warning" : "bg-brand",
        )}
      />
      {isMainnet ? "Mainnet · real XRP" : "Testnet"}
    </span>
  );
}
