import {
  ledgerVerificationProofSchema,
  type LedgerVerificationProof,
} from "@/features/payment-verification/types";

export class VerifiedProofInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerifiedProofInputError";
  }
}

export function normalizeVerifiedProof(
  input: LedgerVerificationProof,
): LedgerVerificationProof {
  const parsed = ledgerVerificationProofSchema.parse(input);
  const transactionId = parsed.transactionId.toUpperCase();
  const invoiceId = parsed.invoiceId.toUpperCase();
  const idempotencyKey = `${parsed.network}:${transactionId}`;

  if (parsed.idempotencyKey.toLowerCase() !== idempotencyKey.toLowerCase()) {
    throw new VerifiedProofInputError(
      "The verification key does not match its transaction.",
    );
  }

  return {
    ...parsed,
    transactionId,
    invoiceId,
    idempotencyKey,
  };
}
