import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { applyMainnetHaltedDeploymentReport } from "./mainnet-halted-deployment-report.mjs";

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
    releasePlanPath:
      values.get("release-plan") ??
      resolve(process.cwd(), "config/mainnet-release-plan.json"),
  };
}

function currentGitSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

export async function importMainnetHaltedDeploymentReport(options = {}) {
  if (!options.reportPath) throw new Error("--report is required.");
  const expectedGitSha = options.expectedGitSha ?? currentGitSha();

  const [reportSource, evidenceSource, acceptanceSource, releasePlanSource] =
    await Promise.all([
      readFile(resolve(options.reportPath), "utf8"),
      readFile(options.evidencePath, "utf8"),
      readFile(options.acceptancePath, "utf8"),
      readFile(options.releasePlanPath, "utf8"),
    ]);

  const result = applyMainnetHaltedDeploymentReport({
    report: JSON.parse(reportSource),
    expectedGitSha,
    evidence: JSON.parse(evidenceSource),
    acceptance: JSON.parse(acceptanceSource),
    releasePlan: JSON.parse(releasePlanSource),
  });

  await Promise.all([
    writeFile(options.evidencePath, `${JSON.stringify(result.evidence, null, 2)}\n`),
    writeFile(
      options.acceptancePath,
      `${JSON.stringify(result.acceptance, null, 2)}\n`,
    ),
    writeFile(
      options.releasePlanPath,
      `${JSON.stringify(result.releasePlan, null, 2)}\n`,
    ),
  ]);

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importMainnetHaltedDeploymentReport(parseArguments(process.argv.slice(2)))
    .then(() =>
      console.log("Imported verified halted Mainnet deployment evidence."),
    )
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
