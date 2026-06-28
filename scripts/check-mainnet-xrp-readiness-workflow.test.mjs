import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/check-mainnet-xrp-readiness.yml",
);

async function workflow() {
  return readFile(workflowPath, "utf8");
}

describe("Mainnet XRP readiness workflow", () => {
  it("is manual, read-only, and restricted to the default branch", async () => {
    const source = await workflow();
    expect(source).toContain("workflow_dispatch:");
    expect(source).toContain("contents: read");
    expect(source).toContain('test "$GITHUB_REF_NAME" = "$DEFAULT_BRANCH"');
    expect(source).toContain("persist-credentials: false");
    expect(source).toContain("cancel-in-progress: false");
  });

  it("requires the controlled accounts, amount, and exact confirmation", async () => {
    const source = await workflow();
    expect(source).toContain("CHECK XRPL GROUP PAY MAINNET XRP ACCEPTANCE");
    expect(source).toContain("destination_address:");
    expect(source).toContain("expected_payer_address:");
    expect(source).toContain("amount_drops:");
    expect(source).toContain(
      "node scripts/check-mainnet-xrp-acceptance-readiness.mjs",
    );
  });

  it("contains no deployment, secret, payment API, or D1 write command", async () => {
    const source = (await workflow()).toLowerCase();
    for (const forbidden of [
      "wrangler deploy",
      "opennextjs-cloudflare deploy",
      "secrets.",
      "/api/payments/",
      "d1 execute",
      "d1 migrations apply",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
