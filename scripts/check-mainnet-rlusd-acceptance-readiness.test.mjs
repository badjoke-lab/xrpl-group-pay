import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { assertMainnetRlusdAcceptanceReadiness } from "./check-mainnet-rlusd-acceptance-readiness.mjs";

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

async function repositoryState() {
  const root = process.cwd();
  const [
    contract,
    releasePlan,
    evidence,
    acceptance,
    productionTarget,
    wrangler,
    assetRegistry,
  ] = await Promise.all([
    readFile(resolve(root, "config/mainnet-rlusd-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/production-target.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "wrangler.jsonc"), "utf8").then(parseJsonc),
    readFile(resolve(root, "config/xrpl-mainnet-assets.json"), "utf8").then(
      JSON.parse,
    ),
  ]);

  return {
    contract,
    releasePlan,
    evidence,
    acceptance,
    productionTarget,
    wrangler,
    assetRegistry,
  };
}

const input = {
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  destinationTag: null,
  expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  amountUnits: "1",
  confirmation: "CHECK XRPL GROUP PAY MAINNET RLUSD ACCEPTANCE",
};

describe("controlled Mainnet RLUSD readiness", () => {
  it("accepts the current halted post-XRP production state", async () => {
    const summary = assertMainnetRlusdAcceptanceReadiness({
      ...(await repositoryState()),
      ...input,
    });

    expect(summary).toEqual({
      network: "mainnet",
      stage: "live-rlusd-acceptance",
      destinationAddress: input.destinationAddress,
      destinationTag: null,
      expectedPayerAddress: input.expectedPayerAddress,
      primaryAmountUnits: "1",
      primaryAmountValue: "0.000001",
      billTotalUnits: "2",
      billTotalValue: "0.000002",
      assetId: "xrpl:mainnet:rlusd",
      currency: "524C555344000000000000000000000000000000",
      issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
      sourceTag: 2171267705,
      recipientReadinessRequired: true,
      payerBalanceRequired: true,
      baselineOperationsMode: "halted",
      releaseDecision: "blocked",
    });
  });

  it("rejects unsafe amount, account, and Destination Tag inputs", async () => {
    const state = await repositoryState();

    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        ...input,
        amountUnits: "1000001",
      }),
    ).toThrow("between 1 and 1000000 units");

    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        ...input,
        expectedPayerAddress: "not-an-xrpl-address",
      }),
    ).toThrow("classic XRPL addresses");

    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        ...input,
        expectedPayerAddress: input.destinationAddress,
      }),
    ).toThrow("must be different");

    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        ...input,
        destinationTag: "4294967296",
      }),
    ).toThrow("UInt32");
  });

  it("rejects a stale stage or incomplete XRP evidence", async () => {
    const state = await repositoryState();

    const stalePlan = structuredClone(state.releasePlan);
    stalePlan.current_stage = "final-release-audit";
    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        releasePlan: stalePlan,
        ...input,
      }),
    ).toThrow("not at controlled Mainnet RLUSD acceptance");

    const pendingXrp = structuredClone(state.evidence);
    pendingXrp.records.find(
      (record) => record.id === "live-mainnet-xrp-acceptance",
    ).status = "pending";
    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        evidence: pendingXrp,
        ...input,
      }),
    ).toThrow("evidence state is not ready");
  });

  it("rejects an enabled baseline or shared production database", async () => {
    const state = await repositoryState();

    const enabled = structuredClone(state.wrangler);
    enabled.env.mainnet.vars.MAINNET_OPERATIONS_MODE = "enabled";
    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        wrangler: enabled,
        ...input,
      }),
    ).toThrow("not safely halted and isolated");

    const shared = structuredClone(state.wrangler);
    const database = shared.env.mainnet.d1_databases[0];
    database.preview_database_id = database.database_id;
    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        wrangler: shared,
        ...input,
      }),
    ).toThrow("not safely halted and isolated");
  });

  it("rejects a non-canonical RLUSD issuer", async () => {
    const state = await repositoryState();
    const registry = structuredClone(state.assetRegistry);
    registry.assets.find(
      (asset) => asset.id === "xrpl:mainnet:rlusd",
    ).issuer = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

    expect(() =>
      assertMainnetRlusdAcceptanceReadiness({
        ...state,
        assetRegistry: registry,
        ...input,
      }),
    ).toThrow("identity is not canonical");
  });
});
