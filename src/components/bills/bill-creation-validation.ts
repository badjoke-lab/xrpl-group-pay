import type { AssetDescriptor } from "@/features/assets/types";
import { decimalToUnits } from "@/features/money/money";
import {
  inspectXrplAddressInput,
  isCanonicalClassicAddress,
} from "@/features/xrpl/address-input";

import {
  recipientFundedValue,
  type BillDraft,
} from "./bill-form-model";

export type PayerAddressIssue =
  | "required"
  | "invalid"
  | "recipient_conflict"
  | "duplicate";

function draftNetwork(draft: BillDraft) {
  return draft.settlementAssetId.includes(":mainnet:")
    ? ("mainnet" as const)
    : ("testnet" as const);
}

function positiveUnits(value: string, scale: number): bigint | null {
  try {
    const units = BigInt(decimalToUnits(value, scale));
    return units > 0n ? units : null;
  } catch {
    return null;
  }
}

export function payerAddressIssues(
  draft: BillDraft,
): Record<string, PayerAddressIssue> {
  const result: Record<string, PayerAddressIssue> = {};
  const destination = draft.destinationAddress.trim();
  const counts = new Map<string, number>();

  for (const participant of draft.participants) {
    const address = participant.expectedPayerAddress.trim();
    if (isCanonicalClassicAddress(address)) {
      counts.set(address, (counts.get(address) ?? 0) + 1);
    }
  }

  for (const participant of draft.participants) {
    const address = participant.expectedPayerAddress.trim();
    const inspection = inspectXrplAddressInput({
      value: address,
      network: draftNetwork(draft),
      role: "payer",
    });

    if (!address) {
      result[participant.id] = "required";
    } else if (inspection.status !== "valid_classic") {
      result[participant.id] = "invalid";
    } else if (destination && address === destination) {
      result[participant.id] = "recipient_conflict";
    } else if ((counts.get(address) ?? 0) > 1) {
      result[participant.id] = "duplicate";
    }
  }

  return result;
}

export function recipientFundedAmountIssue(
  draft: BillDraft,
  asset: AssetDescriptor,
): "required" | "not_positive" | "not_less_than_total" | null {
  if (
    draft.paymentMode !== "representative" ||
    !draft.recipientFundedEnabled
  ) {
    return null;
  }

  const funded = positiveUnits(draft.recipientFundedAmount, asset.precision);
  if (!draft.recipientFundedAmount.trim()) return "required";
  if (funded === null) return "not_positive";
  const total = positiveUnits(draft.totalAmount, asset.precision);
  if (total !== null && funded >= total) return "not_less_than_total";
  return null;
}

export function customAmountsArePositive(
  draft: BillDraft,
  asset: AssetDescriptor,
) {
  if (draft.allocationStrategy !== "custom") return true;
  return draft.participants.every(
    (participant) => positiveUnits(participant.amount, asset.precision) !== null,
  );
}

export function expectedPayerTotalIsPositive(
  draft: BillDraft,
  asset: AssetDescriptor,
) {
  const total = positiveUnits(draft.totalAmount, asset.precision);
  if (total === null) return false;
  let funded: bigint;
  try {
    funded = BigInt(decimalToUnits(recipientFundedValue(draft), asset.precision));
  } catch {
    return false;
  }
  return total - funded > 0n;
}

export function billDetailsAreComplete(
  draft: BillDraft,
  asset: AssetDescriptor,
) {
  return Boolean(
    draft.paymentMode &&
      draft.title.trim() &&
      isCanonicalClassicAddress(draft.destinationAddress) &&
      positiveUnits(draft.totalAmount, asset.precision) !== null &&
      recipientFundedAmountIssue(draft, asset) === null &&
      expectedPayerTotalIsPositive(draft, asset),
  );
}
