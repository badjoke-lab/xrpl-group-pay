import { spawnSync } from "node:child_process";

const databaseName = "xrpl-group-pay-testnet";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const transactionId = "A".repeat(64);
const invoiceId = "B".repeat(64);
const proofDigest = "C".repeat(64);

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

const mismatchTransaction = "F".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${mismatchTransaction}`,
    txid: mismatchTransaction,
    invoice: "1".repeat(64),
    delivered: "2",
  }),
  "failure",
);

const lowercaseTransaction = "a".repeat(64);
execute(
  insertReceipt({
    receiptId: `testnet:${lowercaseTransaction}`,
    txid: lowercaseTransaction,
    invoice: "2".repeat(64),
  }),
  "failure",
);

execute("SELECT receipt_id FROM verified_payment_receipts;");
execute("DELETE FROM verified_payment_receipts;");
