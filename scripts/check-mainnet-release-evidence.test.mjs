import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EVIDENCE_ACCEPTANCE_MAP,
  runMainnetReleaseEvidenceCheck,
} from "./check-mainnet-release-evidence.mjs";

const directories = [];
const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const D1_UUID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_UUID = "22222222-2222-4222-8222-222222222222";

function pendingRecords() {
  return [
    {
      id: "production-d1-provisioning",
      status: "pending",
      recorded_at: null,
      database_name: "xrpl-group-pay-mainnet",
      database_id: null,
      preview_database_id: null,
      migration_count: null,
      migrations_applied: false,
      receipt_schema_checked: false,
    },
    {
      id: "production-release-configuration",
      status: "pending",
      recorded_at: null,
      public_url: null,
      app_network: "mainnet",
      public_network: "mainnet",
      database_binding: "PAYMENTS_DB_MAINNET",
      runtime_allowed: false,
      gate_approved: false,
      source_tag_approved: false,
      release_mode: "disabled",
      operations_mode: "halted",
    },
    {
      id: "production-provider-attestation",
      status: "pending",
      recorded_at: null,
      attestation_reference: null,
      credentials_configured: false,
      forced_mainnet_request_checked: false,
      callback_behavior_checked: false,
      status_lookup_checked: false,
      secrets_committed: false,
    },
    {
      id: "assigned-mainnet-source-tag",
      status: "pending",
      recorded_at: null,
      source_tag: null,
      assignment_reference: null,
      no_testnet_fallback: false,
    },
    {
      id: "live-mainnet-xrp-acceptance",
      status: "pending",
      recorded_at: null,
      transaction_hash: null,
      ledger_index: null,
      validated: false,
      transaction_result: null,
      amount_drops: null,
      receipt_id: null,
      proof_digest: null,
      duplicate_rejected: false,
      replay_rejected: false,
    },
    {
      id: "live-mainnet-rlusd-acceptance",
      status: "pending",
      recorded_at: null,
      transaction_hash: null,
      ledger_index: null,
      validated: false,
      transaction_result: null,
      currency: RLUSD_CURRENCY,
      issuer: RLUSD_ISSUER,
      amount_value: null,
      receipt_id: null,
      proof_digest: null,
      recipient_readiness_checked: false,
      duplicate_rejected: false,
      replay_rejected: false,
    },
    {
      id: "operational-stop-drill",
      status: "pending",
      recorded_at: null,
      environment: "production-equivalent",
      verify_only_creation_blocked: false,
      verify_only_submitted_payment_settled: false,
      verify_only_status_checked: false,
      halted_creation_blocked: false,
      halted_verification_blocked: false,
      halted_status_checked: false,
      restore_change_reviewed: false,
    },
  ];
}

function acceptedRecords() {
  const recordedAt = "2026-06-26T12:00:00Z";
  const xrpHash = "A".repeat(64);
  const rlusdHash = "B".repeat(64);
  return [
    {
      ...pendingRecords()[0],
      status: "accepted",
      recorded_at: recordedAt,
      database_id: D1_UUID,
      preview_database_id: PREVIEW_UUID,
      migration_count: 4,
      migrations_applied: true,
      receipt_schema_checked: true,
    },
    {
      ...pendingRecords()[1],
      status: "accepted",
      recorded_at: recordedAt,
      public_url: "https://group-pay.example",
      runtime_allowed: true,
      gate_approved: true,
      source_tag_approved: true,
      release_mode: "internal",
    },
    {
      ...pendingRecords()[2],
      status: "accepted",
      recorded_at: recordedAt,
      attestation_reference: "mainnet-provider-check-2026-06-26",
      credentials_configured: true,
      forced_mainnet_request_checked: true,
      callback_behavior_checked: true,
      status_lookup_checked: true,
    },
    {
      ...pendingRecords()[3],
      status: "accepted",
      recorded_at: recordedAt,
      source_tag: 123,
      assignment_reference: "assigned-source-tag-123",
      no_testnet_fallback: true,
    },
    {
      ...pendingRecords()[4],
      status: "accepted",
      recorded_at: recordedAt,
      transaction_hash: xrpHash,
      ledger_index: 100,
      validated: true,
      transaction_result: "tesSUCCESS",
      amount_drops: "1000000",
      receipt_id: `mainnet:${xrpHash}`,
      proof_digest: "C".repeat(64),
      duplicate_rejected: true,
      replay_rejected: true,
    },
    {
      ...pendingRecords()[5],
      status: "accepted",
      recorded_at: recordedAt,
      transaction_hash: rlusdHash,
      ledger_index: 101,
      validated: true,
      transaction_result: "tesSUCCESS",
      amount_value: "1.25",
      receipt_id: `mainnet:${rlusdHash}`,
      proof_digest: "D".repeat(64),
      recipient_readiness_checked: true,
      duplicate_rejected: true,
      replay_rejected: true,
    },
    {
      ...pendingRecords()[6],
      status: "accepted",
      recorded_at: recordedAt,
      verify_only_creation_blocked: true,
      verify_only_submitted_payment_settled: true,
      verify_only_status_checked: true,
      halted_creation_blocked: true,
      halted_verification_blocked: true,
      halted_status_checked: true,
      restore_change_reviewed: true,
    },
  ];
}

function acceptance(status = "pending") {
  const accepted = status === "passed";
  return {
    release_decision: accepted ? "approved" : "blocked",
    controls: EVIDENCE_ACCEPTANCE_MAP.map(([, controlId]) => ({
      id: controlId,
      status,
    })),
    blocking_findings: EVIDENCE_ACCEPTANCE_MAP.map(([, , findingId]) => ({
      id: findingId,
      status: accepted ? "resolved" : "open",
    })),
  };
}

function wrangler({ complete = false, sourceTag = "123" } = {}) {
  return JSON.stringify({
    env: {
      mainnet: {
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
          ALLOW_MAINNET_RUNTIME: complete ? "true" : "false",
          MAINNET_GATE_APPROVED: complete ? "true" : "false",
          MAINNET_SOURCE_TAG_APPROVED: complete ? "true" : "false",
          MAINNET_RELEASE_MODE: complete ? "internal" : "disabled",
          MAINNET_OPERATIONS_MODE: "halted",
          ...(complete ? { XRPL_MAINNET_SOURCE_TAG: sourceTag } : {}),
        },
        d1_databases: [
          {
            binding: "PAYMENTS_DB_MAINNET",
            database_name: "xrpl-group-pay-mainnet",
            database_id: complete ? D1_UUID : ZERO_UUID,
            preview_database_id: complete ? PREVIEW_UUID : ZERO_UUID,
          },
        ],
      },
    },
  });
}

const assetRegistry = {
  network: "mainnet",
  assets: [
    { id: "xrpl:mainnet:xrp", currency: "XRP", issuer: null },
    {
      id: "xrpl:mainnet:rlusd",
      currency: RLUSD_CURRENCY,
      issuer: RLUSD_ISSUER,
    },
  ],
};

async function fixture({
  records = pendingRecords(),
  acceptanceDocument = acceptance(),
  wranglerSource = wrangler(),
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), "group-pay-mainnet-evidence-"));
  directories.push(directory);
  const evidencePath = join(directory, "mainnet-release-evidence.json");
  const acceptancePath = join(directory, "mainnet-acceptance.json");
  const wranglerPath = join(directory, "wrangler.jsonc");
  const assetRegistryPath = join(directory, "xrpl-mainnet-assets.json");
  await Promise.all([
    writeFile(
      evidencePath,
      JSON.stringify({
        schema_version: 1,
        network: "mainnet",
        updated_at: "2026-06-26",
        records,
      }),
    ),
    writeFile(acceptancePath, JSON.stringify(acceptanceDocument)),
    writeFile(wranglerPath, wranglerSource),
    writeFile(assetRegistryPath, JSON.stringify(assetRegistry)),
  ]);
  return { evidencePath, acceptancePath, wranglerPath, assetRegistryPath };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Mainnet release evidence", () => {
  it("accepts the current pending evidence in normal validation", async () => {
    const paths = await fixture();
    await expect(runMainnetReleaseEvidenceCheck(paths)).resolves.toMatchObject({
      network: "mainnet",
    });
    await expect(
      runMainnetReleaseEvidenceCheck({ ...paths, requireComplete: true }),
    ).rejects.toThrow("evidence is incomplete");
  });

  it("accepts a complete evidence set only when configuration and acceptance agree", async () => {
    const paths = await fixture({
      records: acceptedRecords(),
      acceptanceDocument: acceptance("passed"),
      wranglerSource: wrangler({ complete: true }),
    });
    await expect(
      runMainnetReleaseEvidenceCheck({ ...paths, requireComplete: true }),
    ).resolves.toMatchObject({ network: "mainnet" });
  });

  it("rejects accepted evidence while its acceptance control is pending", async () => {
    const records = pendingRecords();
    records[0] = acceptedRecords()[0];
    const paths = await fixture({ records });
    await expect(runMainnetReleaseEvidenceCheck(paths)).rejects.toThrow(
      "requires a passed control and resolved finding",
    );
  });

  it("rejects accepted Source Tag evidence that does not match Wrangler", async () => {
    const paths = await fixture({
      records: acceptedRecords(),
      acceptanceDocument: acceptance("passed"),
      wranglerSource: wrangler({ complete: true, sourceTag: "124" }),
    });
    await expect(runMainnetReleaseEvidenceCheck(paths)).rejects.toThrow(
      "must match XRPL_MAINNET_SOURCE_TAG",
    );
  });

  it("rejects incomplete accepted transaction and provider attestations", async () => {
    const records = acceptedRecords();
    records[2] = { ...records[2], callback_behavior_checked: false };
    records[4] = { ...records[4], replay_rejected: false };
    const paths = await fixture({
      records,
      acceptanceDocument: acceptance("passed"),
      wranglerSource: wrangler({ complete: true }),
    });
    await expect(runMainnetReleaseEvidenceCheck(paths)).rejects.toThrow();
  });

  it("rejects secret-like values from public evidence", async () => {
    const records = pendingRecords();
    records[2] = {
      ...records[2],
      attestation_reference: `provider-check-sEd${"A".repeat(24)}`,
    };
    const paths = await fixture({ records });
    await expect(runMainnetReleaseEvidenceCheck(paths)).rejects.toThrow(
      "prohibited secret-like value",
    );
  });

  it("rejects RLUSD evidence that diverges from the canonical registry", async () => {
    const records = pendingRecords();
    records[5] = { ...records[5], issuer: "rWrongIssuer111111111111111111111" };
    const paths = await fixture({ records });
    await expect(runMainnetReleaseEvidenceCheck(paths)).rejects.toThrow();
  });
});
