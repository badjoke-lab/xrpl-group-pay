import { describe, expect, it } from "vitest";

import {
  CapabilityTokenError,
  createCapabilityToken,
  hashCapabilityToken,
} from "./capabilities";

describe("capability tokens", () => {
  it("creates a 256-bit URL-safe token and hashes its normalized value", async () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
    const token = createCapabilityToken(bytes);

    expect(token).toBe(
      "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    );
    expect(await hashCapabilityToken(token.toUpperCase())).toMatch(
      /^[A-F0-9]{64}$/,
    );
    expect(await hashCapabilityToken(token)).toBe(
      await hashCapabilityToken(token.toUpperCase()),
    );
  });

  it("rejects the wrong entropy length and malformed tokens", async () => {
    expect(() => createCapabilityToken(new Uint8Array(31))).toThrow(
      CapabilityTokenError,
    );
    await expect(hashCapabilityToken("not-a-token")).rejects.toBeInstanceOf(
      CapabilityTokenError,
    );
  });
});
