import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/payments/verify", () => {
  it("rejects non-JSON requests without touching external services", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "payload",
      }),
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects malformed and invalid payload identifiers", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);

    const invalidId = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payloadId: "not-a-uuid" }),
      }),
    );
    expect(invalidId.status).toBe(400);
  });

  it("rejects oversized verification bodies and declared lengths", async () => {
    const oversizedBody = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payloadId: "x".repeat(600) }),
      }),
    );
    expect(oversizedBody.status).toBe(413);

    const oversizedDeclaredLength = await POST(
      new Request("http://localhost/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "513",
        },
        body: "{}",
      }),
    );
    expect(oversizedDeclaredLength.status).toBe(413);
  });
});
