import type { PaymentDetails } from "@/features/bills/payment-details";
import type { PaymentReadinessResponse } from "@/features/xrpl/payment-readiness-contract";

export function readyPaymentReadiness(
  details: PaymentDetails,
): PaymentReadinessResponse {
  const assessedAt = "2026-07-02T00:00:00.000Z";
  const common = {
    strategyId: "xrpl-asset-readiness-v1" as const,
    status: "ready" as const,
    ready: true,
    network: details.network,
    assetId: details.asset.id,
    amountUnits: details.amount.units,
    blockingCode: null,
    unavailableCode: null,
    observedAt: assessedAt,
  };

  return {
    payer: {
      ...common,
      role: "payer",
      account: details.expectedPayerAddress,
      checks: [
        { code: "account_exists", status: "pass" },
        { code: "spendable_xrp", status: "pass" },
        {
          code:
            details.asset.assetType === "issued"
              ? "issued_balance"
              : "native_balance",
          status: "pass",
        },
      ],
      userMessageKey: "readiness.payer.ready",
      facts: {
        balanceDrops: "50000000",
        reserveDrops: "10000000",
        spendableXrpDrops: "40000000",
        requiredXrpDrops:
          details.asset.assetType === "native"
            ? (BigInt(details.amount.units) + 12n).toString()
            : "12",
        estimatedFeeDrops: "12",
        issuedBalance:
          details.asset.assetType === "issued" ? "1000" : null,
        trustLineChecked: details.asset.assetType === "issued",
      },
    },
    recipient: {
      ...common,
      role: "recipient",
      account: details.destinationAddress,
      checks: [
        { code: "account_exists", status: "pass" },
        { code: "destination_tag", status: "pass" },
        { code: "deposit_authorization", status: "pass" },
        {
          code:
            details.asset.assetType === "issued"
              ? "issued_receive_readiness"
              : "native_receive_readiness",
          status: "pass",
        },
      ],
      userMessageKey: "readiness.recipient.ready",
      facts: {
        destinationTagRequired: false,
        trustLineChecked: details.asset.assetType === "issued",
      },
    },
  };
}
