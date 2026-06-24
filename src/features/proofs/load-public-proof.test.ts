import { describe, expect, it } from "vitest";

import { PublicProofNotFoundError } from "./load-public-proof";

describe("PublicProofNotFoundError", () => {
  it("uses a stable public message", () => {
    expect(new PublicProofNotFoundError().message).toBe(
      "The transaction proof is invalid or unavailable.",
    );
  });
});
