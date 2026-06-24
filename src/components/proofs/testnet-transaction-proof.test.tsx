import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PUBLIC_PROOF_FIXTURE,
  PUBLIC_PROOF_TOKEN,
} from "@/test/fixtures/public-proof";

import { TestnetTransactionProof } from "./testnet-transaction-proof";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TestnetTransactionProof", () => {
  it("shows verified public facts without private bill context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(PUBLIC_PROOF_FIXTURE)),
    );

    render(<TestnetTransactionProof proofToken={PUBLIC_PROOF_TOKEN} />);

    expect(
      await screen.findByRole("heading", { name: "3 XRP delivered" }),
    ).toBeVisible();
    expect(screen.getByText("Ledger verified")).toBeVisible();
    expect(screen.getByText("tesSUCCESS")).toBeVisible();
    expect(screen.getByText("Validated")).toBeVisible();
    expect(screen.getByText(PUBLIC_PROOF_TOKEN)).toBeVisible();
    expect(screen.queryByText("XRPL Meetup Dinner")).toBeNull();
    expect(screen.queryByText("Alex")).toBeNull();
  });

  it("shows an invalid-link state without making a request", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetTransactionProof proofToken="invalid" />);

    expect(
      screen.getByRole("heading", { name: "Transaction proof unavailable" }),
    ).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows an unavailable proof request to be retried", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          { error: { message: "The transaction proof is temporarily unavailable." } },
          503,
        ),
      )
      .mockResolvedValueOnce(response(PUBLIC_PROOF_FIXTURE));
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetTransactionProof proofToken={PUBLIC_PROOF_TOKEN} />);

    expect(
      await screen.findByRole("heading", { name: "Transaction proof unavailable" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "3 XRP delivered" }),
      ).toBeVisible();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
