import type { PublicTransactionProof } from "@/features/proofs/types";

export const PUBLIC_PROOF_TOKEN = "DE".repeat(32);

export const PUBLIC_PROOF_FIXTURE: PublicTransactionProof = {
  network: "testnet",
  validationStatus: "validated",
  transactionResult: "tesSUCCESS",
  transactionId: "BC".repeat(32),
  ledgerIndex: 12345,
  sender: "rPublicSender",
  destination: "rPublicDestination",
  amountDrops: "3000000",
  deliveredAmountDrops: "3000000",
  sourceTag: 777,
  destinationTag: null,
  invoiceId: "AB".repeat(32),
  verifiedAt: "2026-06-24T00:05:00.000Z",
  recordedAt: "2026-06-24T00:05:01.000Z",
  proofDigest: PUBLIC_PROOF_TOKEN,
};
