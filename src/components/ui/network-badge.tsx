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
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] sm:px-3 sm:text-xs sm:tracking-[0.12em]",
        isMainnet
          ? "border-warning/35 bg-warning-subtle text-foreground"
          : "border-brand/15 bg-brand-subtle text-brand",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full sm:size-2",
          isMainnet ? "bg-warning" : "bg-brand",
        )}
      />
      {isMainnet ? "Mainnet · live" : "Testnet"}
    </span>
  );
}
