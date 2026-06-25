import { describe, expect, it, vi } from "vitest";

import { PaymentOperationsHaltedError } from "@/config/payment-operations";
import type { AssetPaymentVerificationApiOutcome } from "@/features/payment-verification/asset-api-outcome";

import {
  handleVerificationRequest,
  type VerificationRouteDependencies,
} from "./route";

const PAYMENT_TOKEN = "a".repeat(64);
const PAYLOAD_ID = "123e4567-e89b-12d3-a456-426614174000";

function request() {
  return new Request("http://localhost/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentToken: PAYMENT_TOKEN,
      payloadId: PAYLOAD_ID,
    }),
  });
}

describe("payment verification operational switch", () => {
  it("returns a retryable halt without reading provider or ledger state", async () => {
    const verifyAndRecord = vi.fn<
      VerificationRouteDependencies["verifyAndRecord"]
    >().mockRejectedValue(new PaymentOperationsHaltedError("verify", "halted"));

    const response = await handleVerificationRequest(request(), {
      verifyAndRecord,
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "verify",
        mode: "halted",
      },
    });
    expect(verifyAndRecord).toHaveBeenCalledTimes(1);
  });

  it("keeps successful verification responses compatible when allowed", async () => {
    const outcome: AssetPaymentVerificationApiOutcome = {
      status: "pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: "A".repeat(64),
      message: "Pending",
    };
    const verifyAndRecord = vi.fn().mockResolvedValue(outcome);

    const response = await handleVerificationRequest(request(), {
      verifyAndRecord,
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(outcome);
  });
});
