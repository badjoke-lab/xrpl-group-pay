import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { applyMainnetXamanAttestationReport } from "./mainnet-xaman-attestation-report.mjs";

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

function currentGitSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

export async function importMainnetXamanAttestationReport(options = {}) {
  if (!options.reportPath) throw new Error("--report is required.");
  const expectedGitSha = options.expectedGitSha ?? currentGitSha();
  const [reportSource, evidenceSource, acceptanceSource] = await Promise.all([
    readFile(resolve(options.reportPath), "utf8"),
    readFile(options.evidencePath, "utf8"),
    readFile(options.acceptancePath, "utf8"),
  ]);

  const result = applyMainnetXamanAttestationReport({
    report: JSON.parse(reportSource),
    expectedGitSha,
    evidence: JSON.parse(evidenceSource),
    acceptance: JSON.parse(acceptanceSource),
  });

  await Promise.all([
    writeFile(options.evidencePath, `${JSON.stringify(result.evidence, null, 2)}\n`),
    writeFile(
      options.acceptancePath,
      `${JSON.stringify(result.acceptance, null, 2)}\n`,
    ),
  ]);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importMainnetXamanAttestationReport(parseArguments(process.argv.slice(2)))
    .then(() => console.log("Imported verified Mainnet Xaman attestation evidence."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
