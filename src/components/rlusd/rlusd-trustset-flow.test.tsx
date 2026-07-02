import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalizationProvider } from "@/features/localization/provider";

import { RlusdTrustSetFlow } from "./rlusd-trustset-flow";

const TOKEN = "ab".repeat(32);
const baseLaunch = {
  publicId: "00000000-0000-4000-8000-000000000001",
  status: "required",
  providerStatus: null,
  network: "testnet",
  purpose: "recipient",
  account: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  assetId: "xrpl:testnet:rlusd",
  currency: "524C555344000000000000000000000000000000",
  issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
  requiredAmountUnits: "3000000",
  amountScale: 6,
  trustLimitUnits: "3000000",
  trustLimitValue: "3",
  payloadId: null,
  deepLink: null,
  qrImageUrl: null,
  statusChannel: null,
  expiresAt: null,
  transactionId: null,
  failureCode: null,
} as const;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function freshLaunchResponse() {
  return Promise.resolve(response(baseLaunch));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RlusdTrustSetFlow", () => {
  it("explains the non-payment boundary and opens a Xaman setup handoff", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(baseLaunch))
      .mockResolvedValueOnce(
        response(
          {
            ...baseLaunch,
            status: "awaiting_signature",
            providerStatus: "available",
            payloadId: "22222222-2222-4222-8222-222222222222",
            deepLink: "https://xaman.app/sign/trustset",
            qrImageUrl: "https://xaman.app/qr/trustset.png",
            statusChannel: "wss://xaman.app/status/trustset",
            expiresAt: "2026-07-02T00:05:00.000Z",
          },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetcher);

    render(
      <LocalizationProvider initialLocale="en">
        <RlusdTrustSetFlow preparationToken={TOKEN} />
      </LocalizationProvider>,
    );

    expect(await screen.findByText("This is not a payment")).toBeVisible();
    expect(
      screen.getAllByText(/does not transfer the bill amount/i),
    ).not.toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Open RLUSD setup in Xaman" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Approve the TrustSet in Xaman",
      }),
    ).toBeVisible();
    expect(
      screen.getByAltText("QR code for the RLUSD TrustSet request"),
    ).toHaveAttribute("src", "https://xaman.app/qr/trustset.png");
    expect(screen.getByRole("link", { name: "Open Xaman" })).toHaveAttribute(
      "href",
      "https://xaman.app/sign/trustset",
    );
    expect(fetcher.mock.calls[0][0]).toBe("/api/rlusd/preparations/details");
    expect(fetcher.mock.calls[1][0]).toBe("/api/rlusd/preparations/payload");
    expect(fetcher.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ preparationToken: TOKEN }),
    );
  });

  it("renders Japanese and Korean critical copy through the shared locale", async () => {
    const fetcher = vi.fn().mockImplementation(freshLaunchResponse);
    vi.stubGlobal("fetch", fetcher);

    const japanese = render(
      <LocalizationProvider initialLocale="ja">
        <RlusdTrustSetFlow preparationToken={TOKEN} />
      </LocalizationProvider>,
    );
    expect(await screen.findByText("これは支払いではありません")).toBeVisible();
    japanese.unmount();
    cleanup();

    render(
      <LocalizationProvider initialLocale="ko">
        <RlusdTrustSetFlow preparationToken={TOKEN} />
      </LocalizationProvider>,
    );
    expect(await screen.findByText("이 작업은 결제가 아닙니다")).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reports ready only after the status endpoint returns ledger-confirmed readiness", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          ...baseLaunch,
          status: "verifying",
          providerStatus: "submitted",
          payloadId: "22222222-2222-4222-8222-222222222222",
          transactionId: "A".repeat(64),
        }),
      )
      .mockResolvedValueOnce(
        response({
          ...baseLaunch,
          status: "ready",
          providerStatus: "submitted",
          payloadId: "22222222-2222-4222-8222-222222222222",
          transactionId: "A".repeat(64),
        }),
      );
    vi.stubGlobal("fetch", fetcher);

    render(
      <LocalizationProvider initialLocale="en">
        <RlusdTrustSetFlow preparationToken={TOKEN} />
      </LocalizationProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Checking the XRPL trust line",
      }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Check setup status" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "Official RLUSD trust line ready",
        }),
      ).toBeVisible(),
    );
    expect(fetcher.mock.calls[1][0]).toBe("/api/rlusd/preparations/status");
  });
});
