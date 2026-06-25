"use client";

import type { AssetDescriptor } from "@/features/assets/types";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";

import {
  ALLOCATION_STRATEGIES,
  type BillDraft,
} from "./bill-form-model";
import {
  BillFormChoiceCard,
  BillFormField,
} from "./bill-form-controls";

export function AssetSelection({
  assets,
  selectedAsset,
  onSelect,
}: {
  assets: readonly AssetDescriptor[];
  selectedAsset: AssetDescriptor;
  onSelect(asset: AssetDescriptor): void;
}) {
  return (
    <fieldset className="mt-8">
      <legend className="text-sm font-semibold">Settlement Asset</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {assets.map((asset) => (
          <BillFormChoiceCard
            key={asset.id}
            name="settlementAsset"
            value={asset.id}
            checked={asset.id === selectedAsset.id}
            label={asset.symbol}
            description={
              asset.assetType === "native"
                ? "Native XRP on XRPL Testnet"
                : "Official Ripple USD issued on XRPL Testnet"
            }
            detail={
              asset.assetType === "issued" ? `Issuer ${asset.issuer}` : null
            }
            onChange={() => onSelect(asset)}
          />
        ))}
      </div>
      {selectedAsset.assetType === "issued" && (
        <p className="mt-3 rounded-lg border border-action/25 bg-action/10 p-4 text-sm leading-6">
          The destination account must be ready to receive official RLUSD. The
          issuer and amount will be frozen with every participant slot.
        </p>
      )}
    </fieldset>
  );
}

export function BillIdentityFields({
  draft,
  assetSymbol,
  onChange,
}: {
  draft: BillDraft;
  assetSymbol: string;
  onChange(
    field:
      | "title"
      | "destinationAddress"
      | "destinationTag"
      | "totalAmount"
      | "creatorShareAmount",
    value: string,
  ): void;
}) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <BillFormField
        label="Bill title"
        value={draft.title}
        onChange={(value) => onChange("title", value)}
        placeholder="XRPL Meetup Dinner"
        required
      />
      <BillFormField
        label="Creator destination address"
        value={draft.destinationAddress}
        onChange={(value) => onChange("destinationAddress", value)}
        placeholder="r..."
        required
        mono
      />
      <BillFormField
        label="Total"
        value={draft.totalAmount}
        onChange={(value) => onChange("totalAmount", value)}
        placeholder="10"
        required
        suffix={assetSymbol}
        inputMode="decimal"
      />
      <BillFormField
        label="Creator share"
        value={draft.creatorShareAmount}
        onChange={(value) => onChange("creatorShareAmount", value)}
        placeholder="2"
        required
        suffix={assetSymbol}
        inputMode="decimal"
      />
      <BillFormField
        label="Destination Tag"
        value={draft.destinationTag}
        onChange={(value) => onChange("destinationTag", value)}
        placeholder="Optional"
        inputMode="numeric"
      />
    </div>
  );
}

export function AllocationSelection({
  selected,
  onSelect,
}: {
  selected: AllocationFormStrategy;
  onSelect(strategy: AllocationFormStrategy): void;
}) {
  return (
    <fieldset className="mt-10">
      <legend className="font-heading text-xl font-semibold">
        Allocation method
      </legend>
      <p className="mt-1 text-sm text-muted">
        The server recomputes the final obligations before the Bill is frozen.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ALLOCATION_STRATEGIES.map((strategy) => (
          <BillFormChoiceCard
            key={strategy.id}
            name="allocationStrategy"
            value={strategy.id}
            checked={selected === strategy.id}
            label={strategy.label}
            description={strategy.description}
            onChange={() => onSelect(strategy.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}
