import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BILL_DESTINATION,
  BILL_REVIEW_FIXTURE,
  CREATED_BILL_FIXTURE,
  PAYER_ONE,
  PAYER_TWO,
} from "@/test/fixtures/bill-review";

import { TestnetBillForm } from "./testnet-bill-form";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function continueToNextStep() {
  const button = screen.getByRole("button", { name: "Continue" });
  expect(button).toBeEnabled();
  fireEvent.click(button);
}

function chooseMode(mode: "representative" | "direct") {
  const label =
    mode === "representative"
      ? /Pay a representative/
      : /Pay a store or organizer directly/;
  fireEvent.click(screen.getByRole("radio", { name: label }));
  continueToNextStep();
}

function fillBillDetails({
  mode,
  asset = "XRP",
}: {
  mode: "representative" | "direct";
  asset?: "XRP" | "RLUSD";
}) {
  fireEvent.change(
    screen.getByLabelText(
      mode === "representative"
        ? "Representative or recipient name"
        : "Store or organizer name",
    ),
    { target: { value: mode === "representative" ? "Dinner organizer" : "Venue" } },
  );
  fireEvent.change(screen.getByLabelText("Recipient XRPL address"), {
    target: { value: BILL_DESTINATION },
  });
  fireEvent.change(screen.getByLabelText("Bill title"), {
    target: { value: "Dinner" },
  });
  fireEvent.change(screen.getByLabelText("Bill total"), {
    target: { value: "10" },
  });

  if (asset === "RLUSD") {
    fireEvent.click(screen.getByRole("radio", { name: /^RLUSD/ }));
    expect(screen.getByRole("radio", { name: /^RLUSD/ })).toBeChecked();
  }

  if (mode === "representative") {
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Include a recipient-funded amount/,
      }),
    );
    fireEvent.change(screen.getByLabelText("Recipient-funded amount"), {
      target: { value: "2" },
    });
  }

  continueToNextStep();
}

function fillPayers({
  mode,
  strategy = "custom",
}: {
  mode: "representative" | "direct";
  strategy?: "custom" | "equal";
}) {
  if (strategy === "equal") {
    fireEvent.click(screen.getByRole("radio", { name: /^Equal/ }));
  }

  const payerAddresses = screen.getAllByLabelText("Expected payer address");
  fireEvent.change(payerAddresses[0], { target: { value: PAYER_ONE } });
  fireEvent.change(payerAddresses[1], { target: { value: PAYER_TWO } });

  const labels = screen.getAllByLabelText("Label");
  fireEvent.change(labels[0], { target: { value: "Alex" } });
  fireEvent.change(labels[1], { target: { value: "Blair" } });

  if (strategy === "custom") {
    const amounts = screen.getAllByLabelText("Assigned amount");
    fireEvent.change(amounts[0], {
      target: { value: mode === "representative" ? "3" : "4" },
    });
    fireEvent.change(amounts[1], {
      target: { value: mode === "representative" ? "5" : "6" },
    });
  }

  expect(screen.getByText("Allocation exact")).toBeVisible();
  continueToNextStep();
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("two-mode Testnet Bill creation", () => {
  it("starts with the recipient relationship instead of the legacy all-at-once form", () => {
    render(<TestnetBillForm />);

    expect(
      screen.getByRole("group", { name: "Who will participants pay?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /Pay a representative/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: /Pay a store or organizer directly/,
      }),
    ).not.toBeChecked();
    expect(screen.queryByLabelText("Bill title")).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("sends representative mode, official RLUSD, and recipient-funded amount for review", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(BILL_REVIEW_FIXTURE));
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillForm />);

    chooseMode("representative");
    fillBillDetails({ mode: "representative", asset: "RLUSD" });
    fillPayers({ mode: "representative" });

    fireEvent.click(screen.getByRole("button", { name: "Review and freeze" }));
    await screen.findByRole("heading", { name: "Review before freezing" });

    const request = JSON.parse(
      (fetcher.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(request).toMatchObject({
      paymentMode: "representative",
      recipientLabel: "Dinner organizer",
      destinationAddress: BILL_DESTINATION,
      settlementAssetId: "xrpl:testnet:rlusd",
      totalAmount: "10",
      recipientFundedAmount: "2",
      creatorShareAmount: "2",
      allocation: { strategy: "custom" },
    });
    expect(request.participants.map((item: { amount: string }) => item.amount)).toEqual([
      "3",
      "5",
    ]);
  });

  it("sends direct mode with zero recipient-funded amount and an Equal allocation", async () => {
    const directReview = {
      ...BILL_REVIEW_FIXTURE,
      paymentMode: "direct" as const,
      recipientLabel: "Venue",
      recipientFundedAmount: { code: "XRP", units: "0", scale: 6 },
      creatorShareAmount: { code: "XRP", units: "0", scale: 6 },
      recipientFundedDrops: "0",
      creatorShareDrops: "0",
      participants: BILL_REVIEW_FIXTURE.participants.map((participant) => ({
        ...participant,
        expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
        expectedAmountDrops: "5000000",
      })),
    };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(directReview));
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillForm />);

    chooseMode("direct");
    fillBillDetails({ mode: "direct" });
    fillPayers({ mode: "direct", strategy: "equal" });

    fireEvent.click(screen.getByRole("button", { name: "Review and freeze" }));
    await screen.findByRole("heading", { name: "Review before freezing" });

    const request = JSON.parse(
      (fetcher.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(request).toMatchObject({
      paymentMode: "direct",
      recipientLabel: "Venue",
      recipientFundedAmount: "0",
      creatorShareAmount: "0",
      allocation: { strategy: "equal" },
    });
    expect(request.participants[0]).not.toHaveProperty("amount");
    expect(request.participants[1]).not.toHaveProperty("amount");
  });

  it("returns from review with edits intact and clears the session draft after creation", async () => {
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/bills/review"
          ? jsonResponse(BILL_REVIEW_FIXTURE)
          : jsonResponse(CREATED_BILL_FIXTURE, 201),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<TestnetBillForm />);

    chooseMode("representative");
    fillBillDetails({ mode: "representative" });
    fillPayers({ mode: "representative" });
    fireEvent.click(screen.getByRole("button", { name: "Review and freeze" }));

    await screen.findByRole("heading", { name: "Review before freezing" });
    fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(screen.getByText("Ready to freeze this Bill?")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Review and freeze" }));
    await screen.findByRole("heading", { name: "Review before freezing" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Freeze bill and create payment links",
      }),
    );

    await waitFor(() => expect(screen.getByText("Bill created")).toBeVisible());
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(window.sessionStorage.length).toBe(0);
  });
});
