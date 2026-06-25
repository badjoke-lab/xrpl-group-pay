import { describe, expect, it } from "vitest";

import { PaymentOperationsConfigurationError } from "@/config/payment-operations";

import { handlePaymentOperationsStatusRequest } from "./route";

describe("GET /api/status/payments", () => {
  it("publishes the current non-secret operational state", async () => {
    const response = handlePaymentOperationsStatusRequest({
      readState: () => ({
        network: "mainnet",
        mode: "verify-only",
        creationEnabled: false,
        verificationEnabled: true,
        status: "verification-only",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      network: "mainnet",
      status: "verification-only",
      mode: "verify-only",
      operations: { create: false, verify: true },
    });
  });

  it("fails closed without exposing invalid configuration", async () => {
    const response = handlePaymentOperationsStatusRequest({
      readState: () => {
        throw new PaymentOperationsConfigurationError();
      },
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      schemaVersion: 1,
      network: "unknown",
      status: "unavailable",
      operations: { create: false, verify: false },
    });
  });
});
