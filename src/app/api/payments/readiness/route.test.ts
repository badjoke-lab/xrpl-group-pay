import { describe, expect, it, vi } from "vitest";

import type { AssetReadinessAssessment } from "@/features/xrpl/asset-readiness";

import {
  handlePaymentReadinessRequest,
  type PaymentReadinessRouteDependencies,
} from "./route";

const token = "a".repeat(64);

function assessment(
  role: "payer" | "recipient",
  status: "ready" | "blocked" | "unavailable" = "ready",
): AssetReadinessAssessment {
  return {
    strategyId: "xrpl-asset-readiness-v1",
    role,
    status,
    ready: status === "ready",
    network: "testnet",
    account: role === "payer" ? "rPayer" : "rRecipient",
    assetId: "xrpl:testnet:xrp",
    amountUnits: "4000000",
    checks: [
      {
        code: status === "ready" ? "account_exists" : "validated_ledger_data_unavailable",
        status:
          status === "ready"
            ? "pass"
            : status === "blocked"
              ? "block"
              : "unavailable",
      },
    ],
    blockingCode: status === "blocked" ? "account_not_found" : null,
    unavailableCode:
      status === "unavailable" ? "validated_ledger_data_unavailable" : null,
    userMessageKey: `readiness.${role}.${status}`,
    observedAt: "2026-07-02T00:00:00.000Z",
    facts: {},
  };
}

function request(body: unknown = { paymentToken: token }) {
  return new Request("http://localhost/api/payments/readiness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(
  payer = assessment("payer"),
  recipient = assessment("recipient"),
): PaymentReadinessRouteDependencies & {
  assess: ReturnType<typeof vi.fn>;
} {
  return {
    assess: vi.fn().mockResolvedValue({ payer, recipient }),
  };
}

describe("POST /api/payments/readiness", () => {
  it("returns capability-bound payer and recipient assessments without caching", async () => {
    const deps = dependencies();
    const response = await handlePaymentReadinessRequest(request(), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.assess).toHaveBeenCalledWith(token);
    await expect(response.json()).resolves.toMatchObject({
      payer: { status: "ready", role: "payer" },
      recipient: { status: "ready", role: "recipient" },
    });
  });

  it("keeps temporary ledger failure distinct from a confirmed blocker", async () => {
    const deps = dependencies(assessment("payer", "unavailable"));
    const response = await handlePaymentReadinessRequest(request(), deps);

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("15");
    await expect(response.json()).resolves.toMatchObject({
      payer: {
        status: "unavailable",
        unavailableCode: "validated_ledger_data_unavailable",
        blockingCode: null,
      },
    });
  });

  it("rejects malformed capabilities without running ledger checks", async () => {
    const deps = dependencies();
    const response = await handlePaymentReadinessRequest(
      request({ paymentToken: "bad" }),
      deps,
    );

    expect(response.status).toBe(404);
    expect(deps.assess).not.toHaveBeenCalled();
  });
});
