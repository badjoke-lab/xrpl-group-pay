import { spawnSync } from "node:child_process";

const databaseName = "xrpl-group-pay-testnet";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const transactionId = "A".repeat(64);
const invoiceId = "B".repeat(64);
const proofDigest = "C".repeat(64);
const billId = "bill-schema-check";
const billPublicId = "00000000-0000-4000-8000-000000000001";
const slotId = "slot-schema-check";
const slotPublicId = "00000000-0000-4000-8000-000000000002";

function execute(sql, expectation = "success") {
  const result = spawnSync(
    pnpm,
    [
      "exec",
      "wrangler",
      "d1",
      "execute",
      databaseName,
      "--local",
      "--command",
      sql,
    ],
    { encoding: "utf8" },
  );

  const succeeded = result.status === 0;
  if (
    (expectation === "success" && !succeeded) ||
    (expectation === "failure" && succeeded)
  ) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `D1 schema check expected ${expectation} but command ${
        succeeded ? "succeeded" : "failed"
      }.\n${output}`,
    );
  }
}

function insertReceipt({
  receiptId = `testnet:${transactionId}`,
  txid = transactionId,
  invoice = invoiceId,
  amount = "1",
  delivered = "1",
  digest = proofDigest,
} = {}) {
  return `
    INSERT INTO verified_payment_receipts (
      receipt_id,
      network,
      transaction_id,
      invoice_id,
      ledger_index,
      sender,
      destination,
      amount_drops,
      delivered_amount_drops,
      source_tag,
      destination_tag,
      verified_at,
      recorded_at,
      proof_digest
    ) VALUES (
      '${receiptId}',
      'testnet',
      '${txid}',
      '${invoice}',
      1,
      'rSender',
      'rDestination',
      '${amount}',
      '${delivered}',
      1,
      NULL,
      '2026-06-23T00:00:00.000Z',
      '2026-06-23T00:00:01.000Z',
      '${digest}'
    );
  `;
}

function insertBill({
  id = billId,
  publicId = billPublicId,
  publicHash = "D".repeat(64),
  adminHash = "E".repeat(64),
  total = "2",
  creatorShare = "1",
  status = "open",
} = {}) {
  return `
    INSERT INTO bills (
      id, public_id, public_token_hash, admin_token_hash, title, network,
      destination_address, destination_tag, total_drops, creator_share_drops,
      status, revision, frozen_at, expires_at, created_at, updated_at
    ) VALUES (
      '${id}', '${publicId}', '${publicHash}', '${adminHash}', 'Schema check',
      'testnet', 'rDestination', NULL, '${total}', '${creatorShare}',
      '${status}', 1, '2026-06-24T00:00:00.000Z', NULL,
      '2026-06-24T00:00:00.000Z', '2026-06-24T00:00:00.000Z'
    );
  `;
}

function insertSlot({
  id = slotId,
  publicId = slotPublicId,
  tokenHash = "F".repeat(64),
  invoice = "1".repeat(64),
  amount = "1",
  status = "unpaid",
  receiptId = null,
  paidTx = null,
  ledgerIndex = null,
  paidAt = null,
} = {}) {
  const sqlValue = (value) => (value === null ? "NULL" : `'${value}'`);
  return `
    INSERT INTO payment_slots (
      id, public_id, bill_id, public_token_hash, participant_label,
      expected_payer_address, expected_amount_drops, invoice_id, status,
      paid_receipt_id, paid_tx_hash, paid_ledger_index, paid_at,
      created_at, updated_at
    ) VALUES (
      '${id}', '${publicId}', '${billId}', '${tokenHash}', 'Alex',
      'rSender', '${amount}', '${invoice}', '${status}',
      ${sqlValue(receiptId)}, ${sqlValue(paidTx)}, ${ledgerIndex ?? "NULL"},
      ${sqlValue(paidAt)}, '2026-06-24T00:00:00.000Z',
      '2026-06-24T00:00:00.000Z'
    );
  `;
}

execute("DELETE FROM payment_slots;");
execute("DELETE FROM bills;");
execute("DELETE FROM verified_payment_receipts;");

execute(insertReceipt());

const otherTransaction = "D".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${otherTransaction}`,
    txid: otherTransaction,
    invoice: invoiceId,
  }),
  "failure",
);

const otherInvoice = "E".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${transactionId}`,
    txid: transactionId,
    invoice: otherInvoice,
  }),
  "failure",
);

const proofCollisionTransaction = "9".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${proofCollisionTransaction}`,
    txid: proofCollisionTransaction,
    invoice: "4".repeat(64),
    digest: proofDigest,
  }),
  "failure",
);

const mismatchTransaction = "F".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${mismatchTransaction}`,
    txid: mismatchTransaction,
    invoice: "2".repeat(64),
    delivered: "2",
  }),
  "failure",
);

const lowercaseTransaction = "a".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${lowercaseTransaction}`,
    txid: lowercaseTransaction,
    invoice: "3".repeat(64),
  }),
  "failure",
);

execute(insertBill());
execute(insertSlot());

execute(
  insertBill({
    id: "bill-duplicate-token",
    publicId: "00000000-0000-4000-8000-000000000003",
    adminHash: "4".repeat(64),
  }),
  "failure",
);

execute(
  insertSlot({
    id: "slot-lowercase-invoice",
    publicId: "00000000-0000-4000-8000-000000000004",
    tokenHash: "5".repeat(64),
    invoice: "a".repeat(64),
  }),
  "failure",
);

execute(
  insertSlot({
    id: "slot-zero-amount",
    publicId: "00000000-0000-4000-8000-000000000005",
    tokenHash: "6".repeat(64),
    invoice: "6".repeat(64),
    amount: "0",
  }),
  "failure",
);

execute(
  insertSlot({
    id: "slot-invalid-paid-state",
    publicId: "00000000-0000-4000-8000-000000000006",
    tokenHash: "7".repeat(64),
    invoice: "7".repeat(64),
    status: "paid",
  }),
  "failure",
);

execute(
  insertSlot({
    id: "slot-unpaid-with-proof",
    publicId: "00000000-0000-4000-8000-000000000007",
    tokenHash: "8".repeat(64),
    invoice: "8".repeat(64),
    receiptId: `testnet:${transactionId}`,
    paidTx: transactionId,
    ledgerIndex: 1,
    paidAt: "2026-06-24T00:00:01.000Z",
  }),
  "failure",
);

execute("SELECT id, status FROM bills;");
execute("SELECT id, status FROM payment_slots;");
execute("SELECT receipt_id, proof_digest FROM verified_payment_receipts;");

execute("DELETE FROM payment_slots;");
execute("DELETE FROM bills;");
execute("DELETE FROM verified_payment_receipts;");
