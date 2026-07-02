import type { MainnetAssetAccess } from "@/features/assets/mainnet-registry";
import type { PaymentDetails } from "@/features/bills/payment-details";

import type { XrplReadinessClient } from "./account-read-client";
import {
  checkAssetReadiness,
  type AssetReadinessAssessment,
} from "./asset-readiness";

export class PaymentReadinessGateError extends Error {
  readonly code:
    | "PAYMENT_READINESS_BLOCKED"
    | "PAYMENT_READINESS_UNAVAILABLE";

  constructor(
    readonly payer: AssetReadinessAssessment,
    readonly recipient: AssetReadinessAssessment,
  ) {
    const unavailable =
      payer.status === "unavailable" || recipient.status === "unavailable";
    super(
      unavailable
        ? "Validated XRPL readiness data is temporarily unavailable."
        : "A confirmed XRPL readiness condition must be resolved before creating a wallet request.",
    );
    this.name = "PaymentReadinessGateError";
    this.code = unavailable
      ? "PAYMENT_READINESS_UNAVAILABLE"
      : "PAYMENT_READINESS_BLOCKED";
  }
}

export async function requirePaymentReadiness(input: {
  details: PaymentDetails;
  reader: XrplReadinessClient;
  mainnetAccess?: MainnetAssetAccess;
}) {
  const [payer, recipient] = await Promise.all([
    checkAssetReadiness({
      role: "payer",
      reader: input.reader,
      account: input.details.expectedPayerAddress,
      asset: input.details.asset,
      amountUnits: input.details.amount.units,
      mainnetAccess: input.mainnetAccess,
    }),
    checkAssetReadiness({
      role: "recipient",
      reader: input.reader,
      account: input.details.destinationAddress,
      destinationTag: input.details.destinationTag,
      asset: input.details.asset,
      amountUnits: input.details.amount.units,
      mainnetAccess: input.mainnetAccess,
    }),
  ]);

  if (!payer.ready || !recipient.ready) {
    throw new PaymentReadinessGateError(payer, recipient);
  }
  return { payer, recipient };
}
