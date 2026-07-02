import { describe, expect, it, vi } from "vitest";

import {
  BillRecoveryDatabaseError,
  BillRecoveryNotFoundError,
  BillRecoveryStateError,
} from "@/features/bills/bill-recovery-management";

import {
  handleBillRecoveryRequest,
  type BillRecoveryRouteDependencies,
} from "./route";

const TOKEN = "ab".repeat(32);
const SLOT_ID = "00000000-0000-4000-8000-000000000001";

function request(body: unknown, headers: HeadersInit = { "Content-Type": "application/json" }) {
  return new Request("http://localhost/api/bills/recovery", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function dependencies(): BillRecoveryRouteDependencies & {
  execute: ReturnType<typeof vi.fn>;
} {
  return { execute: vi.fn().mockResolvedValue({ ok: true }) };
}

describe("POST /api/bills/recovery", () => {
  it("loads management review data without caching", async () => {
    const deps = dependencies();
    const response = await handleBillRecoveryRequest(
      request({ action: "load", adminToken: TOKEN }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.execute).toHaveBeenCalledWith({
      action: "load",
      adminToken: TOKEN,
    });
  });

  it("requires both repeated-payment warnings for retry authorization", async () => {
    const deps = dependencies();
    const response = await handleBillRecoveryRequest(
      request({
        action: "authorize_retry",
        adminToken: TOKEN,
        slotPublicId: SLOT_ID,
        acknowledgePossiblePriorPayment: true,
        acknowledgeDoublePaymentRisk: false,
      }),
      deps,
    );

    expect(response.status).toBe(400);
    expect(deps.execute).not.toHaveBeenCalled();
  });

  it("requires exact destructive closure confirmation", async () => {
    const deps = dependencies();
    const response = await handleBillRecoveryRequest(
      request({
        action: "close_incomplete",
        adminToken: TOKEN,
        reasonCode: "collection_ended",
        confirmation: "close",
        acknowledgeStopsPayments: true,
        acknowledgeNoAutomaticRefunds: true,
      }),
      deps,
    );

    expect(response.status).toBe(400);
    expect(deps.execute).not.toHaveBeenCalled();
  });

  it("keeps unknown capabilities indistinguishable", async () => {
    const deps = dependencies();
    deps.execute.mockRejectedValue(new BillRecoveryNotFoundError());
    const response = await handleBillRecoveryRequest(
      request({ action: "load", adminToken: TOKEN }),
      deps,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BILL_RECOVERY_NOT_FOUND" },
    });
  });

  it("maps state conflicts and confirmation requirements", async () => {
    const conflict = dependencies();
    conflict.execute.mockRejectedValue(
      new BillRecoveryStateError(
        "REVIEW_NOT_ACTIONABLE",
        "Review is not actionable.",
      ),
    );
    const conflictResponse = await handleBillRecoveryRequest(
      request({ action: "load", adminToken: TOKEN }),
      conflict,
    );
    expect(conflictResponse.status).toBe(409);

    const confirmation = dependencies();
    confirmation.execute.mockRejectedValue(
      new BillRecoveryStateError(
        "CLOSURE_CONFIRMATION_REQUIRED",
        "Confirmation required.",
      ),
    );
    const confirmationResponse = await handleBillRecoveryRequest(
      request({ action: "load", adminToken: TOKEN }),
      confirmation,
    );
    expect(confirmationResponse.status).toBe(422);
  });

  it("keeps storage failures retryable", async () => {
    const deps = dependencies();
    deps.execute.mockRejectedValue(new BillRecoveryDatabaseError());
    const response = await handleBillRecoveryRequest(
      request({ action: "load", adminToken: TOKEN }),
      deps,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("15");
  });

  it("rejects unsupported and oversized requests", async () => {
    const unsupported = await handleBillRecoveryRequest(
      request({ action: "load", adminToken: TOKEN }, { "Content-Type": "text/plain" }),
      dependencies(),
    );
    expect(unsupported.status).toBe(415);

    const oversized = await handleBillRecoveryRequest(
      new Request("http://localhost/api/bills/recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "4096",
        },
        body: JSON.stringify({ action: "load", adminToken: TOKEN, padding: "x".repeat(3000) }),
      }),
      dependencies(),
    );
    expect(oversized.status).toBe(413);
  });
});
