import { spawnSync } from "node:child_process";

const databaseName = "xrpl-group-pay-testnet";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const timestamp = "2026-06-29T00:00:00.000Z";

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
      `Mainnet Bill schema check expected ${expectation} but command ${
        succeeded ? "succeeded" : "failed"
      }.\n${output}`,
    );
  }
}

function insertBill({ id, publicId, publicHash, adminHash, network }) {
  return `
    INSERT INTO bills (
      id,
      public_id,
      public_token_hash,
      admin_token_hash,
      title,
      network,
      destination_address,
      destination_tag,
      total_drops,
      creator_share_drops,
      settlement_contract_version,
      settlement_asset_id,
      settlement_asset_type,
      settlement_currency,
      settlement_issuer,
      settlement_amount_scale,
      total_amount_units,
      creator_share_amount_units,
      status,
      revision,
      frozen_at,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      '${id}',
      '${publicId}',
      '${publicHash}',
      '${adminHash}',
      'Mainnet Bill schema check',
      '${network}',
      'rECPk8UQrbFcqAhPfy1g8UN5RyCrb42GTp',
      NULL,
      '2',
      '0',
      'xrpl-group-pay:bill-settlement:v1',
      'xrpl:mainnet:xrp',
      'native',
      'XRP',
      NULL,
      6,
      '2',
      '0',
      'open',
      1,
      '${timestamp}',
      NULL,
      '${timestamp}',
      '${timestamp}'
    );
  `;
}

const billId = "bill-mainnet-schema-check";

execute(`DELETE FROM bills WHERE id IN ('${billId}', 'bill-invalid-network-check');`);
execute(
  insertBill({
    id: billId,
    publicId: "00000000-0000-4000-8000-000000000013",
    publicHash: "A".repeat(64),
    adminHash: "B".repeat(64),
    network: "mainnet",
  }),
);

execute(`
  CREATE TABLE _mainnet_bill_schema_assertion (
    ok INTEGER NOT NULL CHECK (ok = 1)
  ) STRICT;

  INSERT INTO _mainnet_bill_schema_assertion (ok)
  SELECT CASE
    WHEN network = 'mainnet'
      AND settlement_asset_id = 'xrpl:mainnet:xrp'
      AND settlement_asset_type = 'native'
      AND settlement_currency = 'XRP'
      AND settlement_issuer IS NULL
      AND settlement_amount_scale = 6
      AND total_amount_units = '2'
      AND creator_share_amount_units = '0'
    THEN 1
    ELSE 0
  END
  FROM bills
  WHERE id = '${billId}';

  DROP TABLE _mainnet_bill_schema_assertion;
`);

execute(
  insertBill({
    id: "bill-invalid-network-check",
    publicId: "00000000-0000-4000-8000-000000000014",
    publicHash: "C".repeat(64),
    adminHash: "D".repeat(64),
    network: "devnet",
  }),
  "failure",
);

execute(`DELETE FROM bills WHERE id IN ('${billId}', 'bill-invalid-network-check');`);
execute("PRAGMA foreign_key_check;");

console.log(
  "D1 Mainnet Bill contract verified: mainnet accepted, unsupported network rejected, Asset identity preserved.",
);
