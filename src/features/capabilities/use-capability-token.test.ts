import { describe, expect, it } from "vitest";

import {
  normalizeCapabilityToken,
  parseCapabilityTokenFromHash,
} from "./use-capability-token";

const TOKEN = "ab".repeat(32).toUpperCase();

describe("capability fragment helpers", () => {
  it("normalizes valid capability values", () => {
    expect(normalizeCapabilityToken(TOKEN)).toBe(TOKEN.toLowerCase());
    expect(normalizeCapabilityToken("invalid")).toBeNull();
    expect(normalizeCapabilityToken(null)).toBeNull();
  });

  it("reads named and direct URL fragments", () => {
    expect(parseCapabilityTokenFromHash(`#token=${TOKEN}`)).toBe(
      TOKEN.toLowerCase(),
    );
    expect(parseCapabilityTokenFromHash(`#${TOKEN}`)).toBe(
      TOKEN.toLowerCase(),
    );
    expect(parseCapabilityTokenFromHash("#token=invalid")).toBeNull();
  });
});
