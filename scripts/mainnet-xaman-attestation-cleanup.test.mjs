import { describe, expect, it, vi } from "vitest";

import { probeMainnetXamanPayload } from "./mainnet-xaman-attestation-payload.mjs";

const BASE = "https://xumm.app/api/v1/platform";
const ID = "22222222-2222-4222-8222-222222222222";

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Mainnet Xaman payload cleanup", () => {
  it("attempts cancellation when status validation fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ uuid: ID }))
      .mockResolvedValueOnce(
        json({
          meta: { submit: true, resolved: false, signed: false },
          payload: {
            tx_type: "SignIn",
            request_json: { TransactionType: "SignIn" },
          },
          response: { txid: null, hex: null, account: null },
        }),
      )
      .mockResolvedValueOnce(json({ cancelled: true }));

    await expect(
      probeMainnetXamanPayload({
        baseUrl: BASE,
        headers: {},
        runId: "28250000000",
        instruction: "Provider attestation",
        fetcher,
      }),
    ).rejects.toThrow("safe unresolved SignIn");

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2][1].method).toBe("DELETE");
  });
});
