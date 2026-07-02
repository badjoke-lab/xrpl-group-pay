import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getXrpAssetDescriptor } from "@/features/assets/registry";

import { BillRecoveryControls } from "./bill-recovery-controls";

const TOKEN = "ab".repeat(32);
const SLOT_ID = "00000000-0000-4000-8000-000000000002";
const TX = "B".repeat(64);
const asset = getXrpAssetDescriptor("testnet");

function management({
  status = "needs_review",
  slotStatus = "needs_review",
  retryAuthorizedAt = null,
  reviews = true,
}: {
  status?: "open" | "needs_review" | "closed_incomplete";
  slotStatus?: "unpaid" | "needs_review";
  retryAuthorizedAt?: string | null;
  reviews?: boolean;
} = {}) {
  return {
    progress: {
      access: "admin",
      bill: {
        publicId: "00000000-0000-4000-8000-000000000001",
        title: "Dinner",
        network: "testnet",
        paymentMode: "representative",
        recipientLabel: "Host",
        destinationAddress: "rDestination",
        destinationTag: null,
        asset,
        totalAmount: { code: "XRP", units: "10000000", scale: 6 },
        recipientFundedAmount: { code: "XRP", units: "2000000", scale: 6 },
        creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
        totalDrops: "10000000",
        recipientFundedDrops: "2000000",
        creatorShareDrops: "2000000",
        status,
        closureState:
          status === "closed_incomplete" ? "closed_incomplete" : "active",
        revision: 1,
        frozenAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:05:00.000Z",
      },
      summary: {
        participantCount: 2,
        paidCount: 1,
        remainingCount: 1,
        pendingCount: slotStatus === "unpaid" ? 1 : 0,
        reviewCount: slotStatus === "needs_review" ? 1 : 0,
        expectedExternalAmount: { code: "XRP", units: "8000000", scale: 6 },
        paidAmount: { code: "XRP", units: "3000000", scale: 6 },
        remainingAmount: { code: "XRP", units: "5000000", scale: 6 },
        expectedExternalDrops: "8000000",
        paidDrops: "3000000",
        remainingDrops: "5000000",
      },
      slots: [
        {
          publicId: SLOT_ID,
          participantLabel: "Alex",
          expectedPayerAddress: "rAlex",
          asset,
          expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
          expectedAmountDrops: "5000000",
          invoiceId: "A".repeat(64),
          status: slotStatus,
          reviewReasonCode: "WRONG_DESTINATION",
          paidTransactionId: null,
          paidLedgerIndex: null,
          paidAt: null,
          proofToken: null,
          updatedAt: "2026-07-02T00:05:00.000Z",
        },
      ],
    },
    reviews: reviews
      ? [
          {
            slotPublicId: SLOT_ID,
            status: slotStatus,
            reasonCode: "WRONG_DESTINATION",
            details: {
              kind: "verification_mismatch",
              transactionId: TX,
              reasonCode: "WRONG_DESTINATION",
              message: "Observed destination differs.",
              observedAt: "2026-07-02T00:05:00.000Z",
            },
            retryAuthorizedAt,
          },
        ]
      : [],
  };
}

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

describe("BillRecoveryControls", () => {
  it("shows expected versus observed facts and gates another attempt behind both warnings", async () => {
    const onChanged = vi.fn();
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string };
      return response(
        body.action === "authorize_retry"
          ? management({
              status: "open",
              slotStatus: "unpaid",
              retryAuthorizedAt: "2026-07-02T00:10:00.000Z",
            })
          : management(),
      );
    });
    vi.stubGlobal("fetch", fetcher);

    render(<BillRecoveryControls capability={TOKEN} onChanged={onChanged} />);

    expect(
      await screen.findByRole("heading", {
        name: "PaymentSlot requires review",
      }),
    ).toBeVisible();
    expect(screen.getByText("Frozen expected facts")).toBeVisible();
    expect(screen.getByText("Observed review facts")).toBeVisible();
    expect(screen.getByText("rAlex")).toBeVisible();
    expect(screen.getByText("rDestination")).toBeVisible();
    expect(screen.getByText("5 XRP")).toBeVisible();
    expect(screen.getByText("Observed destination differs.")).toBeVisible();
    const explorer = screen.getByRole("link", {
      name: /Open observed transaction in XRPL Explorer/,
    });
    expect(explorer).toHaveAttribute(
      "href",
      `https://testnet.xrpl.org/transactions/${TX}`,
    );
    expect(explorer.getAttribute("href")).not.toContain(TOKEN);

    const authorize = screen.getByRole("button", {
      name: "Authorize another attempt",
    });
    expect(authorize).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I understand that a prior transaction may already exist.",
      }),
    );
    expect(authorize).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /authorizing another attempt may cause a repeated payment/i,
      }),
    );
    expect(authorize).toBeEnabled();
    fireEvent.click(authorize);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(/Another attempt was explicitly authorized/),
    ).toBeVisible();
    const call = fetcher.mock.calls.find(([, init]) =>
      String((init as RequestInit | undefined)?.body).includes(
        "authorize_retry",
      ),
    );
    expect(call).toBeDefined();
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toMatchObject({
      acknowledgePossiblePriorPayment: true,
      acknowledgeDoublePaymentRisk: true,
    });
  });

  it("requires explicit destructive closure confirmation and then shows preserved totals", async () => {
    const onChanged = vi.fn();
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string };
      return response(
        body.action === "close_incomplete"
          ? management({
              status: "closed_incomplete",
              slotStatus: "unpaid",
              retryAuthorizedAt: null,
              reviews: false,
            })
          : management({
              status: "open",
              slotStatus: "unpaid",
              retryAuthorizedAt: null,
              reviews: false,
            }),
      );
    });
    vi.stubGlobal("fetch", fetcher);

    render(<BillRecoveryControls capability={TOKEN} onChanged={onChanged} />);
    const close = await screen.findByRole("button", {
      name: "Close Bill incomplete",
    });
    expect(close).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /no new Payment can start after closure/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /does not reverse or automatically refund/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Type CLOSE_INCOMPLETE"), {
      target: { value: "CLOSE_INCOMPLETE" },
    });
    expect(close).toBeEnabled();
    fireEvent.click(close);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("heading", { name: "Bill closed incomplete" }),
    ).toBeVisible();
    expect(screen.getByText("1/2")).toBeVisible();
    expect(screen.getByText("3 XRP")).toBeVisible();
    expect(screen.getByText("5 XRP")).toBeVisible();
    expect(
      screen.getByText(/does not refund or reverse any validated XRPL transfer/i),
    ).toBeVisible();
  });

  it("stays absent for a read-only progress capability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            error: {
              code: "BILL_RECOVERY_NOT_FOUND",
              message: "The Bill management capability is invalid or unavailable.",
            },
          },
          404,
        ),
      ),
    );

    render(<BillRecoveryControls capability={TOKEN} onChanged={vi.fn()} />);
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", {
          name: "Review and recovery controls",
        }),
      ).toBeNull(),
    );
  });
});
