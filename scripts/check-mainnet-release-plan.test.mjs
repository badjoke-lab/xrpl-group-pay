import { describe, expect, it } from "vitest";

import {
  assertMainnetReleasePlan,
  deriveMainnetReleaseStage,
} from "./check-mainnet-release-plan.mjs";

const SOURCE_TAG = 2171267705;
const evidenceIds = [
  "production-d1-provisioning",
  "production-provider-attestation",
  "production-release-configuration",
  "assigned-mainnet-source-tag",
  "live-mainnet-xrp-acceptance",
  "live-mainnet-rlusd-acceptance",
  "operational-stop-drill",
];

function records(statuses = {}) {
  return evidenceIds.map((id) => ({
    id,
    status:
      statuses[id] ??
      ([
        "production-d1-provisioning",
        "assigned-mainnet-source-tag",
        "operational-stop-drill",
      ].includes(id)
        ? "accepted"
        : "pending"),
  }));
}

function plan() {
  return {
    schema_version: 1,
    network: "mainnet",
    state: "blocked",
    review_status: "prepared",
    release_decision: "blocked",
    current_stage: "provider-attestation",
    accepted_foundations: [
      "production-d1-provisioning",
      "assigned-mainnet-source-tag",
      "operational-stop-drill",
    ],
    remaining_evidence: [
      "production-provider-attestation",
      "production-release-configuration",
      "live-mainnet-xrp-acceptance",
      "live-mainnet-rlusd-acceptance",
    ],
    stages: [
      {
        id: "foundations",
        position: 1,
        status: "complete",
        requires: [
          "production-d1-provisioning",
          "assigned-mainnet-source-tag",
          "operational-stop-drill",
        ],
      },
      {
        id: "provider-attestation",
        position: 2,
        status: "blocked",
        requires: ["production-provider-attestation"],
      },
      {
        id: "halted-deployment-review",
        position: 3,
        status: "pending",
        requires: ["production-release-configuration"],
      },
      {
        id: "live-xrp-acceptance",
        position: 4,
        status: "pending",
        requires: ["live-mainnet-xrp-acceptance"],
      },
      {
        id: "live-rlusd-acceptance",
        position: 5,
        status: "pending",
        requires: ["live-mainnet-rlusd-acceptance"],
      },
      {
        id: "final-release-audit",
        position: 6,
        status: "pending",
        requires: evidenceIds,
      },
    ],
    staged_target: {
      committed: false,
      public_url_required: true,
      app_network: "mainnet",
      public_network: "mainnet",
      database_binding: "PAYMENTS_DB_MAINNET",
      source_tag: SOURCE_TAG,
      initial_release_mode: "internal",
      initial_operations_mode: "halted",
    },
    safe_reset: {
      allow_mainnet_build: false,
      allow_mainnet_runtime: false,
      gate_approved: false,
      source_tag_approved: false,
      release_mode: "disabled",
      operations_mode: "halted",
    },
  };
}

function acceptance() {
  const pending = new Set([
    "production-provider-attestation",
    "production-release-configuration",
    "live-mainnet-xrp-acceptance",
    "live-mainnet-rlusd-acceptance",
  ]);
  return {
    release_decision: "blocked",
    controls: evidenceIds.map((id) => ({
      id,
      status: pending.has(id) ? "pending" : "passed",
    })),
    blocking_findings: [
      { id: "production-d1-not-provisioned", status: "resolved" },
      { id: "production-runtime-not-approved", status: "open" },
      { id: "production-provider-not-attested", status: "open" },
      { id: "mainnet-source-tag-not-assigned", status: "resolved" },
      { id: "live-xrp-acceptance-not-recorded", status: "open" },
      { id: "live-rlusd-acceptance-not-recorded", status: "open" },
      { id: "operational-stop-drill-not-recorded", status: "resolved" },
    ],
  };
}

function gate() {
  return {
    state: "blocked",
    checks: [
      {
        id: "mainnet-acceptance-audit",
        status: "failed",
        evidence:
          "production-runtime-not-approved production-provider-not-attested live-xrp-acceptance-not-recorded live-rlusd-acceptance-not-recorded",
      },
    ],
  };
}

function wrangler(overrides = {}) {
  return JSON.stringify({
    env: {
      mainnet: {
        vars: {
          ALLOW_MAINNET_RUNTIME: "false",
          MAINNET_GATE_APPROVED: "false",
          MAINNET_SOURCE_TAG_APPROVED: "false",
          MAINNET_RELEASE_MODE: "disabled",
          MAINNET_OPERATIONS_MODE: "halted",
          PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
          XRPL_MAINNET_SOURCE_TAG: String(SOURCE_TAG),
          ...overrides,
        },
      },
    },
  });
}

function input(overrides = {}) {
  return {
    plan: plan(),
    evidence: { records: records() },
    acceptance: acceptance(),
    gate: gate(),
    wranglerSource: wrangler(),
    sourceTag: { source_tag: SOURCE_TAG },
    ...overrides,
  };
}

describe("Mainnet release plan", () => {
  it("derives the first unresolved stage in release order", () => {
    expect(deriveMainnetReleaseStage(records())).toBe("provider-attestation");
    expect(
      deriveMainnetReleaseStage(
        records({ "production-provider-attestation": "accepted" }),
      ),
    ).toBe("halted-deployment-review");
    expect(
      deriveMainnetReleaseStage(
        records({
          "production-provider-attestation": "accepted",
          "production-release-configuration": "accepted",
        }),
      ),
    ).toBe("live-xrp-acceptance");
  });

  it("accepts the current blocked release plan", () => {
    expect(assertMainnetReleasePlan(input())).toEqual({
      state: "blocked",
      currentStage: "provider-attestation",
      acceptedEvidence: 3,
      pendingEvidence: [
        "production-provider-attestation",
        "production-release-configuration",
        "live-mainnet-xrp-acceptance",
        "live-mainnet-rlusd-acceptance",
      ],
      openFindings: [
        "production-provider-not-attested",
        "production-runtime-not-approved",
        "live-xrp-acceptance-not-recorded",
        "live-rlusd-acceptance-not-recorded",
      ],
    });
  });

  it("rejects stale stages and missing blocker evidence", () => {
    const stalePlan = plan();
    stalePlan.current_stage = "halted-deployment-review";
    expect(() =>
      assertMainnetReleasePlan(input({ plan: stalePlan })),
    ).toThrow("stage is stale");

    const staleGate = gate();
    staleGate.checks[0].evidence = "production-provider-not-attested";
    expect(() =>
      assertMainnetReleasePlan(input({ gate: staleGate })),
    ).toThrow("Acceptance gate evidence is missing");
  });

  it("rejects unexpected open findings", () => {
    const changedAcceptance = acceptance();
    changedAcceptance.blocking_findings.push({
      id: "unexpected-finding",
      status: "open",
    });
    expect(() =>
      assertMainnetReleasePlan(input({ acceptance: changedAcceptance })),
    ).toThrow("do not match remaining evidence");
  });

  it("rejects an opened runtime or mismatched Source Tag", () => {
    expect(() =>
      assertMainnetReleasePlan(
        input({ wranglerSource: wrangler({ ALLOW_MAINNET_RUNTIME: "true" }) }),
      ),
    ).toThrow("ALLOW_MAINNET_RUNTIME=false");

    expect(() =>
      assertMainnetReleasePlan(
        input({ sourceTag: { source_tag: SOURCE_TAG + 1 } }),
      ),
    ).toThrow("Source Tag is inconsistent");
  });

  it("rejects an incomplete safe reset", () => {
    const unsafePlan = plan();
    unsafePlan.safe_reset.operations_mode = "enabled";
    expect(() =>
      assertMainnetReleasePlan(input({ plan: unsafePlan })),
    ).toThrow("safe reset is incomplete");
  });
});
