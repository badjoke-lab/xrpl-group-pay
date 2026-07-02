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
    paymentMode: "representative",
    recipientLabel: "Dinner host",
    destinationAddress: "rDestination",
    destinationTag: null,
    asset,
    totalAmount: { code: "XRP", units: "10000000", scale: 6 },
    recipientFundedAmount: { code: "XRP", units: "2000000", scale: 6 },
    creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
    totalDrops: "10000000",
    recipientFundedDrops: "2000000",
    creatorShareDrops: "2000000",
    status: "partially_paid",
    closureState: "active",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:05:00.000Z",
  },
  summary: {
    participantCount: 2,
    paidCount: 1,
    remainingCount: 1,
    pendingCount: 1,
    reviewCount: 0,
    expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
    paidAmount: { code: "XRP", units: "3000000", scale: 6 },
    remainingAmount: { code: "XRP", units: "5000000", scale: 6 },
    expectedExternalDrops: "8000000",
    paidDrops: "3000000",
    remainingDrops: "5000000",
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
      reviewReasonCode: null,
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
      reviewReasonCode: null,
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

describe("TestnetBillProgress compatibility export", () => {
  it("renders mode-correct totals, safe actions, and verified links", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(progress));
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillProgress capabilityToken={TOKEN} />);

    expect(
      await screen.findByRole("heading", { name: "XRPL Meetup Dinner" }),
    ).toBeVisible();
    expect(screen.getByText("Creator view")).toBeVisible();
    expect(screen.getByText("Representative recipient")).toBeVisible();
    expect(screen.getByText("Partially paid")).toBeVisible();
    expect(screen.getByText("XRPL Testnet")).toBeVisible();
    expect(screen.getByText("1/2 paid")).toBeVisible();
    expect(screen.getByText("8 XRP")).toBeVisible();
    expect(screen.getAllByText("3 XRP", { exact: true })).toHaveLength(2);
    expect(screen.getByText("5 XRP")).toBeVisible();
    expect(screen.getByText("1 verified · 1 remaining")).toBeVisible();
    expect(screen.getByText("10 XRP")).toBeVisible();
    expect(screen.getByText("2 XRP")).toBeVisible();
    expect(screen.getByText("Dinner host")).toBeVisible();
    expect(screen.getByText("Alex")).toBeVisible();
    expect(screen.getByText("Blair")).toBeVisible();
    expect(screen.getByText("Paid")).toBeVisible();
    expect(screen.getByText("Unpaid")).toBeVisible();
    expect(
      screen.getByText(/The Bill operator cannot open Xaman/),
    ).toBeVisible();
    expect(
      screen.getByText(/Send the private participant payment link/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View public proof" }),
    ).toHaveAttribute("href", `/proof#token=${"D".repeat(64)}`);
    expect(
      screen.getByRole("link", {
        name: "Open transaction in XRPL Explorer",
      }),
    ).toHaveAttribute(
      "href",
      `https://testnet.xrpl.org/transactions/${"B".repeat(64)}`,
    );
    expect(
      screen.getByRole("button", { name: "Copy private management link" }),
    ).toBeVisible();
  });

  it("uses the whole Bill as the direct-mode payer total", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          ...progress,
          bill: {
            ...progress.bill,
            paymentMode: "direct",
            recipientFundedAmount: {
              code: "XRP",
              units: "0",
              scale: 6,
            },
            recipientFundedDrops: "0",
            creatorShareAmount: { code: "XRP", units: "0", scale: 6 },
            creatorShareDrops: "0",
          },
          summary: {
            ...progress.summary,
            expectedExternalAmount: {
              code: "XRP",
              units: "10000000",
              scale: 6,
            },
            remainingAmount: {
              code: "XRP",
              units: "7000000",
              scale: 6,
            },
            expectedExternalDrops: "10000000",
            remainingDrops: "7000000",
          },
          slots: [
            progress.slots[0],
            {
              ...progress.slots[1],
              expectedAmount: { code: "XRP", units: "7000000", scale: 6 },
              expectedAmountDrops: "7000000",
            },
          ],
        }),
      ),
    );

    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(await screen.findByText("Direct recipient")).toBeVisible();
    expect(screen.getAllByText("10 XRP", { exact: true })).toHaveLength(2);
    expect(screen.getByText("7 XRP")).toBeVisible();
    expect(screen.getByText("0 XRP")).toBeVisible();
  });

  it("renders review diagnostics only for the management capability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          ...progress,
          bill: { ...progress.bill, status: "needs_review" },
          summary: {
            ...progress.summary,
            pendingCount: 0,
            reviewCount: 1,
          },
          slots: [
            progress.slots[0],
            {
              ...progress.slots[1],
              status: "needs_review",
              reviewReasonCode: "WRONG_DESTINATION",
            },
          ],
        }),
      ),
    );

    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(await screen.findByText("Review required")).toBeVisible();
    expect(screen.getByText(/WRONG_DESTINATION/)).toBeVisible();
    expect(
      screen.getByText(/Do not ask the payer to pay again/),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Xaman/i })).toBeNull();
  });

  it("renders the Mainnet badge and explorer host from the loaded Bill", async () => {
    const mainnetAsset = getXrpAssetDescriptor("mainnet");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          ...progress,
          bill: {
            ...progress.bill,
            network: "mainnet",
            asset: mainnetAsset,
          },
          slots: progress.slots.map((slot) => ({
            ...slot,
            asset: mainnetAsset,
          })),
        }),
      ),
    );

    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(await screen.findByText("XRPL Mainnet")).toBeVisible();
    expect(screen.queryByText("XRPL Testnet")).toBeNull();
    expect(
      screen.getByRole("link", {
        name: "Open transaction in XRPL Explorer",
      }),
    ).toHaveAttribute(
      "href",
      `https://livenet.xrpl.org/transactions/${"B".repeat(64)}`,
    );
  });

  it("redacts identities, InvoiceIDs, and review diagnostics in read-only view", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          ...progress,
          access: "public",
          bill: { ...progress.bill, recipientLabel: null },
          slots: progress.slots.map((slot, index) => ({
            ...slot,
            participantLabel: null,
            expectedPayerAddress: null,
            invoiceId: null,
            reviewReasonCode: index === 1 ? null : slot.reviewReasonCode,
          })),
        }),
      ),
    );
    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(await screen.findByText("Read-only view")).toBeVisible();
    expect(screen.queryByText("Dinner host")).toBeNull();
    expect(screen.queryByText("Alex")).toBeNull();
    expect(screen.queryByText("rAlex")).toBeNull();
    expect(screen.queryByText("A".repeat(64))).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Payment slot 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Copy read-only progress link" }),
    ).toBeVisible();
  });

  it("shows invalid and retryable states", async () => {
    const invalidFetch = vi.fn();
    vi.stubGlobal("fetch", invalidFetch);
    const { unmount } = render(
      <TestnetBillProgress capabilityToken="invalid" />,
    );
    expect(
      screen.getByRole("heading", { name: "Bill progress link unavailable" }),
    ).toBeVisible();
    expect(invalidFetch).not.toHaveBeenCalled();
    unmount();

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ error: { message: "Temporary" } }, 503))
      .mockResolvedValueOnce(response(progress));
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillProgress capabilityToken={TOKEN} />);
    expect(
      await screen.findByRole("heading", { name: "Bill progress unavailable" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "XRPL Meetup Dinner" }),
      ).toBeVisible(),
    );
  });
});
