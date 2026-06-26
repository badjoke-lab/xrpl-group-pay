import { describe, expect, it } from "vitest";

import {
  assertMainnetSourceTagAssignment,
  deriveMainnetSourceTag,
} from "./check-mainnet-source-tag.mjs";

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

function wrangler(overrides = {}) {
  return JSON.stringify({
    vars: { APP_NETWORK: "testnet" },
    env: {
      testnet: { vars: { APP_NETWORK: "testnet" } },
      mainnet: {
        vars: {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          ALLOW_MAINNET_RUNTIME: "false",
          MAINNET_GATE_APPROVED: "false",
          XRPL_MAINNET_SOURCE_TAG: "2171267705",
          MAINNET_SOURCE_TAG_APPROVED: "false",
          MAINNET_RELEASE_MODE: "disabled",
          MAINNET_OPERATIONS_MODE: "halted",
          ...overrides,
        },
      },
    },
  });
}

function pendingEvidence() {
  return {
    records: [
      {
        id: "assigned-mainnet-source-tag",
        status: "pending",
        source_tag: null,
        assignment_reference: null,
        no_testnet_fallback: false,
      },
    ],
  };
}

describe("Mainnet Source Tag assignment", () => {
  it("derives the assigned UInt32 deterministically", () => {
    expect(deriveMainnetSourceTag(assignment.namespace)).toEqual({
      digest: assignment.digest,
      sourceTag: assignment.source_tag,
      sourceTagHex: assignment.source_tag_hex,
    });
  });

  it("accepts the committed value while approval and runtime remain closed", () => {
    expect(
      assertMainnetSourceTagAssignment(
        assignment,
        wrangler(),
        pendingEvidence(),
      ),
    ).toEqual(assignment);
  });

  it("rejects a modified derivation or mismatched Wrangler value", () => {
    expect(() =>
      assertMainnetSourceTagAssignment(
        { ...assignment, source_tag: assignment.source_tag + 1 },
        wrangler(),
        pendingEvidence(),
      ),
    ).toThrow("deterministic derivation");

    expect(() =>
      assertMainnetSourceTagAssignment(
        assignment,
        wrangler({ XRPL_MAINNET_SOURCE_TAG: "7" }),
        pendingEvidence(),
      ),
    ).toThrow("does not match");
  });

  it("rejects premature approval, runtime opening, and Testnet leakage", () => {
    expect(() =>
      assertMainnetSourceTagAssignment(
        assignment,
        wrangler({ MAINNET_SOURCE_TAG_APPROVED: "true" }),
        pendingEvidence(),
      ),
    ).toThrow("MAINNET_SOURCE_TAG_APPROVED=false");

    expect(() =>
      assertMainnetSourceTagAssignment(
        assignment,
        wrangler({ ALLOW_MAINNET_RUNTIME: "true" }),
        pendingEvidence(),
      ),
    ).toThrow("ALLOW_MAINNET_RUNTIME=false");

    const leaked = JSON.parse(wrangler());
    leaked.env.testnet.vars.XRPL_MAINNET_SOURCE_TAG = "2171267705";
    expect(() =>
      assertMainnetSourceTagAssignment(
        assignment,
        JSON.stringify(leaked),
        pendingEvidence(),
      ),
    ).toThrow("must not appear in Testnet");
  });

  it("accepts exact reviewed evidence and rejects conflicting evidence", () => {
    const accepted = {
      records: [
        {
          id: "assigned-mainnet-source-tag",
          status: "accepted",
          source_tag: assignment.source_tag,
          assignment_reference: assignment.assignment_reference,
          no_testnet_fallback: true,
        },
      ],
    };
    expect(() =>
      assertMainnetSourceTagAssignment(assignment, wrangler(), accepted),
    ).not.toThrow();

    accepted.records[0].source_tag += 1;
    expect(() =>
      assertMainnetSourceTagAssignment(assignment, wrangler(), accepted),
    ).toThrow("does not match");
  });
});
