import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { assertMainnetXrpAcceptanceReadiness } from "./check-mainnet-xrp-acceptance-readiness.mjs";

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

async function repositoryState() {
  const root = process.cwd();
  const [contract, releasePlan, evidence, acceptance, productionTarget, wrangler] =
    await Promise.all([
      readFile(resolve(root, "config/mainnet-xrp-acceptance.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "config/production-target.json"), "utf8").then(JSON.parse),
      readFile(resolve(root, "wrangler.jsonc"), "utf8").then(parseJsonc),
    ]);
  return { contract, releasePlan, evidence, acceptance, productionTarget, wrangler };
}

const input = {
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  amountDrops: "1",
  confirmation: "CHECK XRPL GROUP PAY MAINNET XRP ACCEPTANCE",
};

describe("controlled Mainnet XRP readiness", () => {
  it("accepts the current halted and isolated production state", async () => {
    const summary = assertMainnetXrpAcceptanceReadiness({
      ...(await repositoryState()),
      ...input,
    });
    expect(summary).toEqual({
      network: "mainnet",
      stage: "live-xrp-acceptance",
      destinationAddress: input.destinationAddress,
      expectedPayerAddress: input.expectedPayerAddress,
      amountDrops: "1",
      assetId: "xrpl:mainnet:xrp",
      sourceTag: 2171267705,
      baselineOperationsMode: "halted",
      releaseDecision: "blocked",
    });
  });

  it("rejects unsafe amount and account inputs", async () => {
    const state = await repositoryState();
    expect(() =>
      assertMainnetXrpAcceptanceReadiness({
        ...state,
        ...input,
        amountDrops: "1001",
      }),
    ).toThrow("between 1 and 1000 drops");
    expect(() =>
      assertMainnetXrpAcceptanceReadiness({
        ...state,
        ...input,
        expectedPayerAddress: "not-an-xrpl-address",
      }),
    ).toThrow("classic XRPL addresses");
  });

  it("rejects a stale stage or previously accepted XRP evidence", async () => {
    const state = await repositoryState();
    const stalePlan = structuredClone(state.releasePlan);
    stalePlan.current_stage = "live-rlusd-acceptance";
    expect(() =>
      assertMainnetXrpAcceptanceReadiness({
        ...state,
        releasePlan: stalePlan,
        ...input,
      }),
    ).toThrow("not at controlled Mainnet XRP acceptance");

    const acceptedEvidence = structuredClone(state.evidence);
    acceptedEvidence.records.find(
      (record) => record.id === "live-mainnet-xrp-acceptance",
    ).status = "accepted";
    expect(() =>
      assertMainnetXrpAcceptanceReadiness({
        ...state,
        evidence: acceptedEvidence,
        ...input,
      }),
    ).toThrow("evidence state is not ready");
  });

  it("rejects an enabled baseline or a shared production database", async () => {
    const state = await repositoryState();
    const enabled = structuredClone(state.wrangler);
    enabled.env.mainnet.vars.MAINNET_OPERATIONS_MODE = "enabled";
    expect(() =>
      assertMainnetXrpAcceptanceReadiness({
        ...state,
        wrangler: enabled,
        ...input,
      }),
    ).toThrow("not safely halted and isolated");

    const shared = structuredClone(state.wrangler);
    const database = shared.env.mainnet.d1_databases[0];
    database.preview_database_id = database.database_id;
    expect(() =>
      assertMainnetXrpAcceptanceReadiness({
        ...state,
        wrangler: shared,
        ...input,
      }),
    ).toThrow("not safely halted and isolated");
  });
});
