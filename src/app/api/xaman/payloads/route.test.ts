import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/xaman/payloads", () => {
  it("rejects non-JSON requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/xaman/payloads", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/xaman/payloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_JSON" },
    });
  });

  it("rejects oversized request bodies before configuration access", async () => {
    const response = await POST(
      new Request("http://localhost/api/xaman/payloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "r".repeat(3_000) }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PAYMENT_REQUEST_TOO_LARGE" },
    });
  });
});
