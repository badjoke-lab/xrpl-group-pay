import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "migrations/0017_frozen_bill_immutability.sql"),
  "utf8",
);

describe("frozen Bill immutability migration", () => {
  it.each([
    "title",
    "payment_mode",
    "recipient_label",
    "destination_address",
    "destination_tag",
    "settlement_asset_id",
    "total_amount_units",
    "recipient_funded_amount_units",
    "public_token_hash",
    "admin_token_hash",
  ])("locks Bill field %s", (field) => {
    expect(sql).toContain(`OLD.${field} IS NOT NEW.${field}`);
  });

  it.each([
    "participant_label",
    "expected_payer_address",
    "expected_amount_units",
    "invoice_id",
    "asset_id",
    "public_token_hash",
    "bill_id",
  ])("locks PaymentSlot field %s", (field) => {
    expect(sql).toContain(`OLD.${field} IS NOT NEW.${field}`);
  });

  it("does not block lifecycle, verification, review, or closure updates", () => {
    const triggerHeaders = sql
      .split("ON bills")[0]
      .concat(sql.split("ON payment_slots")[0].split("CREATE TRIGGER payment_slots")[1] ?? "");
    for (const mutable of [
      "status",
      "updated_at",
      "paid_tx_hash",
      "paid_ledger_index",
      "paid_at",
      "review_reason_code",
      "review_details_json",
      "closed_at",
    ]) {
      expect(triggerHeaders).not.toMatch(new RegExp(`\\b${mutable}\\b`));
    }
  });

  it("directs all frozen edits to a new Bill", () => {
    expect(sql).toContain("frozen Bill content is immutable; create a new Bill");
    expect(sql).toContain(
      "frozen PaymentSlot content is immutable; create a new Bill",
    );
  });
});
