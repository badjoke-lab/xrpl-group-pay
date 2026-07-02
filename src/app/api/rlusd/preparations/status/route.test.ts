import { describe, expect, it, vi } from "vitest";

import {
  handleRlusdPreparationStatusRequest,
  type RlusdPreparationStatusDependencies,
} from "./route";

const TOKEN = "ab".repeat(32);

function request(body: unknown) {
  return new Request("https://example.test/api/rlusd/preparations/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rlusd/preparations/status", () => {
  it("returns the synchronized preparation rather than a payment result", async () => {
    const dependencies = {
      synchronize: vi.fn().mockResolvedValue({
        status: "verifying",
        providerStatus: "submitted",
        transactionId: "A".repeat(64),
      }),
    } satisfies RlusdPreparationStatusDependencies;

    const response = await handleRlusdPreparationStatusRequest(
      request({ preparationToken: TOKEN }),
      dependencies,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "verifying",
      providerStatus: "submitted",
      transactionId: "A".repeat(64),
    });
    expect(dependencies.synchronize).toHaveBeenCalledWith(TOKEN);
  });

  it("rejects malformed capability input before synchronization", async () => {
    const dependencies = {
      synchronize: vi.fn(),
    } satisfies RlusdPreparationStatusDependencies;
    const response = await handleRlusdPreparationStatusRequest(
      request({ preparationToken: "invalid" }),
      dependencies,
    );

    expect(response.status).toBe(404);
    expect(dependencies.synchronize).not.toHaveBeenCalled();
  });
});
