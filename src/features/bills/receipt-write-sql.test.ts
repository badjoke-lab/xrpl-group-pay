import { describe, expect, it } from "vitest";

import { INSERT_SLOT_RECEIPT } from "./receipt-write-sql";

describe("INSERT_SLOT_RECEIPT", () => {
  it("writes canonical Asset fields and upgrades exact legacy retries", () => {
    expect(INSERT_SLOT_RECEIPT).toContain("verified_payment_contract_version");
    expect(INSERT_SLOT_RECEIPT).toContain("verified_payment_digest");
    expect(INSERT_SLOT_RECEIPT).toContain("asset_id");
    expect(INSERT_SLOT_RECEIPT).toContain("ON CONFLICT(network, transaction_id) DO UPDATE");
    expect(INSERT_SLOT_RECEIPT).toContain("verified_payment_receipts.proof_digest = excluded.proof_digest");
  });
});
