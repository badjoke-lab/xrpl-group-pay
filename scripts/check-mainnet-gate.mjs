import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { parseBuildEnv } from "./env-schema.mjs";

const checkSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    status: z.enum(["pending", "passed", "failed"]),
    evidence: z.string().min(1).nullable(),
  })
  .strict();

const gateSchema = z
  .object({
    schema_version: z.literal(1),
    state: z.enum(["blocked", "ready"]),
    updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checks: z.array(checkSchema).min(1),
  })
  .strict();

export async function readMainnetGate(
  path = resolve(process.cwd(), "config/mainnet-gate.json"),
) {
  const raw = await readFile(path, "utf8");
  const gate = gateSchema.parse(JSON.parse(raw));
  const ids = new Set();
  for (const check of gate.checks) {
    if (ids.has(check.id)) {
      throw new Error(`Mainnet gate check IDs must be unique: ${check.id}`);
    }
    ids.add(check.id);
    if (check.status === "passed" && !check.evidence) {
      throw new Error(`Passed Mainnet gate checks require evidence: ${check.id}`);
    }
  }
  return gate;
}

export function assertMainnetGate(gate) {
  const incomplete = gate.checks.filter((check) => check.status !== "passed");
  if (gate.state !== "ready" || incomplete.length > 0) {
    const detail = incomplete.map((check) => `${check.id}:${check.status}`).join(", ");
    throw new Error(
      `Mainnet gate is blocked${detail ? ` (${detail})` : ""}.`,
    );
  }
}

async function main() {
  const env = parseBuildEnv(process.env);
  const gate = await readMainnetGate();
  const requireMainnet = process.argv.includes("--require-mainnet");

  if (env.appNetwork === "mainnet" || requireMainnet) {
    assertMainnetGate(gate);
    console.log(
      `Mainnet gate approved: mode=${env.mainnetReleaseMode}, checks=${gate.checks.length}`,
    );
    return;
  }

  const passed = gate.checks.filter((check) => check.status === "passed").length;
  console.log(
    `Mainnet remains blocked: state=${gate.state}, passed=${passed}/${gate.checks.length}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Mainnet gate validation failed: ${message}`);
    process.exit(1);
  });
}
