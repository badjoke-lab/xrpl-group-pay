import { describe, expect, it, vi } from "vitest";

import { runMainnetXamanAttestation } from "./mainnet-xaman-attestation-runner.mjs";

const API_BASE = "https://xumm.app/api/v1/platform";
const APP_ID = "11111111-1111-4111-8111-111111111111";
const PAYLOAD_ID = "22222222-2222-4222-8222-222222222222";
const CALLBACK = "https://pay.example.com/api/xaman/callback";
const SHA = "a".repeat(40);

function config() {
  return {
    schema_version: 1,
    network: "mainnet",
    api_base_url: API_BASE,
    confirmation: "ATTEST XRPL GROUP PAY XAMAN MAINNET",
    payload: {
      transaction_type: "SignIn",
      force_network: "MAINNET",
      submit: false,
      expire_minutes: 1,
      instruction: "Provider attestation",
    },
  };
}

function environment() {
  const result = {
    MAINNET_XAMAN_ATTESTATION_CONFIRMATION:
      "ATTEST XRPL GROUP PAY XAMAN MAINNET",
    MAINNET_XAMAN_CALLBACK_URL: CALLBACK,
    GITHUB_SHA: SHA,
    GITHUB_RUN_ID: "28250000000",
    GITHUB_REPOSITORY: "badjoke-lab/xrpl-group-pay",
    GITHUB_SERVER_URL: "https://github.com",
  };
  result[["MAINNET", "XAMAN", "API", "KEY"].join("_")] = "key-value";
  result[["MAINNET", "XAMAN", "API", "SECRET"].join("_")] =
    "secret-value";
  return result;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unresolved(extra = {}) {
  return {
    meta: {
      exists: true,
      uuid: PAYLOAD_ID,
      submit: false,
      resolved: false,
      signed: false,
      cancelled: false,
      expired: false,
      ...extra,
    },
    payload: {
      tx_type: "SignIn",
      request_json: { TransactionType: "SignIn" },
    },
    response: { txid: null, hex: null, account: null },
  };
}

function successfulFetcher() {
  return vi
    .fn()
    .mockResolvedValueOnce(
      json({
        pong: true,
        auth: {
          application: {
            uuidv4: APP_ID,
            webhookurl: CALLBACK,
            disabled: 0,
          },
        },
      }),
    )
    .mockResolvedValueOnce(json({ uuid: PAYLOAD_ID }))
    .mockResolvedValueOnce(json(unresolved()))
    .mockResolvedValueOnce(json({ cancelled: true }))
    .mockResolvedValueOnce(
      json(unresolved({ cancelled: true, expired: true })),
    );
}

describe("Mainnet Xaman attestation runner", () => {
  it("creates and cancels a Mainnet-forced off-ledger SignIn", async () => {
    const fetcher = successfulFetcher();
    const report = await runMainnetXamanAttestation({
      config: config(),
      environment: environment(),
      fetcher,
      now: () => new Date("2026-06-26T07:00:00.000Z"),
    });

    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(fetcher.mock.calls.map((call) => call[1].method)).toEqual([
      "GET",
      "POST",
      "GET",
      "DELETE",
      "GET",
    ]);
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      `${API_BASE}/ping`,
      `${API_BASE}/payload`,
      `${API_BASE}/payload/${PAYLOAD_ID}`,
      `${API_BASE}/payload/${PAYLOAD_ID}`,
      `${API_BASE}/payload/${PAYLOAD_ID}`,
    ]);

    const createRequest = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(createRequest).toMatchObject({
      txjson: { TransactionType: "SignIn" },
      options: { submit: false, expire: 1, force_network: "MAINNET" },
    });
    expect(createRequest.txjson.TransactionType).not.toBe("Payment");

    expect(report).toMatchObject({
      network: "mainnet",
      git_sha: SHA,
      state: "verified",
      callback_origin: "https://pay.example.com",
      checks: {
        credentials_configured: true,
        application_enabled: true,
        forced_mainnet_request_checked: true,
        callback_behavior_checked: true,
        status_lookup_checked: true,
        cancellation_checked: true,
        sign_in_only: true,
        ledger_submission_possible: false,
        secrets_committed: false,
      },
    });

    const publicOutput = JSON.stringify(report);
    expect(publicOutput).not.toContain("key-value");
    expect(publicOutput).not.toContain("secret-value");
    expect(publicOutput).not.toContain(PAYLOAD_ID);
    expect(publicOutput).not.toContain("/api/xaman/callback");
    expect(publicOutput).not.toContain("deeplink");
    expect(publicOutput).not.toContain("websocket");
  });
});
