import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";
import { TestnetBillProgress } from "./testnet-bill-progress";

const TOKEN = "ab".repeat(32);
const asset = getXrpAssetDescriptor("testnet");
const progress = {
  access: "admin",
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "XRPL Meetup Dinner",
    network: "testnet",
    destinationAddress: "rDestination",
    destinationTag: null,
    asset,
    totalAmount: { code: "XRP", units: "10000000", scale: 6 },
    creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
    totalDrops: "10000000",
    creatorShareDrops: "2000000",
    status: "partially_paid",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:05:00.000Z",
  },
  summary: {
    participantCount: 2,
    paidCount: 1,
    pendingCount: 1,
    reviewCount: 0,
    expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
    paidAmount: { code: "XRP", units: "3000000", scale: 6 },
    expectedExternalDrops: "8000000",
    paidDrops: "3000000",
  },
  slots: [
    {
      publicId: "00000000-0000-4000-8000-000000000002",
      participantLabel: "Alex",
      expectedPayerAddress: "rAlex",
      asset,
      expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
      expectedAmountDrops: "3000000",
      invoiceId: "A".repeat(64),
      status: "paid",
      paidTransactionId: "B".repeat(64),
      paidLedgerIndex: 12345,
      paidAt: "2026-06-24T00:05:00.000Z",
      proofToken: "D".repeat(64),
      updatedAt: "2026-06-24T00:05:00.000Z",
    },
    {
      publicId: "00000000-0000-4000-8000-000000000003",
      participantLabel: "Blair",
      expectedPayerAddress: "rBlair",
      asset,
      expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
      expectedAmountDrops: "5000000",
      invoiceId: "C".repeat(64),
      status: "unpaid",
      paidTransactionId: null,
      paidLedgerIndex: null,
      paidAt: null,
      proofToken: null,
      updatedAt: "2026-06-24T00:00:00.000Z",
    },
  ],
};

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

describe("TestnetBillProgress", () => {
  it("renders Asset-aware participant states", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(progress));
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillProgress capabilityToken={TOKEN} />);

    expect(await screen.findByRole("heading", { name: "XRPL Meetup Dinner" })).toBeVisible();
    expect(screen.getByText("Creator view")).toBeVisible();
    expect(screen.getByText("1/2 paid")).toBeVisible();
    expect(screen.getByText("10 XRP")).toBeVisible();
    expect(screen.getAllByText("3 XRP", { exact: true })).toHaveLength(2);
    expect(screen.getByText("Alex")).toBeVisible();
    expect(screen.getByText("Blair")).toBeVisible();
    expect(screen.getByText("Paid")).toBeVisible();
    expect(screen.getByText("Unpaid")).toBeVisible();
  });

  it("redacts identities in the read-only view", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          ...progress,
          access: "public",
          slots: progress.slots.map((slot) => ({
            ...slot,
            participantLabel: null,
            expectedPayerAddress: null,
            invoiceId: null,
          })),
        }),
      ),
    );
    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(await screen.findByText("Read-only view")).toBeVisible();
    expect(screen.queryByText("Alex")).toBeNull();
    expect(screen.getByText("Payment slot 1")).toBeVisible();
  });

  it("shows invalid and retryable states", async () => {
    const invalidFetch = vi.fn();
    vi.stubGlobal("fetch", invalidFetch);
    const { unmount } = render(<TestnetBillProgress capabilityToken="invalid" />);
    expect(screen.getByRole("heading", { name: "Bill progress link unavailable" })).toBeVisible();
    expect(invalidFetch).not.toHaveBeenCalled();
    unmount();

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ error: { message: "Temporary" } }, 503))
      .mockResolvedValueOnce(response(progress));
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(await screen.findByRole("heading", { name: "Bill progress unavailable" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "XRPL Meetup Dinner" })).toBeVisible(),
    );
  });
});
