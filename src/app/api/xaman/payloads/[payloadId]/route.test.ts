import { describe, expect, it, vi } from "vitest";

import { UnknownXamanPayloadError } from "@/features/xaman/payload-lifecycle";

import {
  handleXamanPayloadStatusRequest,
  type XamanPayloadStatusRouteDependencies,
} from "./route";

const payloadId = "22222222-2222-4222-8222-222222222222";
const txid = "A".repeat(64);

function context(id = payloadId) {
  return { params: Promise.resolve({ payloadId: id }) };
}

function dependencies(): XamanPayloadStatusRouteDependencies & {
  synchronize: ReturnType<typeof vi.fn>;
} {
  return {
    synchronize: vi.fn().mockResolvedValue({
      payload: {
        meta: {
          resolved: true,
          signed: true,
          expired: false,
          cancelled: false,
        },
      },
      publicStatus: { status: "submitted", txid },
    }),
  };
}

describe("GET /api/xaman/payloads/:payloadId", () => {
  it("returns synchronized provider status without claiming payment", async () => {
    const deps = dependencies();
    const response = await handleXamanPayloadStatusRequest(context(), deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      payloadId,
      status: "submitted",
      txid,
      resolved: true,
      signed: true,
      expired: false,
      cancelled: false,
    });
    expect(deps.synchronize).toHaveBeenCalledWith(payloadId);
  });

  it("rejects malformed identifiers before synchronization", async () => {
    const deps = dependencies();
    const response = await handleXamanPayloadStatusRequest(
      context("invalid"),
      deps,
    );

    expect(response.status).toBe(400);
    expect(deps.synchronize).not.toHaveBeenCalled();
  });

  it("uses a uniform not-found response for unknown payloads", async () => {
    const deps = dependencies();
    deps.synchronize.mockRejectedValue(new UnknownXamanPayloadError());

    const response = await handleXamanPayloadStatusRequest(context(), deps);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PAYLOAD_NOT_FOUND" },
    });
  });
});
