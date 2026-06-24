import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CreatedBill } from "@/features/bills/types";

import { CreatedBillShare } from "./created-bill-share";

const created: CreatedBill = {
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "Dinner",
    network: "testnet",
    destinationAddress: "rDestination",
    destinationTag: null,
    totalDrops: "10000000",
    creatorShareDrops: "2000000",
    status: "open",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-24T00:00:00.000Z",
  },
  capabilities: {
    publicToken: "12".repeat(32),
    adminToken: "34".repeat(32),
  },
  slots: [
    {
      publicId: "00000000-0000-4000-8000-000000000002",
      participantLabel: "Alex",
      expectedPayerAddress: "rAlex",
      expectedAmountDrops: "3000000",
      invoiceId: "A".repeat(64),
      status: "unpaid",
      paymentToken: "56".repeat(32),
    },
    {
      publicId: "00000000-0000-4000-8000-000000000003",
      participantLabel: "Blair",
      expectedPayerAddress: "rBlair",
      expectedAmountDrops: "5000000",
      invoiceId: "B".repeat(64),
      status: "unpaid",
      paymentToken: "78".repeat(32),
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreatedBillShare", () => {
  it("exposes role-separated progress links and participant payment links", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CreatedBillShare created={created} onReset={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy creator progress link" }),
    );
    expect(writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/testnet/bill/progress#token=${created.capabilities.adminToken}`,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy read-only progress link" }),
    );
    expect(writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/testnet/bill/progress#token=${created.capabilities.publicToken}`,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Copy payment link" })[0],
    );
    expect(writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/testnet/payment#token=${created.slots[0].paymentToken}`,
    );
  });

  it("returns to bill creation without retaining the capabilities", () => {
    const onReset = vi.fn();
    render(<CreatedBillShare created={created} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Create another bill" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
