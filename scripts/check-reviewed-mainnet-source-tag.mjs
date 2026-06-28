import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertMainnetSourceTagAssignment,
} from "./check-mainnet-source-tag.mjs";

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function findOne(records, id) {
  const matches = records.filter((record) => record.id === id);
  if (matches.length !== 1) {
    throw new Error(`Mainnet release evidence must contain one ${id}.`);
  }
  return matches[0];
}

export function assertReviewedMainnetSourceTag({
  assignment,
  wranglerSource,
  evidence,
}) {
  const wrangler = parseJsonc(wranglerSource);
  const releaseConfiguration = findOne(
    evidence.records ?? [],
    "production-release-configuration",
  );

  if (releaseConfiguration.status !== "accepted") {
    return assertMainnetSourceTagAssignment(
      assignment,
      wranglerSource,
      evidence,
    );
  }

  const vars = wrangler?.env?.mainnet?.vars;
  if (!vars) throw new Error("Wrangler must define Mainnet variables.");

  const expected = {
    ALLOW_MAINNET_RUNTIME: "true",
    MAINNET_GATE_APPROVED: "true",
    MAINNET_SOURCE_TAG_APPROVED: "true",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: "halted",
  };
  for (const [name, value] of Object.entries(expected)) {
    if (vars[name] !== value) {
      throw new Error(`Reviewed halted Mainnet target requires ${name}=${value}.`);
    }
  }

  if (
    vars.XRPL_MAINNET_SOURCE_TAG !== String(assignment.source_tag) ||
    releaseConfiguration.source_tag_approved !== true ||
    releaseConfiguration.runtime_allowed !== true ||
    releaseConfiguration.gate_approved !== true ||
    releaseConfiguration.release_mode !== "internal" ||
    releaseConfiguration.operations_mode !== "halted"
  ) {
    throw new Error("Reviewed halted Mainnet Source Tag state is inconsistent.");
  }

  const sourceTag = findOne(
    evidence.records ?? [],
    "assigned-mainnet-source-tag",
  );
  if (
    sourceTag.status !== "accepted" ||
    sourceTag.source_tag !== assignment.source_tag ||
    sourceTag.assignment_reference !== assignment.assignment_reference ||
    sourceTag.no_testnet_fallback !== true
  ) {
    throw new Error("Reviewed Source Tag evidence does not match the assignment.");
  }

  const topLevelVars = wrangler.vars ?? {};
  const testnetVars = wrangler?.env?.testnet?.vars ?? {};
  for (const variables of [topLevelVars, testnetVars]) {
    if (
      Object.hasOwn(variables, "XRPL_MAINNET_SOURCE_TAG") ||
      Object.hasOwn(variables, "MAINNET_SOURCE_TAG_APPROVED")
    ) {
      throw new Error("Mainnet Source Tag configuration must not appear in Testnet targets.");
    }
  }

  return assignment;
}

export async function runReviewedMainnetSourceTagCheck({
  assignmentPath = resolve(process.cwd(), "config/mainnet-source-tag.json"),
  wranglerPath = resolve(process.cwd(), "wrangler.jsonc"),
  evidencePath = resolve(process.cwd(), "config/mainnet-release-evidence.json"),
} = {}) {
  const [assignmentSource, wranglerSource, evidenceSource] = await Promise.all([
    readFile(assignmentPath, "utf8"),
    readFile(wranglerPath, "utf8"),
    readFile(evidencePath, "utf8"),
  ]);
  return assertReviewedMainnetSourceTag({
    assignment: JSON.parse(assignmentSource),
    wranglerSource,
    evidence: JSON.parse(evidenceSource),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runReviewedMainnetSourceTagCheck()
    .then((assignment) =>
      console.log(`Mainnet Source Tag verified: ${assignment.source_tag}.`),
    )
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
