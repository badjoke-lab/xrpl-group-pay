import { describe, expect, it } from "vitest";

import {
  resolveXrplSourceTag,
  XrplSourceTagConfigurationError,
} from "./xrpl-source-tag";

describe("resolveXrplSourceTag", () => {
  it("keeps the legacy Testnet variable compatible", () => {
    expect(resolveXrplSourceTag({ XRPL_SOURCE_TAG: "123" }, "testnet")).toBe(
      123,
    );
  });

  it("prefers the explicit Testnet variable over the legacy fallback", () => {
    expect(
      resolveXrplSourceTag(
        {
          XRPL_SOURCE_TAG: "123",
          XRPL_TESTNET_SOURCE_TAG: "456",
        },
        "testnet",
      ),
    ).toBe(456);
  });

  it("never falls back to a Testnet or legacy tag for Mainnet", () => {
    expect(() =>
      resolveXrplSourceTag(
        {
          XRPL_SOURCE_TAG: "123",
          XRPL_TESTNET_SOURCE_TAG: "456",
          MAINNET_GATE_APPROVED: "true",
          MAINNET_SOURCE_TAG_APPROVED: "true",
        },
        "mainnet",
      ),
    ).toThrow("XRPL_MAINNET_SOURCE_TAG");
  });

  it("requires both Mainnet approvals before resolving the Mainnet tag", () => {
    expect(() =>
      resolveXrplSourceTag(
        { XRPL_MAINNET_SOURCE_TAG: "789" },
        "mainnet",
      ),
    ).toThrow("MAINNET_GATE_APPROVED=true");

    expect(() =>
      resolveXrplSourceTag(
        {
          XRPL_MAINNET_SOURCE_TAG: "789",
          MAINNET_GATE_APPROVED: "true",
        },
        "mainnet",
      ),
    ).toThrow("MAINNET_SOURCE_TAG_APPROVED=true");
  });

  it("accepts the full UInt32 range and rejects invalid values", () => {
    expect(
      resolveXrplSourceTag(
        {
          XRPL_MAINNET_SOURCE_TAG: "4294967295",
          MAINNET_GATE_APPROVED: "true",
          MAINNET_SOURCE_TAG_APPROVED: "true",
        },
        "mainnet",
      ),
    ).toBe(4_294_967_295);

    for (const value of ["-1", "1.5", "4294967296", "tag", ""]) {
      expect(() =>
        resolveXrplSourceTag(
          { XRPL_TESTNET_SOURCE_TAG: value },
          "testnet",
        ),
      ).toThrow(XrplSourceTagConfigurationError);
    }
  });
});
