import { describe, expect, it } from "vitest";

import {
  getConfiguredSourceTag,
  SourceTagConfigurationError,
} from "./source-tag";

describe("getConfiguredSourceTag", () => {
  it("parses a configured UInt32 without Xaman credentials", () => {
    expect(getConfiguredSourceTag({ XRPL_SOURCE_TAG: "123456" })).toBe(123456);
  });

  it("rejects missing, negative, and out-of-range values", () => {
    expect(() => getConfiguredSourceTag({})).toThrow(
      SourceTagConfigurationError,
    );
    expect(() => getConfiguredSourceTag({ XRPL_SOURCE_TAG: "-1" })).toThrow(
      SourceTagConfigurationError,
    );
    expect(() =>
      getConfiguredSourceTag({ XRPL_SOURCE_TAG: "4294967296" }),
    ).toThrow(SourceTagConfigurationError);
  });
});
