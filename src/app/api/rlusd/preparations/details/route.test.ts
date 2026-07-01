import { describe, expect, it, vi } from "vitest";

import {
  handleRlusdPreparationDetailsRequest,
  type RlusdPreparationDetailsDependencies,
} from "./route";

const TOKEN = "ab".repeat(32);

function request(body: unknown) {
  return new Request("https://example.test/api/rlusd/preparations/details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rlusd/preparations/details", () => {
  it("loads details only from a body capability", async () => {
    const dependencies = {
      load: vi.fn().mockResolvedValue({
        publicId: "00000000-0000-4000-8000-000000000001",
        status: "required",
      }),
    } satisfies RlusdPreparationDetailsDependencies;

    const response = await handleRlusdPreparationDetailsRequest(
      request({ preparationToken: TOKEN }),
      dependencies,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(dependencies.load).toHaveBeenCalledWith(TOKEN);
  });

  it("uses one not-found boundary for malformed capabilities", async () => {
    const dependencies = {
      load: vi.fn(),
    } satisfies RlusdPreparationDetailsDependencies;
    const response = await handleRlusdPreparationDetailsRequest(
      request({ preparationToken: "invalid" }),
      dependencies,
    );

    expect(response.status).toBe(404);
    expect(dependencies.load).not.toHaveBeenCalled();
  });
});
