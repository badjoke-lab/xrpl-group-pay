import { describe, expect, it } from "vitest";

import { applyForwardProvisioningReport } from "./import-mainnet-d1-forward-report.mjs";

const SHA = "a".repeat(40);
const RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28390000000";
const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";

function report(count = 14) {
  const files = Array.from(
    { length: count },
    (_, index) => `${String(index + 1).padStart(4, "0")}_migration.sql`,
  );
  const generatedAt = "2026-06-30T01:00:00.000Z";
  return {
    schema_version: 1,
    network: "mainnet",
    mode: "provision",
    generated_at: generatedAt,
    git_sha: SHA,
    location_hint: "apac",
    state: "verified",
    databases: {
      production: { name: "xrpl-group-pay-mainnet", id: PRODUCTION_ID },
      preview: {
        name: "xrpl-group-pay-mainnet-preview",
        id: PREVIEW_ID,
      },
    },
    migrations: {
      source_count: count,
      files,
      production_applied_count: count,
      preview_applied_count: count,
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
      migration_count: count,
      migrations_applied: true,
      receipt_schema_checked: true,
    },
  };
}

function wrangler() {
  return {
    env: {
      mainnet: {
        name: "xrpl-group-pay-mainnet",
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_URL: "https://xgp.badjoke-lab.com",
          ALLOW_MAINNET_RUNTIME: "true",
          MAINNET_GATE_APPROVED: "true",
          MAINNET_SOURCE_TAG_APPROVED: "true",
          XRPL_MAINNET_SOURCE_TAG: "2171267705",
          MAINNET_RELEASE_MODE: "internal",
          MAINNET_OPERATIONS_MODE: "halted",
          PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        },
        d1_databases: [
          {
            binding: "PAYMENTS_DB_MAINNET",
            database_name: "xrpl-group-pay-mainnet",
            database_id: PRODUCTION_ID,
            preview_database_id: PREVIEW_ID,
          },
        ],
        routes: [
          { pattern: "xgp.badjoke-lab.com", custom_domain: true },
        ],
        workers_dev: false,
      },
    },
  };
}

function evidence() {
  return {
    schema_version: 1,
    network: "mainnet",
    updated_at: "2026-06-28",
    records: [
      {
        id: "production-d1-provisioning",
        status: "accepted",
        recorded_at: "2026-06-26T03:14:41.122Z",
        database_name: "xrpl-group-pay-mainnet",
        database_id: PRODUCTION_ID,
        preview_database_id: PREVIEW_ID,
        migration_count: 12,
        migrations_applied: true,
        receipt_schema_checked: true,
      },
      {
        id: "production-release-configuration",
        status: "accepted",
        release_mode: "internal",
        operations_mode: "halted",
      },
      { id: "unchanged-record", status: "accepted" },
    ],
  };
}

function acceptance() {
  return {
    schema_version: 1,
    audit_status: "completed",
    release_decision: "blocked",
    audited_at: "2026-06-26",
    controls: [
      {
        id: "production-d1-provisioning",
        status: "passed",
        evidence: "old evidence",
      },
      { id: "unchanged-control", status: "passed", evidence: "unchanged" },
    ],
    blocking_findings: [
      {
        id: "production-d1-not-provisioned",
        status: "resolved",
        evidence: "old evidence",
      },
      { id: "unchanged-finding", status: "open", evidence: "unchanged" },
    ],
  };
}

function apply(overrides = {}) {
  return applyForwardProvisioningReport({
    report: report(),
    expectedGitSha: SHA,
    workflowRunUrl: RUN_URL,
    wrangler: wrangler(),
    evidence: evidence(),
    acceptance: acceptance(),
    ...overrides,
  });
}

describe("Mainnet D1 forward evidence import", () => {
  it("updates only the migration evidence for unchanged D1 IDs", () => {
    const result = apply();

    expect(result.evidence.records[0]).toEqual(report().evidence_patch);
    expect(result.evidence.records[2]).toEqual(evidence().records[2]);
    expect(result.acceptance.controls[1]).toEqual(acceptance().controls[1]);
    expect(result.acceptance.blocking_findings[1]).toEqual(
      acceptance().blocking_findings[1],
    );
    expect(result.wrangler).toEqual(wrangler());
  });

  it("rejects non-forward counts and database ID changes", () => {
    expect(() => apply({ report: report(12) })).toThrow("increase migration_count");

    const changed = report();
    changed.databases.production.id =
      "33333333-3333-4333-8333-333333333333";
    changed.evidence_patch.database_id = changed.databases.production.id;
    expect(() => apply({ report: changed })).toThrow("unchanged database IDs");
  });
});
