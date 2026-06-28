import { describe, expect, it } from "vitest";

import { assertReviewedMainnetSourceTag } from "./check-reviewed-mainnet-source-tag.mjs";

const assignment = {
  schema_version: 1,
  network: "mainnet",
  assignment_status: "assigned",
  approval_status: "pending",
  assigned_at: "2026-06-26",
  namespace:
    "xrpl-group-pay|badjoke-lab/xrpl-group-pay|mainnet|source-tag|v1",
  algorithm: "sha256-first-u32-be-set-high-bit",
  digest: "816aea79da2edec33a1872295d5e9f631f1e33e9aca3cb46c7152736470f9ab0",
  source_tag: 2171267705,
  source_tag_hex: "0x816AEA79",
  reserved_range: { minimum: 2147483648, maximum: 4294967295 },
  no_testnet_fallback: true,
  assignment_reference: "config/mainnet-source-tag.json",
};

function wrangler(reviewed, overrides = {}) {
  return JSON.stringify({
    vars: { APP_NETWORK: "testnet" },
    env: {
      testnet: { vars: { APP_NETWORK: "testnet" } },
      mainnet: {
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          ALLOW_MAINNET_RUNTIME: reviewed ? "true" : "false",
          MAINNET_GATE_APPROVED: reviewed ? "true" : "false",
          XRPL_MAINNET_SOURCE_TAG: "2171267705",
          MAINNET_SOURCE_TAG_APPROVED: reviewed ? "true" : "false",
          MAINNET_RELEASE_MODE: reviewed ? "internal" : "disabled",
          MAINNET_OPERATIONS_MODE: "halted",
          ...overrides,
        },
      },
    },
  });
}

function evidence(reviewed) {
  return {
    records: [
      {
        id: "production-release-configuration",
        status: reviewed ? "accepted" : "pending",
        runtime_allowed: reviewed,
        gate_approved: reviewed,
        source_tag_approved: reviewed,
        release_mode: reviewed ? "internal" : "disabled",
        operations_mode: "halted",
      },
      {
        id: "assigned-mainnet-source-tag",
        status: "accepted",
        source_tag: assignment.source_tag,
        assignment_reference: assignment.assignment_reference,
        no_testnet_fallback: true,
      },
    ],
  };
}

describe("reviewed Mainnet Source Tag state", () => {
  it("keeps the prepared deployment closed", () => {
    expect(
      assertReviewedMainnetSourceTag({
        assignment,
        wranglerSource: wrangler(false),
        evidence: evidence(false),
      }),
    ).toEqual(assignment);
  });

  it("accepts only the reviewed internal target while operations stay halted", () => {
    expect(
      assertReviewedMainnetSourceTag({
        assignment,
        wranglerSource: wrangler(true),
        evidence: evidence(true),
      }),
    ).toEqual(assignment);
  });

  it("rejects a reviewed target with incomplete approval state", () => {
    expect(() =>
      assertReviewedMainnetSourceTag({
        assignment,
        wranglerSource: wrangler(true, {
          MAINNET_SOURCE_TAG_APPROVED: "false",
        }),
        evidence: evidence(true),
      }),
    ).toThrow("MAINNET_SOURCE_TAG_APPROVED=true");
  });

  it("rejects modified assignments and Testnet leakage", () => {
    expect(() =>
      assertReviewedMainnetSourceTag({
        assignment: { ...assignment, source_tag: assignment.source_tag + 1 },
        wranglerSource: wrangler(true),
        evidence: evidence(true),
      }),
    ).toThrow("assignment is invalid");

    const leaked = JSON.parse(wrangler(true));
    leaked.env.testnet.vars.XRPL_MAINNET_SOURCE_TAG = "2171267705";
    expect(() =>
      assertReviewedMainnetSourceTag({
        assignment,
        wranglerSource: JSON.stringify(leaked),
        evidence: evidence(true),
      }),
    ).toThrow("must not appear in Testnet");
  });
});
