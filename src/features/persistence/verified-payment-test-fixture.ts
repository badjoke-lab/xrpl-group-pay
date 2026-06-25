import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { VerifiedPayment } from "@/features/payment-verification/verified-payment";

export const TEST_VERIFIED_TXID = "A".repeat(64);
export const TEST_VERIFIED_INVOICE = "B".repeat(64);

export function makeVerifiedRlusdPayment(): VerifiedPayment {
  const asset = getRlusdAssetDescriptor("testnet");
  return {
    contractVersion: "xrpl-group-pay:verified-payment:v1",
    receiptContract: "xrpl-issued-payment-v1",
    network: "testnet",
    transactionId: TEST_VERIFIED_TXID,
    ledgerIndex: 12345,
    sender: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    destination: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    asset,
    requestedAmount: { code: "RLUSD", units: "1250000", scale: 6 },
    deliveredAmount: { code: "RLUSD", units: "1250000", scale: 6 },
    sourceTag: 123456,
    destinationTag: 9,
    invoiceId: TEST_VERIFIED_INVOICE,
    idempotencyKey: `testnet:${TEST_VERIFIED_TXID}`,
    verifiedAt: "2026-06-25T01:00:00.000Z",
  };
}
