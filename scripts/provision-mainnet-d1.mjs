export * from "./provision-mainnet-d1-core.mjs";

import { resolve } from "node:path";
import { runMainnetD1Provisioning } from "./provision-mainnet-d1-core.mjs";

function readArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}.`);
    }
    values.set(key.slice(2), value);
    index += 1;
  }
  return {
    mode: values.get("mode") ?? "inspect",
    confirmation: values.get("confirmation") ?? "",
    location: values.get("location"),
    output:
      values.get("output") ?? resolve(process.cwd(), "mainnet-d1-report.json"),
    configOutput:
      values.get("config-output") ??
      resolve(process.cwd(), ".tmp/wrangler.mainnet-provisioned.jsonc"),
    policyPath:
      values.get("policy") ??
      resolve(process.cwd(), "config/mainnet-d1-provisioning.json"),
    wranglerPath:
      values.get("wrangler") ?? resolve(process.cwd(), "wrangler.jsonc"),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMainnetD1Provisioning({
    ...readArgs(process.argv.slice(2)),
    gitSha: process.env.GITHUB_SHA,
  })
    .then((report) =>
      console.log(
        `Mainnet D1 provisioning: mode=${report.mode}, state=${report.state}, migrations=${report.migrations.source_count}`,
      ),
    )
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
