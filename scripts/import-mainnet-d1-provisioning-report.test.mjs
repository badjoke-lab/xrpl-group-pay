import { describe, expect, it } from "vitest";

import {
  applyProvisioningReport,
  validateProvisioningReport,
  validateWorkflowRunUrl,
} from "./import-mainnet-d1-provisioning-report.mjs";

const SHA = "a".repeat(40);
const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";
const RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28220000000";

function report(overrides = {}) {
  const generatedAt = "2026-06-26T12:00:00Z";
  const migrationFiles = [
    "0001_foundation.sql",
    "0002_payment_slots.sql",
    "0003_receipts.sql",
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
      source_count: migrationFiles.length,
      files: migrationFiles,
      production_applied_count: migrationFiles.length,
      preview_applied_count: migrationFiles.length,
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
      migration_count: migrationFiles.length,
      migrations_applied: true,
      receipt_schema_checked: true,
    },
    ...overrides,
  };
}

function wrangler({ productionId, previewId, variables = {} } = {}) {
  return {
    vars: {
      APP_NETWORK: "testnet",
      PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB",
    },
    d1_databases: [
      {
        binding: "PAYMENTS_DB",
        database_name: "xrpl-group-pay-testnet",
        database_id: "00000000-0000-0000-0000-000000000000",
      },
    ],
    env: {
      mainnet: {
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          ALLOW_MAINNET_RUNTIME: "false",
          MAINNET_GATE_APPROVED: "false",
          MAINNET_SOURCE_TAG_APPROVED: "false",
          MAINNET_RELEASE_MODE: "disabled",
          MAINNET_OPERATIONS_MODE: "halted",
          PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
          ...variables,
        },
        d1_databases: [
          {
            binding: "PAYMENTS_DB_MAINNET",
            database_name: "xrpl-group-pay-mainnet",
            database_id:
              productionId ?? "00000000-0000-0000-0000-000000000000",
            preview_database_id:
              previewId ?? "00000000-0000-0000-0000-000000000000",
            migrations_dir: "migrations",
          },
        ],
      },
    },
  };
}

function evidence(recordOverrides = {}) {
  return {
    schema_version: 1,
    network: "mainnet",
    updated_at: "2026-06-26",
    records: [
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
        ...recordOverrides,
      },
      {
        id: "production-release-configuration",
        status: "pending",
      },
    ],
  };
}

function acceptance({ controlStatus = "pending", findingStatus = "open" } = {}) {
  return {
    schema_version: 1,
    audit_status: "completed",
    release_decision: "blocked",
    audited_at: "2026-06-26",
    controls: [
      {
        id: "repository-gate-controls",
        status: "passed",
        evidence: "unchanged",
      },
      {
        id: "production-d1-provisioning",
        status: controlStatus,
        evidence: "placeholder",
      },
      {
        id: "production-release-configuration",
        status: "pending",
        evidence: "still blocked",
      },
    ],
    blocking_findings: [
      {
        id: "production-d1-not-provisioned",
        status: findingStatus,
        evidence: "placeholder",
      },
      {
        id: "production-runtime-not-approved",
        status: "open",
        evidence: "still open",
      },
    ],
  };
}

function apply(overrides = {}) {
  return applyProvisioningReport({
    report: report(),
    expectedGitSha: SHA,
    workflowRunUrl: RUN_URL,
    wrangler: wrangler(),
    evidence: evidence(),
    acceptance: acceptance(),
    ...overrides,
  });
}

describe("Mainnet D1 provisioning report validation", () => {
  it("accepts a complete verified provision report", () => {
    expect(validateProvisioningReport(report(), SHA)).toMatchObject({
      state: "verified",
      git_sha: SHA,
    });
  });

  it("rejects inspect, incomplete, stale, placeholder, and shared-ID reports", () => {
    expect(() =>
      validateProvisioningReport(report({ mode: "inspect" }), SHA),
    ).toThrow();
    expect(() =>
      validateProvisioningReport(report({ state: "incomplete" }), SHA),
    ).toThrow();
    expect(() => validateProvisioningReport(report(), "b".repeat(40))).toThrow(
      "does not match expected commit",
    );

    const placeholder = report();
    placeholder.databases.production.id =
      "00000000-0000-0000-0000-000000000000";
    placeholder.evidence_patch.database_id = placeholder.databases.production.id;
    expect(() => validateProvisioningReport(placeholder, SHA)).toThrow(
      "placeholder",
    );

    const shared = report();
    shared.databases.preview.id = PRODUCTION_ID;
    shared.evidence_patch.preview_database_id = PRODUCTION_ID;
    expect(() => validateProvisioningReport(shared, SHA)).toThrow(
      "reuses one D1 ID",
    );
  });

  it("rejects migration and evidence-patch inconsistencies", () => {
    const wrongCount = report();
    wrongCount.migrations.preview_applied_count = 2;
    expect(() => validateProvisioningReport(wrongCount, SHA)).toThrow(
      "migration counts",
    );

    const duplicateFiles = report();
    duplicateFiles.migrations.files[2] = duplicateFiles.migrations.files[1];
    expect(() => validateProvisioningReport(duplicateFiles, SHA)).toThrow(
      "migration counts",
    );

    const wrongPatch = report();
    wrongPatch.evidence_patch.preview_database_id = PRODUCTION_ID;
    expect(() => validateProvisioningReport(wrongPatch, SHA)).toThrow(
      "evidence patch",
    );
  });
});

describe("workflow run reference", () => {
  it("accepts only an exact repository Actions run URL", () => {
    expect(validateWorkflowRunUrl(RUN_URL)).toEqual({
      url: RUN_URL,
      runId: "28220000000",
    });
    expect(() =>
      validateWorkflowRunUrl(
        "https://github.com/other/repo/actions/runs/28220000000",
      ),
    ).toThrow("must identify");
    expect(() =>
      validateWorkflowRunUrl(`${RUN_URL}?token=secret`),
    ).toThrow("must identify");
    expect(() =>
      validateWorkflowRunUrl("http://github.com/badjoke-lab/xrpl-group-pay/actions/runs/1"),
    ).toThrow("must identify");
  });
});

describe("Mainnet D1 evidence import", () => {
  it("updates only the Mainnet D1 binding, matching evidence, and matching acceptance entries", () => {
    const originalWrangler = wrangler();
    const originalEvidence = evidence();
    const originalAcceptance = acceptance();
    const result = applyProvisioningReport({
      report: report(),
      expectedGitSha: SHA,
      workflowRunUrl: RUN_URL,
      wrangler: originalWrangler,
      evidence: originalEvidence,
      acceptance: originalAcceptance,
    });

    expect(result.wrangler.d1_databases).toEqual(originalWrangler.d1_databases);
    expect(result.wrangler.env.mainnet.vars).toEqual(
      originalWrangler.env.mainnet.vars,
    );
    expect(result.wrangler.env.mainnet.d1_databases[0]).toMatchObject({
      database_id: PRODUCTION_ID,
      preview_database_id: PREVIEW_ID,
    });

    expect(result.evidence.records[0]).toEqual(report().evidence_patch);
    expect(result.evidence.records[1]).toEqual(originalEvidence.records[1]);

    expect(result.acceptance.release_decision).toBe("blocked");
    expect(result.acceptance.controls[0]).toEqual(
      originalAcceptance.controls[0],
    );
    expect(result.acceptance.controls[1]).toMatchObject({
      id: "production-d1-provisioning",
      status: "passed",
    });
    expect(result.acceptance.controls[1].evidence).toContain(RUN_URL);
    expect(result.acceptance.controls[2]).toEqual(
      originalAcceptance.controls[2],
    );
    expect(result.acceptance.blocking_findings[0]).toMatchObject({
      id: "production-d1-not-provisioned",
      status: "resolved",
    });
    expect(result.acceptance.blocking_findings[1]).toEqual(
      originalAcceptance.blocking_findings[1],
    );
  });

  it("is idempotent for the exact same accepted report", () => {
    const first = apply();
    const second = applyProvisioningReport({
      report: report(),
      expectedGitSha: SHA,
      workflowRunUrl: RUN_URL,
      wrangler: first.wrangler,
      evidence: first.evidence,
      acceptance: first.acceptance,
    });

    expect(second).toEqual(first);
  });

  it("rejects different non-placeholder bindings and accepted evidence", () => {
    expect(() =>
      apply({
        wrangler: wrangler({
          productionId: "33333333-3333-4333-8333-333333333333",
        }),
      }),
    ).toThrow("different non-placeholder");

    expect(() =>
      apply({
        evidence: evidence({
          ...report().evidence_patch,
          database_id: "33333333-3333-4333-8333-333333333333",
        }),
        acceptance: acceptance({
          controlStatus: "passed",
          findingStatus: "resolved",
        }),
      }),
    ).toThrow("differs from the provisioning report");
  });

  it("rejects unsafe Mainnet activation and inconsistent acceptance pairs", () => {
    expect(() =>
      apply({
        wrangler: wrangler({
          variables: { ALLOW_MAINNET_RUNTIME: "true" },
        }),
      }),
    ).toThrow("safe Mainnet value");

    expect(() =>
      apply({
        acceptance: acceptance({
          controlStatus: "passed",
          findingStatus: "open",
        }),
      }),
    ).toThrow("not in a valid pair");
  });

  it("rejects duplicate or missing target records", () => {
    const duplicateEvidence = evidence();
    duplicateEvidence.records.push({
      ...duplicateEvidence.records[0],
    });
    expect(() => apply({ evidence: duplicateEvidence })).toThrow(
      "exactly one",
    );

    const missingFinding = acceptance();
    missingFinding.blocking_findings = [];
    expect(() => apply({ acceptance: missingFinding })).toThrow(
      "exactly one",
    );
  });
});
