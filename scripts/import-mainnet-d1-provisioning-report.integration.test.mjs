import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertEvidenceMatchesAcceptance,
  assertEvidenceMatchesConfiguration,
} from "./check-mainnet-release-evidence.mjs";
import { applyProvisioningReport } from "./import-mainnet-d1-provisioning-report.mjs";

const SHA = "a".repeat(40);
const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";

function parseJsonc(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments);
}

function report() {
  const generatedAt = "2026-06-26T12:00:00Z";
  const files = [
    "0001_foundation.sql",
    "0002_payment_slots.sql",
    "0003_receipts.sql",
    "0004_wallet_handoffs.sql",
    "0005_asset_records.sql",
    "0006_receipt_constraints.sql",
    "0007_verified_payment_records.sql",
    "0008_sync_legacy_xrp_receipts.sql",
    "0009_generic_slot_receipts.sql",
    "0010_bill_allocation_records.sql",
  ];
  return {
    schema_version: 1,
    network: "mainnet",
    mode: "provision",
    generated_at: generatedAt,
    git_sha: SHA,
    location_hint: "apac",
    state: "verified",
    databases: {
      production: {
        name: "xrpl-group-pay-mainnet",
        id: PRODUCTION_ID,
      },
      preview: {
        name: "xrpl-group-pay-mainnet-preview",
        id: PREVIEW_ID,
      },
    },
    migrations: {
      source_count: files.length,
      files,
      production_applied_count: files.length,
      preview_applied_count: files.length,
    },
    schema: {
      production: {
        required_tables_present: true,
        verified_payment_columns_present: true,
      },
      preview: {
        required_tables_present: true,
        verified_payment_columns_present: true,
      },
    },
    safe_defaults_preserved: true,
    evidence_patch: {
      id: "production-d1-provisioning",
      status: "accepted",
      recorded_at: generatedAt,
      database_name: "xrpl-group-pay-mainnet",
      database_id: PRODUCTION_ID,
      preview_database_id: PREVIEW_ID,
      migration_count: files.length,
      migrations_applied: true,
      receipt_schema_checked: true,
    },
  };
}

describe("Mainnet D1 importer compatibility", () => {
  it("produces documents accepted by the existing release-evidence validator", async () => {
    const [wranglerSource, evidenceSource, acceptanceSource, assetSource] =
      await Promise.all([
        readFile(resolve(process.cwd(), "wrangler.jsonc"), "utf8"),
        readFile(
          resolve(process.cwd(), "config/mainnet-release-evidence.json"),
          "utf8",
        ),
        readFile(
          resolve(process.cwd(), "config/mainnet-acceptance.json"),
          "utf8",
        ),
        readFile(
          resolve(process.cwd(), "config/xrpl-mainnet-assets.json"),
          "utf8",
        ),
      ]);

    const result = applyProvisioningReport({
      report: report(),
      expectedGitSha: SHA,
      workflowRunUrl:
        "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28220000000",
      wrangler: parseJsonc(wranglerSource),
      evidence: JSON.parse(evidenceSource),
      acceptance: JSON.parse(acceptanceSource),
    });

    expect(() =>
      assertEvidenceMatchesAcceptance(result.evidence, result.acceptance),
    ).not.toThrow();
    expect(() =>
      assertEvidenceMatchesConfiguration(
        result.evidence,
        JSON.stringify(result.wrangler),
        JSON.parse(assetSource),
      ),
    ).not.toThrow();
    expect(result.acceptance.release_decision).toBe("blocked");
    expect(
      result.acceptance.blocking_findings.filter(
        (finding) => finding.status === "open",
      ),
    ).toHaveLength(6);
  });
});
