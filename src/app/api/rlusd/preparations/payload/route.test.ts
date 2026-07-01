import { describe, expect, it, vi } from "vitest";

import {
  handleRlusdPreparationPayloadRequest,
  type RlusdPreparationPayloadDependencies,
} from "./route";

const TOKEN = "ab".repeat(32);

function request(body: unknown) {
  return new Request("https://example.test/api/rlusd/preparations/payload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rlusd/preparations/payload", () => {
  it("creates or resumes a handoff from the preparation capability", async () => {
    const dependencies = {
      create: vi.fn().mockResolvedValue({
        status: "awaiting_signature",
        payloadId: "22222222-2222-4222-8222-222222222222",
      }),
    } satisfies RlusdPreparationPayloadDependencies;

    const response = await handleRlusdPreparationPayloadRequest(
      request({ preparationToken: TOKEN }),
      dependencies,
    );

    expect(response.status).toBe(201);
    expect(dependencies.create).toHaveBeenCalledWith(TOKEN);
    await expect(response.json()).resolves.toMatchObject({
      status: "awaiting_signature",
    });
  });

  it("does not call Xaman dependencies for malformed capabilities", async () => {
    const dependencies = {
      create: vi.fn(),
    } satisfies RlusdPreparationPayloadDependencies;

    const response = await handleRlusdPreparationPayloadRequest(
      request({ preparationToken: "invalid" }),
      dependencies,
    );
    expect(response.status).toBe(404);
    expect(dependencies.create).not.toHaveBeenCalled();
  });
});
