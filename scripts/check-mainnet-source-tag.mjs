import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const assignmentSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    assignment_status: z.literal("assigned"),
    approval_status: z.literal("pending"),
    assigned_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    namespace: z.string().min(1),
    algorithm: z.literal("sha256-first-u32-be-set-high-bit"),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    source_tag: z.number().int().min(2_147_483_648).max(4_294_967_295),
    source_tag_hex: z.string().regex(/^0x[0-9A-F]{8}$/),
    reserved_range: z
      .object({
        minimum: z.literal(2_147_483_648),
        maximum: z.literal(4_294_967_295),
      })
      .strict(),
    no_testnet_fallback: z.literal(true),
    assignment_reference: z.literal("config/mainnet-source-tag.json"),
  })
  .strict();

function parseJsonc(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments);
}

export function deriveMainnetSourceTag(namespace) {
  const digest = createHash("sha256").update(namespace).digest();
  const sourceTag = digest.readUInt32BE(0) | 0x80000000;
  const unsignedSourceTag = sourceTag >>> 0;
  return {
    digest: digest.toString("hex"),
    sourceTag: unsignedSourceTag,
    sourceTagHex: `0x${unsignedSourceTag.toString(16).toUpperCase().padStart(8, "0")}`,
  };
}

export function assertMainnetSourceTagAssignment(
  rawAssignment,
  wranglerSource,
  evidence,
) {
  const assignment = assignmentSchema.parse(rawAssignment);
  const derived = deriveMainnetSourceTag(assignment.namespace);
  if (
    assignment.digest !== derived.digest ||
    assignment.source_tag !== derived.sourceTag ||
    assignment.source_tag_hex !== derived.sourceTagHex
  ) {
    throw new Error("Mainnet Source Tag assignment does not match its deterministic derivation.");
  }

  const wrangler = parseJsonc(wranglerSource);
  const mainnetVars = wrangler?.env?.mainnet?.vars;
  if (!mainnetVars) {
    throw new Error("Wrangler must define Mainnet variables.");
  }
  if (mainnetVars.XRPL_MAINNET_SOURCE_TAG !== String(assignment.source_tag)) {
    throw new Error("Wrangler Mainnet Source Tag does not match the assignment record.");
  }

  const safeDefaults = {
    ALLOW_MAINNET_RUNTIME: "false",
    MAINNET_GATE_APPROVED: "false",
    MAINNET_SOURCE_TAG_APPROVED: "false",
    MAINNET_RELEASE_MODE: "disabled",
    MAINNET_OPERATIONS_MODE: "halted",
  };
  for (const [name, expected] of Object.entries(safeDefaults)) {
    if (mainnetVars[name] !== expected) {
      throw new Error(`Mainnet Source Tag assignment requires ${name}=${expected}.`);
    }
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

  const records = evidence?.records ?? [];
  const matches = records.filter(
    (record) => record.id === "assigned-mainnet-source-tag",
  );
  if (matches.length !== 1) {
    throw new Error("Mainnet release evidence must contain one Source Tag record.");
  }
  const record = matches[0];
  if (record.status === "accepted") {
    if (
      record.source_tag !== assignment.source_tag ||
      record.assignment_reference !== assignment.assignment_reference ||
      record.no_testnet_fallback !== true
    ) {
      throw new Error("Accepted Source Tag evidence does not match the assignment record.");
    }
  } else if (
    record.status !== "pending" ||
    record.source_tag !== null ||
    record.assignment_reference !== null ||
    record.no_testnet_fallback !== false
  ) {
    throw new Error("Pending Source Tag evidence must remain empty until reviewed.");
  }

  return assignment;
}

export async function runMainnetSourceTagCheck({
  assignmentPath = resolve(process.cwd(), "config/mainnet-source-tag.json"),
  wranglerPath = resolve(process.cwd(), "wrangler.jsonc"),
  evidencePath = resolve(process.cwd(), "config/mainnet-release-evidence.json"),
} = {}) {
  const [assignmentSource, wranglerSource, evidenceSource] = await Promise.all([
    readFile(assignmentPath, "utf8"),
    readFile(wranglerPath, "utf8"),
    readFile(evidencePath, "utf8"),
  ]);
  return assertMainnetSourceTagAssignment(
    JSON.parse(assignmentSource),
    wranglerSource,
    JSON.parse(evidenceSource),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMainnetSourceTagCheck()
    .then((assignment) => {
      console.log(
        `Mainnet Source Tag assignment verified: ${assignment.source_tag} (${assignment.source_tag_hex}).`,
      );
    })
    .catch((error) => {
      console.error(
        `Mainnet Source Tag assignment check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
