import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { applyMainnetOperationalStopDrillReport } from "./mainnet-operational-stop-drill-report.mjs";

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }
    values.set(argument.slice(2), value);
    index += 1;
  }
  return {
    reportPath: values.get("report"),
    expectedGitSha: values.get("expected-git-sha"),
    evidencePath:
      values.get("evidence") ??
      resolve(process.cwd(), "config/mainnet-release-evidence.json"),
    acceptancePath:
      values.get("acceptance") ??
      resolve(process.cwd(), "config/mainnet-acceptance.json"),
  };
}
