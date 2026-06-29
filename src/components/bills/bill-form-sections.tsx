"use client";

import type { AssetDescriptor } from "@/features/assets/types";
import type { AllocationFormStrategy } from "@/features/bills/allocation-form";
import { useLocalization } from "@/features/localization/provider";

import { ALLOCATION_STRATEGIES, type BillDraft } from "./bill-form-model";
import { BillFormChoiceCard, BillFormField } from "./bill-form-controls";

const STRATEGY_KEYS = {
  custom: {
    label: "bill.allocation.custom.label",
    description: "bill.allocation.custom.description",
  },
  equal: {
    label: "bill.allocation.equal.label",
    description: "bill.allocation.equal.description",
  },
  percentage: {
    label: "bill.allocation.percentage.label",
    description: "bill.allocation.percentage.description",
  },
  shares: {
    label: "bill.allocation.shares.label",
    description: "bill.allocation.shares.description",
  },
} as const;

export function AssetSelection({
  assets,
  selectedAsset,
  onSelect,
}: {
  assets: readonly AssetDescriptor[];
  selectedAsset: AssetDescriptor;
  onSelect(asset: AssetDescriptor): void;
}) {
  const { t } = useLocalization();

  return (
    <fieldset className="mt-8">
      <legend className="text-sm font-semibold">{t("bill.asset.legend")}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {assets.map((asset) => {
          const network = asset.network === "mainnet" ? "Mainnet" : "Testnet";
          return (
            <BillFormChoiceCard
              key={asset.id}
              name="settlementAsset"
              value={asset.id}
              checked={asset.id === selectedAsset.id}
              label={asset.symbol}
              description={
                asset.assetType === "native"
                  ? t("bill.asset.xrp", { network })
                  : t("bill.asset.rlusd", { network })
              }
              detail={
                asset.assetType === "issued"
                  ? t("bill.asset.issuer", { issuer: asset.issuer })
                  : null
              }
              onChange={() => onSelect(asset)}
            />
          );
        })}
      </div>
      {selectedAsset.assetType === "issued" && (
        <p className="mt-3 rounded-lg border border-action/25 bg-action/10 p-4 text-sm leading-6">
          {t("bill.asset.rlusdNotice")}
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
  const { t } = useLocalization();

  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <BillFormField
        label={t("bill.field.title")}
        value={draft.title}
        onChange={(value) => onChange("title", value)}
        placeholder="XRPL Meetup Dinner"
        required
      />
      <BillFormField
        label={t("bill.field.destination")}
        value={draft.destinationAddress}
        onChange={(value) => onChange("destinationAddress", value)}
        placeholder="r..."
        required
        mono
      />
      <BillFormField
        label={t("bill.field.total")}
        value={draft.totalAmount}
        onChange={(value) => onChange("totalAmount", value)}
        placeholder="10"
        required
        suffix={assetSymbol}
        inputMode="decimal"
      />
      <BillFormField
        label={t("bill.field.creatorShare")}
        value={draft.creatorShareAmount}
        onChange={(value) => onChange("creatorShareAmount", value)}
        placeholder="2"
        required
        suffix={assetSymbol}
        inputMode="decimal"
      />
      <BillFormField
        label={t("bill.field.destinationTag")}
        value={draft.destinationTag}
        onChange={(value) => onChange("destinationTag", value)}
        placeholder={t("bill.field.optional")}
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
  const { t } = useLocalization();

  return (
    <fieldset className="mt-10">
      <legend className="font-heading text-xl font-semibold">
        {t("bill.allocation.method")}
      </legend>
      <p className="mt-1 text-sm text-muted">
        {t("bill.allocation.description")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ALLOCATION_STRATEGIES.map((strategy) => {
          const keys = STRATEGY_KEYS[strategy.id];
          return (
            <BillFormChoiceCard
              key={strategy.id}
              name="allocationStrategy"
              value={strategy.id}
              checked={selected === strategy.id}
              label={t(keys.label)}
              description={t(keys.description)}
              onChange={() => onSelect(strategy.id)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
