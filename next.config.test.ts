import { describe, expect, it } from "vitest";

import { nextConfig } from "./next.config";

describe("Next.js production output", () => {
  it("emits the standalone tree required by skipped OpenNext transforms", () => {
    expect(nextConfig.output).toBe("standalone");
  });
});
