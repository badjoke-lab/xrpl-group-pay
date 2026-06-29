import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildHaltedMainnetWrangler } from "./mainnet-halted-deployment-config.mjs";

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

describe("current halted Mainnet stage", () => {
  it("builds the reviewed target from committed state", () => {
    const root = process.cwd();
    const generated = buildHaltedMainnetWrangler({
      contract: JSON.parse(
        readFileSync(resolve(root, "config/mainnet-halted-deployment.json"), "utf8"),
      ),
      wrangler: parseJsonc(
        readFileSync(resolve(root, "wrangler.jsonc"), "utf8"),
      ),
      releasePlan: JSON.parse(
        readFileSync(resolve(root, "config/mainnet-release-plan.json"), "utf8"),
      ),
      evidence: JSON.parse(
        readFileSync(resolve(root, "config/mainnet-release-evidence.json"), "utf8"),
      ),
    });

    expect(generated.d1_databases).toBeUndefined();
    expect(generated.env.mainnet.vars.MAINNET_RELEASE_MODE).toBe("internal");
    expect(generated.env.mainnet.vars.MAINNET_OPERATIONS_MODE).toBe("halted");
    expect(generated.env.mainnet.d1_databases[0].binding).toBe(
      "PAYMENTS_DB_MAINNET",
    );
  });
});
