export type VerificationPendingReason =
  | "XAMAN_NOT_RESOLVED"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_NOT_VALIDATED"
  | "VERIFICATION_UNAVAILABLE";

export type VerificationFailureReason =
  | "INVALID_XAMAN_TEMPLATE"
  | "HASH_MISMATCH"
  | "TRANSACTION_FAILED"
  | "WRONG_TRANSACTION_TYPE"
  | "WRONG_SENDER"
  | "WRONG_DESTINATION"
  | "NON_XRP_PAYMENT"
  | "AMOUNT_MISMATCH"
  | "DELIVERED_AMOUNT_MISMATCH"
  | "PARTIAL_PAYMENT"
  | "CROSS_CURRENCY_PAYMENT"
  | "SOURCE_TAG_MISMATCH"
  | "DESTINATION_TAG_MISMATCH"
  | "INVOICE_ID_MISMATCH";

export type LedgerVerificationProof = {
  network: "testnet";
  transactionId: string;
  ledgerIndex: number;
  sender: string;
  destination: string;
  amountDrops: string;
  deliveredAmountDrops: string;
  sourceTag: number;
  destinationTag: number | null;
  invoiceId: string;
  idempotencyKey: string;
  verifiedAt: string;
};

export type PaymentVerificationOutcome =
  | {
      status: "verified";
      proof: LedgerVerificationProof;
    }
  | {
      status: "pending";
      reason: VerificationPendingReason;
      transactionId: string | null;
      message: string;
    }
  | {
      status: "failed";
      reason: VerificationFailureReason;
      transactionId: string | null;
      message: string;
    };
