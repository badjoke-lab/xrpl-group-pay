import type { VerifiedPayment } from "./verified-payment";
import type {
  LedgerVerificationProof,
  PaymentVerificationOutcome,
} from "./types";

export type AssetVerificationOutcome =
  | Extract<PaymentVerificationOutcome, { status: "pending" | "failed" }>
  | {
      status: "verified";
      payment: VerifiedPayment;
      legacyProof: LedgerVerificationProof | null;
    };
