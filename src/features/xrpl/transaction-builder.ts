import type { PaymentIntent } from "@/features/payment-intents/types";

import {
  buildIssuedPaymentTransaction,
  type IssuedPaymentTransaction,
} from "./issued-payment-builder";
import {
  buildXrpPaymentTransaction,
  type XrpPaymentTransaction,
} from "./payment-builder";

export type XrplPaymentTransaction =
  | XrpPaymentTransaction
  | IssuedPaymentTransaction;

export function buildXrplPaymentTransaction(
  intent: PaymentIntent,
): XrplPaymentTransaction {
  return intent.asset.assetType === "issued"
    ? buildIssuedPaymentTransaction(intent)
    : buildXrpPaymentTransaction(intent);
}
