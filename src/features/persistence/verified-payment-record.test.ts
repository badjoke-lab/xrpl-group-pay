import { describe, expect, it } from "vitest";

import { verifiedPaymentRecordRowSchema } from "./verified-payment-record";

const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);

describe("verifiedPaymentRecordRowSchema", () => {
  it("accepts a canonical RLUSD record without legacy proof data", () => {
    expect(
      verifiedPaymentRecordRowSchema.parse({
        receipt_id: `testnet:${TXID}`,
        verified_payment_contract_version:
          "xrpl-group-pay:verified-payment:v1",
        receipt_contract: "xrpl-issued-payment-v1",
        network: "testnet",
        transaction_id: TXID,
        invoice_id: INVOICE_ID,
        asset_id: "xrpl:testnet:rlusd",
        amount_units: "1250000",
        delivered_amount_units: "1250000",
        recorded_at: "2026-06-25T01:00:01.000Z",
        verified_payment_digest: "C".repeat(64),
        legacy_proof_digest: null,
      }),
    ).toBeDefined();
  });
});
