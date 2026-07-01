import { describe, expect, it, vi } from "vitest";

import type { RlusdTrustSetPlan } from "@/features/xrpl/rlusd-trustset-plan";

import {
  handleCreateRlusdPreparationRequest,
  type RlusdPreparationRouteDependencies,
} from "./route";

const ACCOUNT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const TOKEN = "ab".repeat(32);

function request(body: unknown) {
  return new Request("https://example.test/api/rlusd/preparations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(result: RlusdTrustSetPlan) {
  return {
    create: vi.fn().mockResolvedValue(result),
  } satisfies RlusdPreparationRouteDependencies;
}

describe("POST /api/rlusd/preparations", () => {
  it("returns a fragment capability path for a created preparation", async () => {
    const deps = dependencies({
      status: "created",
      preparationStatus: "required",
      publicId: "00000000-0000-4000-8000-000000000001",
      capabilityToken: TOKEN,
      network: "testnet",
      purpose: "recipient",
      account: ACCOUNT,
      asset: {
        id: "xrpl:testnet:rlusd",
        paymentRail: "xrpl",
        network: "testnet",
        assetType: "issued",
        currency: "524C555344000000000000000000000000000000",
        issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
        precision: 6,
        symbol: "RLUSD",
        verificationStrategy: "xrpl-issued-asset-v1",
        receiptContract: "xrpl-issued-payment-v1",
      },
      requiredAmountUnits: "3000000",
      trustLimitUnits: "3000000",
      trustLimitValue: "3",
    });

    const response = await handleCreateRlusdPreparationRequest(
      request({
        purpose: "recipient",
        account: ACCOUNT,
        requiredAmountUnits: "3000000",
      }),
      deps,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      preparationStatus: "required",
      preparationPath: `/rlusd/prepare#token=${TOKEN}`,
    });
    expect(deps.create).toHaveBeenCalledWith({
      purpose: "recipient",
      account: ACCOUNT,
      requiredAmountUnits: "3000000",
    });
  });

  it("returns confirmed readiness blocks without creating a link", async () => {
    const deps = dependencies({
      status: "blocked",
      reason: "insufficient_xrp_for_trustset",
      network: "testnet",
      account: ACCOUNT,
      assetId: "xrpl:testnet:rlusd",
      requiredXrpDrops: "12000012",
      spendableXrpDrops: "0",
    });

    const response = await handleCreateRlusdPreparationRequest(
      request({
        purpose: "payer",
        account: ACCOUNT,
        requiredAmountUnits: "1000000",
      }),
      deps,
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      readiness: { reason: "insufficient_xrp_for_trustset" },
    });
  });

  it("rejects malformed input before calling the service", async () => {
    const deps = dependencies({
      status: "unavailable",
      reason: "validated_ledger_data_unavailable",
      network: "testnet",
      account: ACCOUNT,
      assetId: "xrpl:testnet:rlusd",
    });
    const response = await handleCreateRlusdPreparationRequest(
      request({ purpose: "recipient", account: "", requiredAmountUnits: "0" }),
      deps,
    );
    expect(response.status).toBe(400);
    expect(deps.create).not.toHaveBeenCalled();
  });
});
